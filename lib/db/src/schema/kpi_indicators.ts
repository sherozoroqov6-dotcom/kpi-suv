import { pgTable, serial, text, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const kpiIndicatorsTable = pgTable("kpi_indicators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull(),
  unit: text("unit"),
  targetValue: doublePrecision("target_value"),
  weight: doublePrecision("weight").notNull().default(1),
  employeeIds: integer("employee_ids").array(),
  tuman: text("tuman"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKpiIndicatorSchema = createInsertSchema(kpiIndicatorsTable).omit({ id: true, createdAt: true });
export type InsertKpiIndicator = z.infer<typeof insertKpiIndicatorSchema>;
export type KpiIndicator = typeof kpiIndicatorsTable.$inferSelect;
