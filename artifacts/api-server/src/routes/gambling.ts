import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { ilike } from "drizzle-orm";
import { db, pool, playersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { serializePlayer } from "../lib/player";
import {
  CHALLENGE_EXPIRY_MS,
  HOUSE_MAX_STAKE,
  HOUSE_MIN_STAKE,
  MINT_MAX_PER_REQUEST,
  PVP_MAX_STAKE,
  PVP_MIN_STAKE,
  flipCoin,
  isChallengeExpired,
  resolveReactorDice,
  resolveWarpFlip,
  rollD100,
  type HouseGameId,
  type ReactorDiceChoice,
  type WarpFlipChoice,
} from "../lib/gambling";

const router: IRouter = Router();

const gamblingLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many gambling requests. Slow down." },
});

type ChallengeRow = {
  id: number;
  challenger_id: number;
  opponent_id: number;
  challenger_username: string;
  opponent_username: string;
  game: string;
  stake: number;
  challenger_choice: string;
  status: string;
  created_at: Date;
};

function parsePositiveInt(raw: unknown): number | null {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function isReactorDiceChoice(value: string): value is ReactorDiceChoice {
  return value === "over" || value === "under";
}

function isWarpFlipChoice(value: string): value is WarpFlipChoice {
  return value === "heads" || value === "tails";
}

function isHouseGameId(value: string): value is HouseGameId {
  return value === "reactor_dice" || value === "warp_flip";
}

function serializeChallenge(row: ChallengeRow, viewerId: number) {
  const opponentChoice =
    row.challenger_choice === "heads" ? "tails" : "heads";

  return {
    id: row.id,
    challengerId: row.challenger_id,
    opponentId: row.opponent_id,
    challengerUsername: row.challenger_username,
    opponentUsername: row.opponent_username,
    game: row.game,
    stake: row.stake,
    challengerChoice: row.challenger_choice,
    opponentChoice,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    isIncoming: row.opponent_id === viewerId,
    isOutgoing: row.challenger_id === viewerId,
  };
}

router.post("/gambling/mint-coins", requireAuth, async (req, res): Promise<void> => {
  const quantity = parsePositiveInt(req.body?.quantity);
  if (!quantity || quantity > MINT_MAX_PER_REQUEST) {
    res.status(400).json({
      error: `Quantity must be 1–${MINT_MAX_PER_REQUEST} silver coins per request.`,
    });
    return;
  }

  const playerId = req.session.playerId!;

  const result = await db.transaction(async (tx) => {
    const [player] = await tx
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, playerId))
      .for("update");

    if (!player) return { kind: "missing" as const };

    const [updated] = await tx
      .update(playersTable)
      .set({ silverCoins: player.silverCoins + quantity })
      .where(eq(playersTable.id, playerId))
      .returning();

    return { kind: "ok" as const, player: updated! };
  });

  if (result.kind === "missing") {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.status(200).json({
    player: serializePlayer(result.player),
    minted: quantity,
  });
});

router.post(
  "/gambling/house/play",
  requireAuth,
  gamblingLimiter,
  async (req, res): Promise<void> => {
    const game = typeof req.body?.game === "string" ? req.body.game : "";
    const stake = parsePositiveInt(req.body?.stake);
    const choice = typeof req.body?.choice === "string" ? req.body.choice : "";

    if (!isHouseGameId(game)) {
      res.status(400).json({ error: "Invalid house game." });
      return;
    }

    if (!stake || stake < HOUSE_MIN_STAKE || stake > HOUSE_MAX_STAKE) {
      res.status(400).json({
        error: `Stake must be ${HOUSE_MIN_STAKE}–${HOUSE_MAX_STAKE} silver coins.`,
      });
      return;
    }

    const playerId = req.session.playerId!;

    const result = await db.transaction(async (tx) => {
      const [player] = await tx
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, playerId))
        .for("update");

      if (!player) return { kind: "missing" as const };
      if (player.silverCoins < stake) {
        return { kind: "insufficient" as const };
      }

      let outcome:
        | ReturnType<typeof resolveReactorDice>
        | ReturnType<typeof resolveWarpFlip>;

      if (game === "reactor_dice") {
        if (!isReactorDiceChoice(choice)) {
          return { kind: "invalid_choice" as const };
        }
        const roll = rollD100();
        outcome = resolveReactorDice(roll, choice, stake);
      } else {
        if (!isWarpFlipChoice(choice)) {
          return { kind: "invalid_choice" as const };
        }
        const flip = flipCoin();
        outcome = resolveWarpFlip(flip, choice, stake);
      }

      const netCoins = -stake + outcome.payout;
      const [updated] = await tx
        .update(playersTable)
        .set({ silverCoins: player.silverCoins + netCoins })
        .where(eq(playersTable.id, playerId))
        .returning();

      return {
        kind: "ok" as const,
        player: updated!,
        outcome: {
          game,
          stake,
          choice,
          won: outcome.won,
          push: "push" in outcome ? outcome.push : false,
          payout: outcome.payout,
          roll: "roll" in outcome ? outcome.roll : undefined,
          result: "result" in outcome ? outcome.result : undefined,
        },
      };
    });

    if (result.kind === "missing") {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (result.kind === "insufficient") {
      res.status(400).json({ error: "Not enough silver coins." });
      return;
    }
    if (result.kind === "invalid_choice") {
      res.status(400).json({ error: "Invalid game choice." });
      return;
    }

    res.status(200).json({
      player: serializePlayer(result.player),
      outcome: result.outcome,
    });
  },
);

