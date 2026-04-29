import { pgTable, serial, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kpiCategoriesTable = pgTable("kpi_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  weight: doublePrecision("weight").notNull().default(1),
  color: text("color"),
  tuman: text("tuman"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKpiCategorySchema = createInsertSchema(kpiCategoriesTable).omit({ id: true, createdAt: true });
export type InsertKpiCategory = z.infer<typeof insertKpiCategorySchema>;
export type KpiCategory = typeof kpiCategoriesTable.$inferSelect;
