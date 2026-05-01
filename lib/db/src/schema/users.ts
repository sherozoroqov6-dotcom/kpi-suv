import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("viewer"),
  departmentId: integer("department_id"),
  employeeId: integer("employee_id"),
  viloyat: text("viloyat"),
  tuman: text("tuman"),
  // Super admin tomonidan oddiy adminlarga beriladigan ruxsatlar:
  canCreateWorkPlans: boolean("can_create_work_plans").notNull().default(false),
  canEnterResults: boolean("can_enter_results").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
