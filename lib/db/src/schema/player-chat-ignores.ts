import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const playerChatIgnoresTable = pgTable(
  "player_chat_ignores",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    ignoredPlayerId: integer("ignored_player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("player_chat_ignores_pair_idx").on(
      table.playerId,
      table.ignoredPlayerId,
    ),
    index("player_chat_ignores_player_idx").on(table.playerId),
  ],
);
