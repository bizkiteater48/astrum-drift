import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const userSessionsTable = pgTable(
  "user_sessions",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .unique()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    ip: text("ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("user_sessions_ip_unique").on(table.ip)],
);

export type UserSession = typeof userSessionsTable.$inferSelect;
