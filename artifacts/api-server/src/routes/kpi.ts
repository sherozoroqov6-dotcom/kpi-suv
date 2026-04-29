import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { kpiCategoriesTable, kpiIndicatorsTable, usersTable, employeesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

async function getUserTuman(userId: number): Promise<string | null> {
  const [u] = await db.select({ tuman: usersTable.tuman }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return u?.tuman ?? null;
}

// KPI Categories
router.get("/kpi-categories", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userTuman = await getUserTuman(req.user!.id);

  let cats = await db.select().from(kpiCategoriesTable).orderBy(kpiCategoriesTable.name);

  if (userTuman) {
    cats = cats.filter((c) => c.tuman === userTuman || c.tuman === null);
  }

  const indCounts = await db
    .select({ categoryId: kpiIndicatorsTable.categoryId, cnt: count() })
    .from(kpiIndicatorsTable)
    .groupBy(kpiIndicatorsTable.categoryId);
  const countMap = new Map(indCounts.map((i) => [i.categoryId, Number(i.cnt)]));

  const result = cats.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    weight: c.weight,
    color: c.color ?? null,
    tuman: c.tuman ?? null,
    indicatorCount: countMap.get(c.id) ?? 0,
    createdAt: c.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/kpi-categories", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, weight, color } = req.body as {
    name?: string;
    description?: string | null;
    weight?: number;
    color?: string | null;
  };

  if (!name || weight === undefined) {
    res.status(400).json({ error: "Nomi va vazni kiritilishi shart" });
    return;
  }

  const userTuman = await getUserTuman(req.user!.id);

  const [cat] = await db
    .insert(kpiCategoriesTable)
    .values({ name, description: description ?? null, weight, color: color ?? null, tuman: userTuman ?? null })
    .returning();

  res.status(201).json({
    id: cat.id,
    name: cat.name,
    description: cat.description ?? null,
    weight: cat.weight,
    color: cat.color ?? null,
    tuman: cat.tuman ?? null,
    indicatorCount: 0,
    createdAt: cat.createdAt.toISOString(),
  });
});

router.put("/kpi-categories/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const { name, description, weight, color } = req.body as {
    name?: string;
    description?: string | null;
    weight?: number;
    color?: string | null;
  };

  if (!name || weight === undefined) {
    res.status(400).json({ error: "Nomi va vazni kiritilishi shart" });
    return;
  }

  const [cat] = await db
    .update(kpiCategoriesTable)
    .set({ name, description: description ?? null, weight, color: color ?? null })
    .where(eq(kpiCategoriesTable.id, id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "KPI toifasi topilmadi" });
    return;
  }

  const indCount = await db
    .select({ cnt: count() })
    .from(kpiIndicatorsTable)
    .where(eq(kpiIndicatorsTable.categoryId, id));

  res.json({
    id: cat.id,
    name: cat.name,
    description: cat.description ?? null,
    weight: cat.weight,
    color: cat.color ?? null,
    tuman: cat.tuman ?? null,
    indicatorCount: Number(indCount[0]?.cnt ?? 0),
    createdAt: cat.createdAt.toISOString(),
  });
});

router.delete("/kpi-categories/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const deleted = await db.delete(kpiCategoriesTable).where(eq(kpiCategoriesTable.id, id)).returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "KPI toifasi topilmadi" });
    return;
  }

  res.json({ message: "KPI toifasi o'chirildi" });
});

// KPI Indicators
router.get("/kpi-indicators", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { categoryId, employeeId } = req.query as { categoryId?: string; employeeId?: string };
  const userTuman = await getUserTuman(req.user!.id);

  let inds = await db.select().from(kpiIndicatorsTable).orderBy(kpiIndicatorsTable.name);

  if (userTuman) {
    inds = inds.filter((i) => i.tuman === userTuman || i.tuman === null);
  }
  if (categoryId) {
    inds = inds.filter((i) => i.categoryId === parseInt(categoryId));
  }
  if (employeeId) {
    const empId = parseInt(employeeId);
    inds = inds.filter((i) => Array.isArray(i.employeeIds) && i.employeeIds.includes(empId));
  }

  const cats = await db.select().from(kpiCategoriesTable);
  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  const allEmps = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName }).from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  const result = inds.map((i) => {
    const empIds: number[] = Array.isArray(i.employeeIds) ? i.employeeIds : [];
    const empNames = empIds.map((id) => empMap.get(id)).filter(Boolean) as string[];
    return {
      id: i.id,
      name: i.name,
      description: i.description ?? null,
      categoryId: i.categoryId,
      categoryName: catMap.get(i.categoryId) ?? null,
      unit: i.unit ?? null,
      targetValue: i.targetValue ?? null,
      weight: i.weight,
      employeeIds: empIds,
      employeeNames: empNames,
      tuman: i.tuman ?? null,
      createdAt: i.createdAt.toISOString(),
    };
  });

  res.json(result);
});

