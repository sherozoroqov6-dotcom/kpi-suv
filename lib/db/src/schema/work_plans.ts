import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workPlansTable = pgTable("work_plans", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id"),
  userId: integer("user_id"),
  period: text("period").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  approvedById: integer("approved_by_id"),
  approveComment: text("approve_comment"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workPlanTasksTable = pgTable("work_plan_tasks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  orderNum: integer("order_num").notNull().default(1),
  isSection: boolean("is_section").notNull().default(false),
  title: text("title").notNull(),
  implementationMechanism: text("implementation_mechanism"),
  fundingSource: text("funding_source"),
  unitOfMeasure: text("unit_of_measure"),
  plannedVolume: text("planned_volume"),
  actualVolume: text("actual_volume"),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  responsiblePerson: text("responsible_person"),
  location: text("location"),
  controller: text("controller"),
  startDate: text("start_date"),
  deadline: text("deadline"),
  expectedResult: text("expected_result"),
  actualResult: text("actual_result"),
  status: text("status").notNull().default("pending"),
  pdfUrl: text("pdf_url"),
  category: text("category"),
  ijroLate: integer("ijro_late"),
  ijroUnexecuted: integer("ijro_unexecuted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mfylarTable = pgTable("mfylar", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tuman: text("tuman").notNull().default("Kattaqo'rg'on tumani"),
  viloyat: text("viloyat").notNull().default("samarqand"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Mfy = typeof mfylarTable.$inferSelect;

export const insertWorkPlanSchema = createInsertSchema(workPlansTable).omit({ id: true, createdAt: true });
export type InsertWorkPlan = z.infer<typeof insertWorkPlanSchema>;
export type WorkPlan = typeof workPlansTable.$inferSelect;

export const insertWorkPlanTaskSchema = createInsertSchema(workPlanTasksTable).omit({ id: true, createdAt: true });
export type InsertWorkPlanTask = z.infer<typeof insertWorkPlanTaskSchema>;
export type WorkPlanTask = typeof workPlanTasksTable.$inferSelect;
