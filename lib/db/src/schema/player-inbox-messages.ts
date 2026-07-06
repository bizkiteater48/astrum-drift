import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const playerInboxMessagesTable = pgTable(
  "player_inbox_messages",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    senderLabel: text("sender_label").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("player_inbox_messages_player_created_idx").on(
      table.playerId,
      table.createdAt,
    ),
  ],
);

export type PlayerInboxMessage = typeof playerInboxMessagesTable.$inferSelect;
