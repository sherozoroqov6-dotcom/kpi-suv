import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const SUPER_USER = "5279606";
const KEY = "global";

async function getOrCreateGlobal() {
  const existing = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, KEY)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(appSettingsTable).values({ key: KEY }).returning();
  return created;
}

// Hamma autentifikatsiya o'tgan foydalanuvchilar settings'ni o'qiy oladi
// (chunki UI ulardan foydalanib oy tanlash maydonlarini lock qiladi).
router.get("/app-settings", requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const s = await getOrCreateGlobal();
  res.json({
    workPlanCreatePeriod: s.workPlanCreatePeriod ?? null,
    resultsEnterPeriod: s.resultsEnterPeriod ?? null,
    updatedAt: s.updatedAt.toISOString(),
  });
});

// Faqat super admin (5279606) yangilashi mumkin
router.put("/app-settings", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.username !== SUPER_USER) {
    res.status(403).json({ error: "Faqat super admin sozlay oladi" });
    return;
  }
  const { workPlanCreatePeriod, resultsEnterPeriod } = req.body as {
    workPlanCreatePeriod?: string | null;
    resultsEnterPeriod?: string | null;
  };
  await getOrCreateGlobal();
  const [updated] = await db
    .update(appSettingsTable)
    .set({
      workPlanCreatePeriod: workPlanCreatePeriod === undefined ? undefined : (workPlanCreatePeriod || null),
      resultsEnterPeriod: resultsEnterPeriod === undefined ? undefined : (resultsEnterPeriod || null),
      updatedAt: new Date(),
    })
    .where(eq(appSettingsTable.key, KEY))
    .returning();
  res.json({
    workPlanCreatePeriod: updated.workPlanCreatePeriod ?? null,
    resultsEnterPeriod: updated.resultsEnterPeriod ?? null,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