router.get("/gambling/challenges", requireAuth, async (req, res): Promise<void> => {
  const playerId = req.session.playerId!;
  const expiryCutoff = new Date(Date.now() - CHALLENGE_EXPIRY_MS);

  const result = await pool.query<ChallengeRow>(
    `
      SELECT
        gc.id,
        gc.challenger_id,
        gc.opponent_id,
        challenger.username AS challenger_username,
        opponent.username AS opponent_username,
        gc.game,
        gc.stake,
        gc.challenger_choice,
        gc.status,
        gc.created_at
      FROM gambling_challenges gc
      INNER JOIN players challenger ON challenger.id = gc.challenger_id
      INNER JOIN players opponent ON opponent.id = gc.opponent_id
      WHERE gc.status = 'pending'
        AND gc.created_at >= $1
        AND (gc.challenger_id = $2 OR gc.opponent_id = $2)
      ORDER BY gc.created_at DESC
      LIMIT 20
    `,
    [expiryCutoff, playerId],
  );

  res.status(200).json({
    challenges: result.rows.map((row) => serializeChallenge(row, playerId)),
  });
});

router.post(
  "/gambling/challenges",
  requireAuth,
  gamblingLimiter,
  async (req, res): Promise<void> => {
    const opponentUsername =
      typeof req.body?.opponentUsername === "string"
        ? req.body.opponentUsername.trim()
        : "";
    const stake = parsePositiveInt(req.body?.stake);
    const choice =
      typeof req.body?.choice === "string" ? req.body.choice : "heads";

    if (!opponentUsername) {
      res.status(400).json({ error: "Enter an opponent username." });
      return;
    }

    if (!stake || stake < PVP_MIN_STAKE || stake > PVP_MAX_STAKE) {
      res.status(400).json({
        error: `Stake must be ${PVP_MIN_STAKE}–${PVP_MAX_STAKE} silver coins.`,
      });
      return;
    }

    if (!isWarpFlipChoice(choice)) {
      res.status(400).json({ error: "Choice must be heads or tails." });
      return;
    }

    const challengerId = req.session.playerId!;

    const [challenger] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, challengerId));

    if (!challenger) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (challenger.silverCoins < stake) {
      res.status(400).json({ error: "Not enough silver coins for this wager." });
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

    if (opponent.id === challengerId) {
      res.status(400).json({ error: "You cannot challenge yourself." });
      return;
    }

    const insertResult = await pool.query<{ id: number }>(
      `
        INSERT INTO gambling_challenges (
          challenger_id,
          opponent_id,
          game,
          stake,
          challenger_choice
        )
        VALUES ($1, $2, 'warp_flip', $3, $4)
        RETURNING id
      `,
      [challengerId, opponent.id, stake, choice],
    );

    const challengeId = insertResult.rows[0]?.id;
    if (!challengeId) {
      res.status(503).json({ error: "Failed to create challenge." });
      return;
    }

    const challengeResult = await pool.query<ChallengeRow>(
      `
        SELECT
          gc.id,
          gc.challenger_id,
          gc.opponent_id,
          challenger.username AS challenger_username,
          opponent.username AS opponent_username,
          gc.game,
          gc.stake,
          gc.challenger_choice,
          gc.status,
          gc.created_at
        FROM gambling_challenges gc
        INNER JOIN players challenger ON challenger.id = gc.challenger_id
        INNER JOIN players opponent ON opponent.id = gc.opponent_id
        WHERE gc.id = $1
      `,
      [challengeId],
    );

    const row = challengeResult.rows[0]!;

    res.status(201).json({
      challenge: serializeChallenge(row, challengerId),
    });
  },
);

