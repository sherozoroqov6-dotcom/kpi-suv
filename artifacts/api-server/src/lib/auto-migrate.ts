import { pool } from "@workspace/db";
import { logger } from "./logger.js";

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: "employees.is_ijro_responsible",
    sql: `ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_ijro_responsible BOOLEAN NOT NULL DEFAULT FALSE`,
  },
  {
    name: "employees.is_ijro_assigned",
    sql: `ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_ijro_assigned BOOLEAN NOT NULL DEFAULT FALSE`,
  },
  {
    name: "employees.is_mehnat_responsible",
    sql: `ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_mehnat_responsible BOOLEAN NOT NULL DEFAULT FALSE`,
  },
  {
    name: "work_plan_tasks.category",
    sql: `ALTER TABLE work_plan_tasks ADD COLUMN IF NOT EXISTS category TEXT`,
  },
  {
    name: "work_plan_tasks.ijro_late",
    sql: `ALTER TABLE work_plan_tasks ADD COLUMN IF NOT EXISTS ijro_late INTEGER`,
  },
  {
    name: "work_plan_tasks.ijro_unexecuted",
    sql: `ALTER TABLE work_plan_tasks ADD COLUMN IF NOT EXISTS ijro_unexecuted INTEGER`,
  },
  {
    name: "work_plan_tasks.mehnat_work_hours",
    sql: `ALTER TABLE work_plan_tasks ADD COLUMN IF NOT EXISTS mehnat_work_hours INTEGER`,
  },
  {
    name: "work_plan_tasks.mehnat_late_minutes",
    sql: `ALTER TABLE work_plan_tasks ADD COLUMN IF NOT EXISTS mehnat_late_minutes INTEGER`,
  },
  {
    name: "work_plan_tasks.mehnat_late_days",
    sql: `ALTER TABLE work_plan_tasks ADD COLUMN IF NOT EXISTS mehnat_late_days INTEGER`,
  },
  {
    name: "work_plan_tasks.mehnat_result",
    sql: `ALTER TABLE work_plan_tasks ADD COLUMN IF NOT EXISTS mehnat_result TEXT`,
  },
];

const RENAMES: Array<{ name: string; sql: string }> = [
  {
    name: "backfill_mehnat_category_for_legacy_auto_tasks",
    sql: `UPDATE work_plan_tasks
          SET category = 'mehnat'
          WHERE category IS NULL
            AND title = 'Mehnat intizomi (avto-vazifa)'`,
  },
  {
    name: "rename_mehnat_intizomi_to_malaka_talabi",
    sql: `UPDATE work_plan_tasks
          SET title = 'Malaka talabi (avto-vazifa)'
          WHERE title = 'Mehnat intizomi (avto-vazifa)'
            AND category = 'mehnat'`,
  },
  {
    name: "reorder_mehnat_to_top",
    sql: `UPDATE work_plan_tasks
          SET order_num = 0
          WHERE category = 'mehnat'
            AND order_num <> 0`,
  },
  {
    name: "reorder_ijro_after_mehnat",
    sql: `UPDATE work_plan_tasks
          SET order_num = 1
          WHERE category = 'ijro'
            AND order_num = 0`,
  },
];

export async function runAutoMigrate(): Promise<void> {
  logger.info({ count: MIGRATIONS.length }, "Auto-migrate: starting");

  for (const m of MIGRATIONS) {
    try {
      await pool.query(m.sql);
      logger.info({ migration: m.name }, "Auto-migrate: applied");
    } catch (err) {
      logger.error({ err, migration: m.name }, "Auto-migrate: column add failed");
      throw err;
    }
  }

  for (const r of RENAMES) {
    try {
      const result = await pool.query(r.sql);
      logger.info(
        { migration: r.name, rowCount: result.rowCount },
        "Auto-migrate: rename applied",
      );
    } catch (err) {
      logger.warn(
        { err, migration: r.name },
        "Auto-migrate: rename skipped (non-fatal)",
      );
    }
  }

  logger.info("Auto-migrate: complete");
}
