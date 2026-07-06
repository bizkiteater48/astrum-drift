import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const gamblingChallengesTable = pgTable(
  "gambling_challenges",
  {
    id: serial("id").primaryKey(),
    challengerId: integer("challenger_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    opponentId: integer("opponent_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    game: text("game").notNull().default("warp_flip"),
    stake: integer("stake").notNull(),
    challengerChoice: text("challenger_choice").notNull(),
    status: text("status").notNull().default("pending"),
    winnerId: integer("winner_id").references(() => playersTable.id, {
      onDelete: "set null",
    }),
    flipResult: text("flip_result"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("gambling_challenges_opponent_pending_idx").on(
      table.opponentId,
      table.status,
      table.createdAt,
    ),
    index("gambling_challenges_challenger_pending_idx").on(
      table.challengerId,
      table.status,
      table.createdAt,
    ),
  ],
);

export type GamblingChallenge = typeof gamblingChallengesTable.$inferSelect;
