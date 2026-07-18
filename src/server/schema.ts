import {
  bigint,
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const pins = pgTable("pins", {
  id: uuid("id").primaryKey().defaultRandom(),
  lng: doublePrecision("lng").notNull(),
  lat: doublePrecision("lat").notNull(),
  audioUrl: text("audio_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // 'live' | 'hidden' — admin hides reported pins instead of deleting
  status: text("status").notNull().default("live"),
});

export const reports = pgTable("reports", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  pinId: uuid("pin_id")
    .notNull()
    .references(() => pins.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolved: boolean("resolved").notNull().default(false),
});

export type Pin = typeof pins.$inferSelect;
export type Report = typeof reports.$inferSelect;
