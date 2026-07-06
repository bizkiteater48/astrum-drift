import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  credits: integer("credits").notNull().default(0),
  silverCoins: integer("silver_coins").notNull().default(0),
  experience: integer("experience").notNull().default(0),
  currentLocation: text("current_location")
    .notNull()
    .default("Outpost One"),
  miningLevel: integer("mining_level").notNull().default(1),
  combatLevel: integer("combat_level").notNull().default(1),
  fabricationLevel: integer("fabrication_level").notNull().default(1),
  harvestingLevel: integer("harvesting_level").notNull().default(1),
  synthesisLevel: integer("synthesis_level").notNull().default(1),
  salvagingLevel: integer("salvaging_level").notNull().default(1),
  engineeringLevel: integer("engineering_level").notNull().default(1),
  navigationLevel: integer("navigation_level").notNull().default(1),
  tradingLevel: integer("trading_level").notNull().default(1),
  trackingLevel: integer("tracking_level").notNull().default(1),

  miningStartedAt: timestamp("mining_started_at", { withTimezone: true }),

  tutorialProgress: jsonb("tutorial_progress"),

  role: text("role").notNull().default("player"),
  mutedUntil: timestamp("muted_until", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
