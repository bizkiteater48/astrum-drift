import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { ilike, eq } from "drizzle-orm";
import { db, pool, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { serializePlayer } from "../lib/player";
import { buildEconomyUpdateFields } from "../lib/player-progress";
import { CHALLENGE_EXPIRY_MS } from "../lib/gambling";
import {
  POKER_MAX_BUY_IN,
  POKER_MIN_BUY_IN,
  applyPokerAction,
  createInitialPokerState,
  processPokerTimeouts,
  serializePokerStateForViewer,
  type PokerActionType,
  type PokerGameState,
} from "../lib/poker";

const router: IRouter = Router();

const pokerLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many poker requests. Slow down." },
});

type PokerGameRow = {
  id: number;
  inviter_id: number;
  opponent_id: number;
  inviter_username: string;
  opponent_username: string;
  buy_in: number;
  status: string;
  state: PokerGameState | null;
  winner_id: number | null;
  created_at: Date;
  resolved_at: Date | null;
};

function parsePositiveInt(raw: unknown): number | null {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function isInviteExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > CHALLENGE_EXPIRY_MS;
}

function isPokerAction(value: string): value is PokerActionType {
  return (
    value === "fold" ||
    value === "check" ||
    value === "call" ||
    value === "raise"
  );
}

function serializePokerGame(row: PokerGameRow, viewerId: number) {
  const isIncoming = row.opponent_id === viewerId && row.status === "invited";
  const isOutgoing = row.inviter_id === viewerId && row.status === "invited";

  return {
    id: row.id,
    inviterId: row.inviter_id,
    opponentId: row.opponent_id,
    inviterUsername: row.inviter_username,
    opponentUsername: row.opponent_username,
    buyIn: row.buy_in,
    status: row.status,
    winnerId: row.winner_id,
    createdAt: row.created_at.toISOString(),
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    isIncoming,
    isOutgoing,
    state:
      row.state && row.status === "active"
        ? serializePokerStateForViewer(row.state, viewerId)
        : row.state && row.status === "complete"
          ? serializePokerStateForViewer(row.state, viewerId)
          : null,
  };
}

async function settleCompletedGame(
  client: import("pg").PoolClient,
  gameId: number,
  state: PokerGameState,
): Promise<void> {
  const playerIds = Object.keys(state.stacks).map(Number);
  const payouts = new Map<number, number>();

  for (const playerId of playerIds) {
    payouts.set(playerId, state.stacks[String(playerId)] ?? 0);
  }

  for (const [playerId, payout] of payouts) {
    if (payout <= 0) continue;

    const playerResult = await client.query<{
      credits: number;
      silver_coins: number;
      tutorial_progress: unknown;
    }>(
      `SELECT credits, silver_coins, tutorial_progress FROM players WHERE id = $1 FOR UPDATE`,
      [playerId],
    );
    const player = playerResult.rows[0];
    if (!player) continue;

    const economy = buildEconomyUpdateFields(
      {
        credits: player.credits,
        silverCoins: player.silver_coins ?? 0,
        tutorialProgress: player.tutorial_progress,
      },
      {
        silverCoins: (player.silver_coins ?? 0) + payout,
      },
    );

    await client.query(
      `
        UPDATE players
        SET silver_coins = $2,
            tutorial_progress = $3::jsonb
        WHERE id = $1
      `,
      [playerId, economy.silverCoins, JSON.stringify(economy.tutorialProgress)],
    );
  }

  await client.query(
    `
      UPDATE poker_games
      SET status = 'complete',
          winner_id = $2,
          state = $3::jsonb,
          resolved_at = now()
      WHERE id = $1
    `,
    [gameId, state.winnerId ?? null, JSON.stringify(state)],
  );
}

