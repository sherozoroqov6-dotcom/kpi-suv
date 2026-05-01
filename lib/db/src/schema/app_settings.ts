import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Singleton-style settings table. Currently 1 row used (key = "global").
export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  // Xodimlar uchun ish reja yaratish ruxsat berilgan oy (YYYY-MM). NULL = chegara yo'q.
  workPlanCreatePeriod: text("work_plan_create_period"),
  // Xodimlar uchun ish reja natijalarini kiritish ruxsat berilgan oy (YYYY-MM). NULL = chegara yo'q.
  resultsEnterPeriod: text("results_enter_period"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppSettings = typeof appSettingsTable.$inferSelect;