router.post(
  "/gambling/challenges/:id/accept",
  requireAuth,
  gamblingLimiter,
  async (req, res): Promise<void> => {
    const challengeId = Number(req.params.id);
    const playerId = req.session.playerId!;

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      res.status(400).json({ error: "Invalid challenge id." });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const challengeResult = await client.query<{
        id: number;
        challenger_id: number;
        opponent_id: number;
        stake: number;
        challenger_choice: string;
        status: string;
        created_at: Date;
        challenger_username: string;
        opponent_username: string;
      }>(
        `
          SELECT
            gc.id,
            gc.challenger_id,
            gc.opponent_id,
            gc.stake,
            gc.challenger_choice,
            gc.status,
            gc.created_at,
            challenger.username AS challenger_username,
            opponent.username AS opponent_username
          FROM gambling_challenges gc
          INNER JOIN players challenger ON challenger.id = gc.challenger_id
          INNER JOIN players opponent ON opponent.id = gc.opponent_id
          WHERE gc.id = $1
          FOR UPDATE OF gc
        `,
        [challengeId],
      );

      const challenge = challengeResult.rows[0];
      if (!challenge || challenge.status !== "pending") {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Challenge not found." });
        return;
      }

      if (challenge.opponent_id !== playerId) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Only the challenged pilot can accept." });
        return;
      }

      if (isChallengeExpired(challenge.created_at)) {
        await client.query(
          `UPDATE gambling_challenges SET status = 'expired', resolved_at = now() WHERE id = $1`,
          [challengeId],
        );
        await client.query("COMMIT");
        res.status(400).json({ error: "Challenge expired." });
        return;
      }

      const challengerLock = await client.query<{
        id: number;
        silver_coins: number;
      }>(
        `SELECT id, silver_coins FROM players WHERE id = $1 FOR UPDATE`,
        [challenge.challenger_id],
      );
      const opponentLock = await client.query<{
        id: number;
        silver_coins: number;
      }>(
        `SELECT id, silver_coins FROM players WHERE id = $1 FOR UPDATE`,
        [challenge.opponent_id],
      );

      const challenger = challengerLock.rows[0];
      const opponent = opponentLock.rows[0];

      if (!challenger || !opponent) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Player not found." });
        return;
      }

      const stake = challenge.stake;
      if (challenger.silver_coins < stake || opponent.silver_coins < stake) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "A player no longer has enough silver coins." });
        return;
      }

      const flip = flipCoin();
      const challengerWon = flip === challenge.challenger_choice;
      const winnerId = challengerWon
        ? challenge.challenger_id
        : challenge.opponent_id;

      await client.query(
        `UPDATE players SET silver_coins = silver_coins - $2 WHERE id = $1`,
        [challenge.challenger_id, stake],
      );
      await client.query(
        `UPDATE players SET silver_coins = silver_coins - $2 WHERE id = $1`,
        [challenge.opponent_id, stake],
      );
      await client.query(
        `UPDATE players SET silver_coins = silver_coins + $2 WHERE id = $1`,
        [winnerId, stake * 2],
      );

      await client.query(
        `
          UPDATE gambling_challenges
          SET status = 'completed',
              winner_id = $2,
              flip_result = $3,
              resolved_at = now()
          WHERE id = $1
        `,
        [challengeId, winnerId, flip],
      );

      await client.query("COMMIT");

      const [viewerPlayer] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, playerId));

      res.status(200).json({
        player: serializePlayer(viewerPlayer!),
        result: {
          challengeId,
          flip,
          winnerId,
          winnerUsername: challengerWon
            ? challenge.challenger_username
            : challenge.opponent_username,
          stake,
          payout: stake * 2,
          won: winnerId === playerId,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      req.log.error({ error, challengeId }, "Failed to accept gambling challenge");
      res.status(503).json({ error: "Could not resolve challenge." });
    } finally {
      client.release();
    }
  },
);

router.post(
  "/gambling/challenges/:id/decline",
  requireAuth,
  async (req, res): Promise<void> => {
    const challengeId = Number(req.params.id);
    const playerId = req.session.playerId!;

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      res.status(400).json({ error: "Invalid challenge id." });
      return;
    }

    const result = await pool.query(
      `
        UPDATE gambling_challenges
        SET status = 'declined', resolved_at = now()
        WHERE id = $1
          AND opponent_id = $2
          AND status = 'pending'
        RETURNING id
      `,
      [challengeId, playerId],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Challenge not found." });
      return;
    }

    res.status(200).json({ ok: true });
  },
);

export default router;