async function syncPokerGameRow(
  client: import("pg").PoolClient,
  game: PokerGameRow,
): Promise<PokerGameRow> {
  if (game.status !== "active" || !game.state) {
    return game;
  }

  const { state, changed } = processPokerTimeouts(game.state);
  if (!changed) {
    return game;
  }

  if (state.phase === "complete") {
    await settleCompletedGame(client, game.id, state);
    return {
      ...game,
      status: "complete",
      state,
      winner_id: state.winnerId ?? null,
      resolved_at: new Date(),
    };
  }

  await client.query(
    `
      UPDATE poker_games
      SET state = $2::jsonb
      WHERE id = $1
    `,
    [game.id, JSON.stringify(state)],
  );

  return {
    ...game,
    state,
  };
}

async function advanceTimedOutPokerGame(gameId: number): Promise<PokerGameRow | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const gameResult = await client.query<PokerGameRow>(
      `
        SELECT
          pg.id,
          pg.inviter_id,
          pg.opponent_id,
          inviter.username AS inviter_username,
          opponent.username AS opponent_username,
          pg.buy_in,
          pg.status,
          pg.state,
          pg.winner_id,
          pg.created_at,
          pg.resolved_at
        FROM poker_games pg
        INNER JOIN players inviter ON inviter.id = pg.inviter_id
        INNER JOIN players opponent ON opponent.id = pg.opponent_id
        WHERE pg.id = $1
        FOR UPDATE OF pg
      `,
      [gameId],
    );

    const game = gameResult.rows[0];
    if (!game) {
      await client.query("ROLLBACK");
      return null;
    }

    const synced = await syncPokerGameRow(client, game);
    await client.query("COMMIT");
    return synced;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function isActionDeadlineElapsed(state: PokerGameState | null): boolean {
  if (!state?.actionDeadlineAt || state.phase === "complete") {
    return false;
  }
  return Date.parse(state.actionDeadlineAt) <= Date.now();
}

router.get("/gambling/poker/games", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;
  const expiryCutoff = new Date(Date.now() - CHALLENGE_EXPIRY_MS);

  const result = await pool.query<PokerGameRow>(
    `
      SELECT
        pg.id,
        pg.inviter_id,
        pg.opponent_id,
        inviter.username AS inviter_username,
        opponent.username AS opponent_username,
        pg.buy_in,
        pg.status,
        pg.state,
        pg.winner_id,
        pg.created_at,
        pg.resolved_at
      FROM poker_games pg
      INNER JOIN players inviter ON inviter.id = pg.inviter_id
      INNER JOIN players opponent ON opponent.id = pg.opponent_id
      WHERE (pg.inviter_id = $1 OR pg.opponent_id = $1)
        AND (
          pg.status = 'active'
          OR (pg.status = 'invited' AND pg.created_at >= $2)
          OR (pg.status = 'complete' AND pg.resolved_at >= now() - interval '5 minutes')
        )
      ORDER BY pg.created_at DESC
      LIMIT 20
    `,
    [playerId, expiryCutoff],
  );

  const syncedRows = await Promise.all(
    result.rows.map(async (row) => {
      if (row.status === "active" && isActionDeadlineElapsed(row.state)) {
        const synced = await advanceTimedOutPokerGame(row.id);
        return synced ?? row;
      }
      return row;
    }),
  );

  res.status(200).json({
    games: syncedRows.map((row) => serializePokerGame(row, playerId)),
  });
});

