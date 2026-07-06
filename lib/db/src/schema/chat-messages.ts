import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    channel: text("channel").notNull(),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: integer("deleted_by").references(() => playersTable.id, {
      onDelete: "set null",
    }),
    authorStaffTag: text("author_staff_tag"),
  },
  (table) => [
    index("chat_messages_channel_id_idx").on(table.channel, table.id),
  ],
);

export type ChatMessageRow = typeof chatMessagesTable.$inferSelect;
