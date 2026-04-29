import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const userSessionsTable = pgTable("user_sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("viewer"),
  departmentId: integer("department_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