router.post(
  "/gambling/poker/invites",
  requireAuth,
  pokerLimiter,
  async (req, res): Promise<void> => {
    const opponentUsername =
      typeof req.body?.opponentUsername === "string"
        ? req.body.opponentUsername.trim()
        : "";
    const buyIn = parsePositiveInt(req.body?.buyIn);

    if (!opponentUsername) {
      res.status(400).json({ error: "Enter an opponent username." });
      return;
    }

    if (!buyIn || buyIn < POKER_MIN_BUY_IN || buyIn > POKER_MAX_BUY_IN) {
      res.status(400).json({
        error: `Buy-in must be ${POKER_MIN_BUY_IN}–${POKER_MAX_BUY_IN} silver coins.`,
      });
      return;
    }

    const inviterId = req.session.playerId!;

    const [inviter] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, inviterId));

    if (!inviter) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (inviter.silverCoins < buyIn) {
      res.status(400).json({ error: "Not enough silver coins for this buy-in." });
      return;
    }

    const [opponent] = await db
      .select()
      .from(playersTable)
      .where(ilike(playersTable.username, opponentUsername));

    if (!opponent) {
      res.status(404).json({ error: "Opponent not found." });
      return;
    }

    if (opponent.id === inviterId) {
      res.status(400).json({ error: "You cannot invite yourself." });
      return;
    }

    const activeGame = await pool.query<{ id: number }>(
      `
        SELECT id
        FROM poker_games
        WHERE status = 'active'
          AND (inviter_id = $1 OR opponent_id = $1)
        LIMIT 1
      `,
      [inviterId],
    );

    if (activeGame.rowCount) {
      res.status(400).json({ error: "Finish your active poker hand first." });
      return;
    }

    const insertResult = await pool.query<{ id: number }>(
      `
        INSERT INTO poker_games (inviter_id, opponent_id, buy_in, status)
        VALUES ($1, $2, $3, 'invited')
        RETURNING id
      `,
      [inviterId, opponent.id, buyIn],
    );

    const gameId = insertResult.rows[0]?.id;
    if (!gameId) {
      res.status(503).json({ error: "Failed to create poker invite." });
      return;
    }

    const gameResult = await pool.query<PokerGameRow>(
      `
        SELECT
          pg.id,
          pg.inviter_id,
          pg.opponent_id,
          inviter.username AS inviter_username,
          opponent.username AS opponent_username,
          pg.buy_in,
          pg.status,
          pg.state,
          pg.winner_id,
          pg.created_at,
          pg.resolved_at
        FROM poker_games pg
        INNER JOIN players inviter ON inviter.id = pg.inviter_id
        INNER JOIN players opponent ON opponent.id = pg.opponent_id
        WHERE pg.id = $1
      `,
      [gameId],
    );

    res.status(201).json({
      game: serializePokerGame(gameResult.rows[0]!, inviterId),
    });
  },
);