router.post("/kpi-indicators", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, categoryId, unit, targetValue, weight, employeeIds } = req.body as {
    name?: string;
    description?: string | null;
    categoryId?: number;
    unit?: string | null;
    targetValue?: number | null;
    weight?: number;
    employeeIds?: number[] | null;
  };

  if (!name || !categoryId || weight === undefined) {
    res.status(400).json({ error: "Nomi, toifasi va vazni kiritilishi shart" });
    return;
  }

  const userTuman = await getUserTuman(req.user!.id);
  const empIds: number[] = Array.isArray(employeeIds) ? employeeIds.filter((id) => typeof id === "number") : [];

  const [ind] = await db
    .insert(kpiIndicatorsTable)
    .values({
      name,
      description: description ?? null,
      categoryId,
      unit: unit ?? null,
      targetValue: targetValue ?? null,
      weight,
      employeeIds: empIds.length > 0 ? empIds : null,
      tuman: userTuman ?? null,
    })
    .returning();

  const cats = await db.select().from(kpiCategoriesTable).where(eq(kpiCategoriesTable.id, categoryId)).limit(1);
  const allEmps = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName }).from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));
  const storedIds: number[] = Array.isArray(ind.employeeIds) ? ind.employeeIds : [];
  const empNames = storedIds.map((id) => empMap.get(id)).filter(Boolean) as string[];

  res.status(201).json({
    id: ind.id,
    name: ind.name,
    description: ind.description ?? null,
    categoryId: ind.categoryId,
    categoryName: cats[0]?.name ?? null,
    unit: ind.unit ?? null,
    targetValue: ind.targetValue ?? null,
    weight: ind.weight,
    employeeIds: storedIds,
    employeeNames: empNames,
    tuman: ind.tuman ?? null,
    createdAt: ind.createdAt.toISOString(),
  });
});

router.put("/kpi-indicators/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const { name, description, categoryId, unit, targetValue, weight, employeeIds } = req.body as {
    name?: string;
    description?: string | null;
    categoryId?: number;
    unit?: string | null;
    targetValue?: number | null;
    weight?: number;
    employeeIds?: number[] | null;
  };

  if (!name || !categoryId || weight === undefined) {
    res.status(400).json({ error: "Nomi, toifasi va vazni kiritilishi shart" });
    return;
  }

  const empIds: number[] = Array.isArray(employeeIds) ? employeeIds.filter((i) => typeof i === "number") : [];

  const [ind] = await db
    .update(kpiIndicatorsTable)
    .set({
      name,
      description: description ?? null,
      categoryId,
      unit: unit ?? null,
      targetValue: targetValue ?? null,
      weight,
      employeeIds: empIds.length > 0 ? empIds : null,
    })
    .where(eq(kpiIndicatorsTable.id, id))
    .returning();

  if (!ind) {
    res.status(404).json({ error: "KPI ko'rsatkichi topilmadi" });
    return;
  }

  const cats = await db.select().from(kpiCategoriesTable).where(eq(kpiCategoriesTable.id, categoryId)).limit(1);
  const allEmps = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName }).from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));
  const storedIds: number[] = Array.isArray(ind.employeeIds) ? ind.employeeIds : [];
  const empNames = storedIds.map((eid) => empMap.get(eid)).filter(Boolean) as string[];

  res.json({
    id: ind.id,
    name: ind.name,
    description: ind.description ?? null,
    categoryId: ind.categoryId,
    categoryName: cats[0]?.name ?? null,
    unit: ind.unit ?? null,
    targetValue: ind.targetValue ?? null,
    weight: ind.weight,
    employeeIds: storedIds,
    employeeNames: empNames,
    tuman: ind.tuman ?? null,
    createdAt: ind.createdAt.toISOString(),
  });
});

router.delete("/kpi-indicators/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const deleted = await db.delete(kpiIndicatorsTable).where(eq(kpiIndicatorsTable.id, id)).returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "KPI ko'rsatkichi topilmadi" });
    return;
  }

  res.json({ message: "KPI ko'rsatkichi o'chirildi" });
});

export default router;
