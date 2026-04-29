import { pgTable, serial, text, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evaluationsTable = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  indicatorId: integer("indicator_id").notNull(),
  period: text("period").notNull(),
  score: doublePrecision("score").notNull(),
  maxScore: doublePrecision("max_score").notNull(),
  comment: text("comment"),
  evaluatorId: integer("evaluator_id"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  approvedById: integer("approved_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit({ id: true, createdAt: true });
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluationsTable.$inferSelect;