router.post(
  "/gambling/poker/invites/:id/accept",
  requireAuth,
  pokerLimiter,
  async (req, res): Promise<void> => {
    const gameId = Number(req.params.id);
    const playerId = req.session.playerId!;

    if (!Number.isInteger(gameId) || gameId <= 0) {
      res.status(400).json({ error: "Invalid game id." });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const gameResult = await client.query<PokerGameRow>(
        `
          SELECT
            pg.id,
            pg.inviter_id,
            pg.opponent_id,
            inviter.username AS inviter_username,
            opponent.username AS opponent_username,
            pg.buy_in,
            pg.status,
            pg.state,
            pg.winner_id,
            pg.created_at,
            pg.resolved_at
          FROM poker_games pg
          INNER JOIN players inviter ON inviter.id = pg.inviter_id
          INNER JOIN players opponent ON opponent.id = pg.opponent_id
          WHERE pg.id = $1
          FOR UPDATE OF pg
        `,
        [gameId],
      );

      const game = gameResult.rows[0];
      if (!game || game.status !== "invited") {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Poker invite not found." });
        return;
      }

      if (game.opponent_id !== playerId) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Only the invited pilot can accept." });
        return;
      }

      if (isInviteExpired(game.created_at)) {
        await client.query(
          `UPDATE poker_games SET status = 'expired', resolved_at = now() WHERE id = $1`,
          [gameId],
        );
        await client.query("COMMIT");
        res.status(400).json({ error: "Poker invite expired." });
        return;
      }

      const inviterLock = await client.query<{
        silver_coins: number;
        credits: number;
        tutorial_progress: unknown;
      }>(
        `SELECT silver_coins, credits, tutorial_progress FROM players WHERE id = $1 FOR UPDATE`,
        [game.inviter_id],
      );
      const opponentLock = await client.query<{
        silver_coins: number;
        credits: number;
        tutorial_progress: unknown;
      }>(
        `SELECT silver_coins, credits, tutorial_progress FROM players WHERE id = $1 FOR UPDATE`,
        [game.opponent_id],
      );

      const inviter = inviterLock.rows[0];
      const opponent = opponentLock.rows[0];
      const buyIn = game.buy_in;

      if (
        !inviter ||
        !opponent ||
        inviter.silver_coins < buyIn ||
        opponent.silver_coins < buyIn
      ) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "A player no longer has enough silver coins." });
        return;
      }

      for (const [participantId, row] of [
        [game.inviter_id, inviter],
        [game.opponent_id, opponent],
      ] as const) {
        const economy = buildEconomyUpdateFields(
          {
            credits: row.credits,
            silverCoins: row.silver_coins ?? 0,
            tutorialProgress: row.tutorial_progress,
          },
          {
            silverCoins: (row.silver_coins ?? 0) - buyIn,
          },
        );

        await client.query(
          `
            UPDATE players
            SET silver_coins = $2,
                tutorial_progress = $3::jsonb
            WHERE id = $1
          `,
          [participantId, economy.silverCoins, JSON.stringify(economy.tutorialProgress)],
        );
      }

      const state = createInitialPokerState(
        game.inviter_id,
        game.opponent_id,
        buyIn,
      );

      await client.query(
        `
          UPDATE poker_games
          SET status = 'active',
              state = $2::jsonb
          WHERE id = $1
        `,
        [gameId, JSON.stringify(state)],
      );

      await client.query("COMMIT");

      const [viewerPlayer] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, playerId));

      const refreshed = await pool.query<PokerGameRow>(
        `
          SELECT
            pg.id,
            pg.inviter_id,
            pg.opponent_id,
            inviter.username AS inviter_username,
            opponent.username AS opponent_username,
            pg.buy_in,
            pg.status,
            pg.state,
            pg.winner_id,
            pg.created_at,
            pg.resolved_at
          FROM poker_games pg
          INNER JOIN players inviter ON inviter.id = pg.inviter_id
          INNER JOIN players opponent ON opponent.id = pg.opponent_id
          WHERE pg.id = $1
        `,
        [gameId],
      );

      res.status(200).json({
        player: serializePlayer(viewerPlayer!),
        game: serializePokerGame(refreshed.rows[0]!, playerId),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      req.log.error({ error, gameId }, "Failed to accept poker invite");
      res.status(503).json({ error: "Could not start poker hand." });
    } finally {
      client.release();
    }
  },
);

router.post(
  "/gambling/poker/invites/:id/decline",
  requireAuth,
  async (req, res): Promise<void> => {
    const gameId = Number(req.params.id);
    const playerId = req.session.playerId!;

    if (!Number.isInteger(gameId) || gameId <= 0) {
      res.status(400).json({ error: "Invalid game id." });
      return;
    }

    const result = await pool.query(
      `
        UPDATE poker_games
        SET status = 'declined', resolved_at = now()
        WHERE id = $1
          AND opponent_id = $2
          AND status = 'invited'
        RETURNING id
      `,
      [gameId, playerId],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Poker invite not found." });
      return;
    }

    res.status(200).json({ ok: true });
  },
);

router.get(
  "/gambling/poker/games/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const gameId = Number(req.params.id);
    const playerId = req.session.playerId!;

    if (!Number.isInteger(gameId) || gameId <= 0) {
      res.status(400).json({ error: "Invalid game id." });
      return;
    }

    const result = await pool.query<PokerGameRow>(
      `
        SELECT
          pg.id,
          pg.inviter_id,
          pg.opponent_id,
          inviter.username AS inviter_username,
          opponent.username AS opponent_username,
          pg.buy_in,
          pg.status,
          pg.state,
          pg.winner_id,
          pg.created_at,
          pg.resolved_at
        FROM poker_games pg
        INNER JOIN players inviter ON inviter.id = pg.inviter_id
        INNER JOIN players opponent ON opponent.id = pg.opponent_id
        WHERE pg.id = $1
          AND (pg.inviter_id = $2 OR pg.opponent_id = $2)
      `,
      [gameId, playerId],
    );

    const game = result.rows[0];
    if (!game) {
      res.status(404).json({ error: "Poker game not found." });
      return;
    }

    const synced =
      game.status === "active" && isActionDeadlineElapsed(game.state)
        ? (await advanceTimedOutPokerGame(game.id)) ?? game
        : game;

    res.status(200).json({
      game: serializePokerGame(synced, playerId),
    });
  },
);

