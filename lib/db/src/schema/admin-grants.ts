import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const adminGrantsTable = pgTable(
  "admin_grants",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    targetPlayerId: integer("target_player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    creditsDelta: integer("credits_delta").notNull().default(0),
    silverCoinsDelta: integer("silver_coins_delta").notNull().default(0),
    itemsJson: jsonb("items_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_grants_created_at_idx").on(table.createdAt),
    index("admin_grants_target_player_idx").on(
      table.targetPlayerId,
      table.createdAt,
    ),
  ],
);

export type AdminGrant = typeof adminGrantsTable.$inferSelect;
