import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

const DEFAULT_USERS = [
  {
    username: "5279606",
    password: "Sh5279606",
    fullName: "Super Administrator",
    role: "admin",
  },
  {
    username: "admin",
    password: "admin123",
    fullName: "Administrator",
    role: "admin",
  },
  {
    username: "menejer",
    password: "menejer123",
    fullName: "Menejer",
    role: "manager",
  },
];

export async function seedIfEmpty() {
  try {
    for (const user of DEFAULT_USERS) {
      const existing = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, user.username))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(usersTable).values(user);
        logger.info({ username: user.username }, "Seeded default user");
      }
    }
    logger.info("Seed check completed");
  } catch (err) {
    logger.error({ err }, "Failed to seed database");
  }
}