router.post(
  "/gambling/poker/games/:id/action",
  requireAuth,
  pokerLimiter,
  async (req, res): Promise<void> => {
    const gameId = Number(req.params.id);
    const playerId = req.session.playerId!;
    const action =
      typeof req.body?.action === "string" ? req.body.action.trim() : "";
    const raiseTotal = parsePositiveInt(req.body?.raiseTotal);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      res.status(400).json({ error: "Invalid game id." });
      return;
    }

    if (!isPokerAction(action)) {
      res.status(400).json({ error: "Invalid poker action." });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const gameResult = await client.query<PokerGameRow>(
        `
          SELECT
            pg.id,
            pg.inviter_id,
            pg.opponent_id,
            inviter.username AS inviter_username,
            opponent.username AS opponent_username,
            pg.buy_in,
            pg.status,
            pg.state,
            pg.winner_id,
            pg.created_at,
            pg.resolved_at
          FROM poker_games pg
          INNER JOIN players inviter ON inviter.id = pg.inviter_id
          INNER JOIN players opponent ON opponent.id = pg.opponent_id
          WHERE pg.id = $1
          FOR UPDATE OF pg
        `,
        [gameId],
      );

      const game = gameResult.rows[0];
      if (!game || game.status !== "active" || !game.state) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Active poker game not found." });
        return;
      }

      if (game.inviter_id !== playerId && game.opponent_id !== playerId) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not seated at this table." });
        return;
      }

      const syncedGame = await syncPokerGameRow(client, game);
      if (syncedGame.status === "complete") {
        await client.query("COMMIT");

        const [viewerPlayer] = await db
          .select()
          .from(playersTable)
          .where(eq(playersTable.id, playerId));

        res.status(200).json({
          player: serializePlayer(viewerPlayer!),
          game: serializePokerGame(syncedGame, playerId),
        });
        return;
      }

      if (syncedGame.state!.actionOn !== playerId) {
        if (syncedGame.state !== game.state) {
          await client.query(
            `
              UPDATE poker_games
              SET state = $2::jsonb
              WHERE id = $1
            `,
            [gameId, JSON.stringify(syncedGame.state)],
          );
        }
        await client.query("COMMIT");
        res.status(400).json({ error: "Not your turn." });
        return;
      }

      let nextState: PokerGameState;
      try {
        nextState = applyPokerAction(
          syncedGame.state!,
          playerId,
          action,
          action === "raise" ? raiseTotal ?? undefined : undefined,
        );
      } catch (error) {
        await client.query("ROLLBACK");
        res.status(400).json({
          error: error instanceof Error ? error.message : "Illegal action.",
        });
        return;
      }

      if (nextState.phase === "complete") {
        await settleCompletedGame(client, gameId, nextState);
      } else {
        await client.query(
          `
            UPDATE poker_games
            SET state = $2::jsonb
            WHERE id = $1
          `,
          [gameId, JSON.stringify(nextState)],
        );
      }

      await client.query("COMMIT");

      const [viewerPlayer] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, playerId));

      res.status(200).json({
        player: serializePlayer(viewerPlayer!),
        game: {
          ...serializePokerGame(
            {
              ...syncedGame,
              status: nextState.phase === "complete" ? "complete" : "active",
              state: nextState,
              winner_id: nextState.winnerId ?? null,
              resolved_at:
                nextState.phase === "complete" ? new Date() : syncedGame.resolved_at,
            },
            playerId,
          ),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      req.log.error({ error, gameId }, "Failed to process poker action");
      res.status(503).json({ error: "Could not process poker action." });
      return;
    } finally {
      client.release();
    }
  },
);

export default router;
