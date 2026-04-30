import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  position: text("position").notNull(),
  departmentId: integer("department_id").notNull(),
  phone: text("phone"),
  email: text("email"),
  hireDate: text("hire_date"),
  status: text("status").notNull().default("active"),
  tuman: text("tuman"),
  passportSeries: text("passport_series"),
  passportNumber: text("passport_number"),
  pinfl: text("pinfl"),
  isIjroResponsible: boolean("is_ijro_responsible").notNull().default(false),
  isIjroAssigned: boolean("is_ijro_assigned").notNull().default(false),
  isMehnatResponsible: boolean("is_mehnat_responsible").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
