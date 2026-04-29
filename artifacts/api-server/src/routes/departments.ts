import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { departmentsTable, employeesTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/departments", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { tuman, tumans } = req.query as { tuman?: string; tumans?: string };

  const [userExt] = await db.select({ tuman: usersTable.tuman })
    .from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  const userTuman = userExt?.tuman ?? null;

  let depts = await db.select().from(departmentsTable).orderBy(departmentsTable.name);

  if (userTuman) {
    // Tumani bor foydalanuvchi — faqat o'z tumanini ko'radi
    depts = depts.filter((d) => d.tuman === userTuman);
  } else {
    // Super admin — query params bo'yicha filter
    if (tumans) {
      const tumanList = tumans.split(",").map((t) => t.trim()).filter(Boolean);
      if (tumanList.length > 0) {
        depts = depts.filter((d) => d.tuman && tumanList.includes(d.tuman));
      }
    } else if (tuman) {
      depts = depts.filter((d) => d.tuman === tuman);
    }
  }

  const empCounts = await db
    .select({ departmentId: employeesTable.departmentId, cnt: count() })
    .from(employeesTable)
    .groupBy(employeesTable.departmentId);

  const countMap = new Map(empCounts.map((e) => [e.departmentId, Number(e.cnt)]));

  const result = depts.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description ?? null,
    headName: d.headName ?? null,
    tuman: d.tuman ?? null,
    employeeCount: countMap.get(d.id) ?? 0,
    createdAt: d.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/departments", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, code, description, headName, tuman } = req.body as {
    name?: string;
    code?: string;
    description?: string | null;
    headName?: string | null;
    tuman?: string | null;
  };

  if (!name || !code) {
    res.status(400).json({ error: "Nomi va kodi kiritilishi shart" });
    return;
  }

  const [dept] = await db
    .insert(departmentsTable)
    .values({ name, code, description: description ?? null, headName: headName ?? null, tuman: tuman ?? null })
    .returning();

  res.status(201).json({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    description: dept.description ?? null,
    headName: dept.headName ?? null,
    employeeCount: 0,
    createdAt: dept.createdAt.toISOString(),
  });
});

router.get("/departments/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const depts = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id)).limit(1);

  if (depts.length === 0) {
    res.status(404).json({ error: "Bo'lim topilmadi" });
    return;
  }

  const empCount = await db
    .select({ cnt: count() })
    .from(employeesTable)
    .where(eq(employeesTable.departmentId, id));

  const dept = depts[0];
  res.json({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    description: dept.description ?? null,
    headName: dept.headName ?? null,
    employeeCount: Number(empCount[0]?.cnt ?? 0),
    createdAt: dept.createdAt.toISOString(),
  });
});

router.put("/departments/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const { name, code, description, headName, tuman } = req.body as {
    name?: string;
    code?: string;
    description?: string | null;
    headName?: string | null;
    tuman?: string | null;
  };

  if (!name || !code) {
    res.status(400).json({ error: "Nomi va kodi kiritilishi shart" });
    return;
  }

  const [dept] = await db
    .update(departmentsTable)
    .set({ name, code, description: description ?? null, headName: headName ?? null, tuman: tuman ?? null })
    .where(eq(departmentsTable.id, id))
    .returning();

  if (!dept) {
    res.status(404).json({ error: "Bo'lim topilmadi" });
    return;
  }

  const empCount = await db
    .select({ cnt: count() })
    .from(employeesTable)
    .where(eq(employeesTable.departmentId, id));

  res.json({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    description: dept.description ?? null,
    headName: dept.headName ?? null,
    employeeCount: Number(empCount[0]?.cnt ?? 0),
    createdAt: dept.createdAt.toISOString(),
  });
});

router.delete("/departments/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const deleted = await db.delete(departmentsTable).where(eq(departmentsTable.id, id)).returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Bo'lim topilmadi" });
    return;
  }

  res.json({ message: "Bo'lim o'chirildi" });
});

export default router;
