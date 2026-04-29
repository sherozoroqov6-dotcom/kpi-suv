import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { evaluationsTable, employeesTable, departmentsTable, kpiIndicatorsTable, kpiCategoriesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

async function enrichEvaluation(ev: typeof evaluationsTable.$inferSelect) {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, ev.employeeId)).limit(1);
  const dept = emp
    ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, emp.departmentId)).limit(1)
    : [];
  const [ind] = await db.select().from(kpiIndicatorsTable).where(eq(kpiIndicatorsTable.id, ev.indicatorId)).limit(1);
  const cat = ind
    ? await db.select().from(kpiCategoriesTable).where(eq(kpiCategoriesTable.id, ind.categoryId)).limit(1)
    : [];
  const evaluator = ev.evaluatorId
    ? await db.select().from(usersTable).where(eq(usersTable.id, ev.evaluatorId)).limit(1)
    : [];

  return {
    id: ev.id,
    employeeId: ev.employeeId,
    employeeName: emp?.fullName ?? null,
    departmentName: dept[0]?.name ?? null,
    indicatorId: ev.indicatorId,
    indicatorName: ind?.name ?? null,
    categoryName: cat[0]?.name ?? null,
    period: ev.period,
    score: ev.score,
    maxScore: ev.maxScore,
    comment: ev.comment ?? null,
    evaluatorId: ev.evaluatorId ?? null,
    evaluatorName: evaluator[0]?.fullName ?? null,
    createdAt: ev.createdAt.toISOString(),
  };
}

router.get("/evaluations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { employeeId, period, departmentId, tuman, tumans } = req.query as {
    employeeId?: string;
    period?: string;
    departmentId?: string;
    tuman?: string;
    tumans?: string;
  };

  const [userExt] = await db.select({ employeeId: usersTable.employeeId, tuman: usersTable.tuman })
    .from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);

  const userTuman = userExt?.tuman ?? null;

  let evRows = await db.select().from(evaluationsTable).orderBy(evaluationsTable.createdAt);

  if (userTuman) {
    // Tumani bor foydalanuvchi — faqat o'z tumanidagi xodimlar baholashlarini ko'radi
    if (userExt?.employeeId) {
      evRows = evRows.filter((e) => e.employeeId === userExt.employeeId);
    } else {
      const allEmps = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);
      const empIds = new Set(allEmps.filter((e) => e.tuman === userTuman).map((e) => e.id));
      evRows = evRows.filter((e) => empIds.has(e.employeeId));
    }
  } else {
    // Super admin — query params bo'yicha filter
    if (employeeId) evRows = evRows.filter((e) => e.employeeId === parseInt(employeeId));
    if (tumans) {
      const tumanList = tumans.split(",").map((t) => t.trim()).filter(Boolean);
      const empsInTumans = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);
      const empIds = new Set(empsInTumans.filter((e) => e.tuman && tumanList.includes(e.tuman)).map((e) => e.id));
      evRows = evRows.filter((e) => empIds.has(e.employeeId));
    } else if (tuman) {
      const empsInTuman = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);
      const empIds = new Set(empsInTuman.filter((e) => e.tuman === tuman).map((e) => e.id));
      evRows = evRows.filter((e) => empIds.has(e.employeeId));
    }
  }

  if (period) evRows = evRows.filter((e) => e.period === period);
  if (departmentId) {
    const deptId = parseInt(departmentId);
    const empsInDept = await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.departmentId, deptId));
    const empIds = new Set(empsInDept.map((e) => e.id));
    evRows = evRows.filter((e) => empIds.has(e.employeeId));
  }

  const result = await Promise.all(evRows.map(enrichEvaluation));
  res.json(result);
});

router.post("/evaluations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { employeeId, indicatorId, period, score, maxScore, comment } = req.body as {
    employeeId?: number;
    indicatorId?: number;
    period?: string;
    score?: number;
    maxScore?: number;
    comment?: string | null;
  };

  if (!employeeId || !indicatorId || !period || score === undefined || maxScore === undefined) {
    res.status(400).json({ error: "Xodim, ko'rsatkich, davr, ball va maksimal ball kiritilishi shart" });
    return;
  }

  const evaluatorId = req.user?.id ?? null;

  const [ev] = await db
    .insert(evaluationsTable)
    .values({ employeeId, indicatorId, period, score, maxScore, comment: comment ?? null, evaluatorId })
    .returning();

  const enriched = await enrichEvaluation(ev);
  res.status(201).json(enriched);
});

router.get("/evaluations/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const evRows = await db.select().from(evaluationsTable).where(eq(evaluationsTable.id, id)).limit(1);

  if (evRows.length === 0) {
    res.status(404).json({ error: "Baholash topilmadi" });
    return;
  }

  const enriched = await enrichEvaluation(evRows[0]);
  res.json(enriched);
});

router.put("/evaluations/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const { employeeId, indicatorId, period, score, maxScore, comment } = req.body as {
    employeeId?: number;
    indicatorId?: number;
    period?: string;
    score?: number;
    maxScore?: number;
    comment?: string | null;
  };

  if (!employeeId || !indicatorId || !period || score === undefined || maxScore === undefined) {
    res.status(400).json({ error: "Xodim, ko'rsatkich, davr, ball va maksimal ball kiritilishi shart" });
    return;
  }

  const [ev] = await db
    .update(evaluationsTable)
    .set({ employeeId, indicatorId, period, score, maxScore, comment: comment ?? null })
    .where(eq(evaluationsTable.id, id))
    .returning();

  if (!ev) {
    res.status(404).json({ error: "Baholash topilmadi" });
    return;
  }

  const enriched = await enrichEvaluation(ev);
  res.json(enriched);
});

router.delete("/evaluations/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const deleted = await db.delete(evaluationsTable).where(eq(evaluationsTable.id, id)).returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Baholash topilmadi" });
    return;
  }

  res.json({ message: "Baholash o'chirildi" });
});

export default router;
