import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const playerReportsTable = pgTable(
  "player_reports",
  {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    reportedPlayerId: integer("reported_player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    channel: text("channel"),
    messageId: integer("message_id"),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("pending"),
    resolvedBy: integer("resolved_by").references(() => playersTable.id, {
      onDelete: "set null",
    }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("player_reports_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const moderationRecordsTable = pgTable(
  "moderation_records",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    moderatorId: integer("moderator_id")
      .notNull()
      .references(() => playersTable.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    reason: text("reason").notNull(),
    durationMinutes: integer("duration_minutes"),
    messageId: integer("message_id"),
    reportId: integer("report_id").references(() => playerReportsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("moderation_records_player_created_idx").on(
      table.playerId,
      table.createdAt,
    ),
  ],
);

export type PlayerReport = typeof playerReportsTable.$inferSelect;
export type ModerationRecord = typeof moderationRecordsTable.$inferSelect;
