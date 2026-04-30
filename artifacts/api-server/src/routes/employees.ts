import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { employeesTable, departmentsTable, evaluationsTable, usersTable } from "@workspace/db";
import { eq, avg, and, inArray } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

// ─── GET /employees ──────────────────────────────────────────────────────────

router.get("/employees", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { departmentId, search, tuman, tumans } = req.query as {
    departmentId?: string; search?: string; tuman?: string; tumans?: string;
  };

  const [userExt] = await db.select({ employeeId: usersTable.employeeId, tuman: usersTable.tuman })
    .from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);

  let empRows = await db.select().from(employeesTable).orderBy(employeesTable.fullName);

  const userTuman = userExt?.tuman ?? null;

  if (userTuman) {
    // Tumani bor foydalanuvchi — faqat o'z tumanini ko'radi
    empRows = empRows.filter((e) => e.tuman === userTuman);
  } else {
    // Super admin — query params bo'yicha filter
    if (tumans) {
      const tumanList = tumans.split(",").map((t) => t.trim()).filter(Boolean);
      if (tumanList.length > 0) {
        empRows = empRows.filter((e) => e.tuman && tumanList.includes(e.tuman));
      }
    } else if (tuman) {
      empRows = empRows.filter((e) => e.tuman === tuman);
    }
  }

  if (departmentId) {
    empRows = empRows.filter((e) => e.departmentId === parseInt(departmentId));
  }
  if (search) {
    const s = search.toLowerCase();
    empRows = empRows.filter(
      (e) => e.fullName.toLowerCase().includes(s) || e.position.toLowerCase().includes(s),
    );
  }

  const depts = await db.select().from(departmentsTable);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));

  const avgScores = await db
    .select({ employeeId: evaluationsTable.employeeId, avgScore: avg(evaluationsTable.score) })
    .from(evaluationsTable)
    .groupBy(evaluationsTable.employeeId);
  const avgMap = new Map(avgScores.map((a) => [a.employeeId, Number(a.avgScore ?? 0)]));

  const allUsers = await db
    .select({ employeeId: usersTable.employeeId, username: usersTable.username })
    .from(usersTable);
  const userMap = new Map<number, string>();
  for (const u of allUsers) {
    if (u.employeeId != null) userMap.set(u.employeeId, u.username);
  }

  const result = empRows.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    position: e.position,
    departmentId: e.departmentId,
    departmentName: deptMap.get(e.departmentId) ?? null,
    phone: e.phone ?? null,
    email: e.email ?? null,
    hireDate: e.hireDate ?? null,
    status: e.status,
    tuman: e.tuman ?? null,
    passportSeries: e.passportSeries ?? null,
    passportNumber: e.passportNumber ?? null,
    pinfl: e.pinfl ?? null,
    isIjroResponsible: e.isIjroResponsible ?? false,
    username: userMap.get(e.id) ?? null,
    averageScore: avgMap.get(e.id) ?? null,
    createdAt: e.createdAt.toISOString(),
  }));

  res.json(result);
});

// ─── GET /employees/approver?tuman=X&viloyat=Y ───────────────────────────────
// Returns the admin/manager-role user's fullName for the given viloyat+tuman

router.get("/employees/approver", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { tuman, viloyat } = req.query as { tuman?: string; viloyat?: string };

  if (!tuman && !viloyat) return res.json({ fullName: null });

  const APPROVER_ROLES = ["admin", "manager"];

  // Helper to resolve fullName from a user row
  const resolveFullName = async (u: { employeeId: number | null; fullName: string }) => {
    if (u.employeeId) {
      const emp = await db.select({ fullName: employeesTable.fullName })
        .from(employeesTable).where(eq(employeesTable.id, u.employeeId)).limit(1);
      return emp[0]?.fullName ?? u.fullName ?? null;
    }
    return u.fullName ?? null;
  };

  const pickBest = (rows: { employeeId: number | null; fullName: string }[]) =>
    rows.find((u) => u.employeeId != null) ?? rows[0] ?? null;

  // 1. Exact match: tuman + viloyat + role
  if (tuman && viloyat) {
    const rows = await db.select({ employeeId: usersTable.employeeId, fullName: usersTable.fullName })
      .from(usersTable)
      .where(and(inArray(usersTable.role, APPROVER_ROLES), eq(usersTable.tuman, tuman), eq(usersTable.viloyat, viloyat)));
    const best = pickBest(rows);
    if (best) return res.json({ fullName: await resolveFullName(best) });
  }

  // 2. Tuman-only match (any viloyat) + role
  if (tuman) {
    const rows = await db.select({ employeeId: usersTable.employeeId, fullName: usersTable.fullName })
      .from(usersTable)
      .where(and(inArray(usersTable.role, APPROVER_ROLES), eq(usersTable.tuman, tuman)));
    const best = pickBest(rows);
    if (best) return res.json({ fullName: await resolveFullName(best) });
  }

  // 3. Viloyat-only match (admin assigned to viloyat without specific tuman) + role
  if (viloyat) {
    const rows = await db.select({ employeeId: usersTable.employeeId, fullName: usersTable.fullName })
      .from(usersTable)
      .where(and(inArray(usersTable.role, APPROVER_ROLES), eq(usersTable.viloyat, viloyat)));
    const best = pickBest(rows);
    if (best) return res.json({ fullName: await resolveFullName(best) });
  }

  // 4. Fallback without role filter (tuman first, then viloyat)
  if (tuman) {
    const rows = await db.select({ employeeId: usersTable.employeeId, fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.tuman, tuman));
    const best = pickBest(rows);
    if (best) return res.json({ fullName: await resolveFullName(best) });
  }
  if (viloyat) {
    const rows = await db.select({ employeeId: usersTable.employeeId, fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.viloyat, viloyat));
    const best = pickBest(rows);
    if (best) return res.json({ fullName: await resolveFullName(best) });
  }

  return res.json({ fullName: null });
});

// ─── POST /employees ─────────────────────────────────────────────────────────

router.post("/employees", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const {
    fullName, position, departmentId, phone, email, hireDate, status, tuman,
    passportSeries, passportNumber, pinfl, isIjroResponsible,
    username, password,
  } = req.body as {
    fullName?: string; position?: string; departmentId?: number;
    phone?: string | null; email?: string | null; hireDate?: string | null;
    status?: string; tuman?: string | null;
    passportSeries?: string | null; passportNumber?: string | null; pinfl?: string | null;
    isIjroResponsible?: boolean;
    username?: string; password?: string;
  };

  if (!fullName || !position || !departmentId || !status) {
    res.status(400).json({ error: "Ism, lavozim, bo'lim va status kiritilishi shart" });
    return;
  }

  if (username) {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Bu login allaqachon mavjud. Boshqa login tanlang." });
      return;
    }
    if (!password || password.length < 4) {
      res.status(400).json({ error: "Parol kamida 4 ta belgidan iborat bo'lishi shart" });
      return;
    }
  }

  const [emp] = await db
    .insert(employeesTable)
    .values({
      fullName, position, departmentId,
      phone: phone ?? null, email: email ?? null,
      hireDate: hireDate ?? null, status,
      tuman: tuman ?? null,
      passportSeries: passportSeries ?? null,
      passportNumber: passportNumber ?? null,
      pinfl: pinfl ?? null,
      isIjroResponsible: isIjroResponsible ?? false,
    })
    .returning();

  if (username && password) {
    await db.insert(usersTable).values({
      username,
      password,
      fullName: emp.fullName,
      role: "viewer",
      departmentId: emp.departmentId,
      employeeId: emp.id,
    });
  }

  const depts = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.id, departmentId))
    .limit(1);

  res.status(201).json({
    id: emp.id,
    fullName: emp.fullName,
    position: emp.position,
    departmentId: emp.departmentId,
    departmentName: depts[0]?.name ?? null,
    phone: emp.phone ?? null,
    email: emp.email ?? null,
    hireDate: emp.hireDate ?? null,
    status: emp.status,
    tuman: emp.tuman ?? null,
    passportSeries: emp.passportSeries ?? null,
    passportNumber: emp.passportNumber ?? null,
    pinfl: emp.pinfl ?? null,
    isIjroResponsible: emp.isIjroResponsible ?? false,
    username: username ?? null,
    averageScore: null,
    createdAt: emp.createdAt.toISOString(),
  });
});

// ─── GET /employees/:id ───────────────────────────────────────────────────────

router.get("/employees/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const emps = await db.select().from(employeesTable).where(eq(employeesTable.id, id)).limit(1);

  if (emps.length === 0) {
    res.status(404).json({ error: "Xodim topilmadi" });
    return;
  }

  const emp = emps[0];
  const depts = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.id, emp.departmentId))
    .limit(1);
  const avgScore = await db
    .select({ avgScore: avg(evaluationsTable.score) })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.employeeId, id));
  const linked = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.employeeId, id))
    .limit(1);

  res.json({
    id: emp.id,
    fullName: emp.fullName,
    position: emp.position,
    departmentId: emp.departmentId,
    departmentName: depts[0]?.name ?? null,
    phone: emp.phone ?? null,
    email: emp.email ?? null,
    hireDate: emp.hireDate ?? null,
    status: emp.status,
    tuman: emp.tuman ?? null,
    passportSeries: emp.passportSeries ?? null,
    passportNumber: emp.passportNumber ?? null,
    pinfl: emp.pinfl ?? null,
    isIjroResponsible: emp.isIjroResponsible ?? false,
    username: linked[0]?.username ?? null,
    averageScore: avgScore[0]?.avgScore ? Number(avgScore[0].avgScore) : null,
    createdAt: emp.createdAt.toISOString(),
  });
});

// ─── PUT /employees/:id ───────────────────────────────────────────────────────

router.put("/employees/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const {
    fullName, position, departmentId, phone, email, hireDate, status, tuman,
    passportSeries, passportNumber, pinfl, isIjroResponsible,
    username, password,
  } = req.body as {
    fullName?: string; position?: string; departmentId?: number;
    phone?: string | null; email?: string | null; hireDate?: string | null;
    status?: string; tuman?: string | null;
    passportSeries?: string | null; passportNumber?: string | null; pinfl?: string | null;
    isIjroResponsible?: boolean;
    username?: string; password?: string;
  };

  if (!fullName || !position || !departmentId || !status) {
    res.status(400).json({ error: "Ism, lavozim, bo'lim va status kiritilishi shart" });
    return;
  }

  const [emp] = await db
    .update(employeesTable)
    .set({
      fullName, position, departmentId,
      phone: phone ?? null, email: email ?? null,
      hireDate: hireDate ?? null, status,
      tuman: tuman ?? null,
      passportSeries: passportSeries ?? null,
      passportNumber: passportNumber ?? null,
      pinfl: pinfl ?? null,
      isIjroResponsible: isIjroResponsible ?? false,
    })
    .where(eq(employeesTable.id, id))
    .returning();

  if (!emp) {
    res.status(404).json({ error: "Xodim topilmadi" });
    return;
  }

  // Sync linked user
  const existingLinked = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.employeeId, id))
    .limit(1);

  if (username) {
    if (existingLinked.length > 0) {
      const updateData: Record<string, unknown> = {
        fullName: emp.fullName,
        departmentId: emp.departmentId,
      };
      if (password && password.length >= 4) updateData.password = password;
      await db.update(usersTable).set(updateData).where(eq(usersTable.employeeId, id));
    } else {
      const taken = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);
      if (taken.length === 0 && password && password.length >= 4) {
        await db.insert(usersTable).values({
          username,
          password,
          fullName: emp.fullName,
          role: "viewer",
          departmentId: emp.departmentId,
          employeeId: emp.id,
        });
      }
    }
  }

  const depts = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.id, departmentId))
    .limit(1);
  const avgScore = await db
    .select({ avgScore: avg(evaluationsTable.score) })
    .from(evaluationsTable)
    .where(eq(evaluationsTable.employeeId, id));
  const linkedAfter = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.employeeId, id))
    .limit(1);

  res.json({
    id: emp.id,
    fullName: emp.fullName,
    position: emp.position,
    departmentId: emp.departmentId,
    departmentName: depts[0]?.name ?? null,
    phone: emp.phone ?? null,
    email: emp.email ?? null,
    hireDate: emp.hireDate ?? null,
    status: emp.status,
    tuman: emp.tuman ?? null,
    passportSeries: emp.passportSeries ?? null,
    passportNumber: emp.passportNumber ?? null,
    pinfl: emp.pinfl ?? null,
    isIjroResponsible: emp.isIjroResponsible ?? false,
    username: linkedAfter[0]?.username ?? null,
    averageScore: avgScore[0]?.avgScore ? Number(avgScore[0].avgScore) : null,
    createdAt: emp.createdAt.toISOString(),
  });
});

// ─── DELETE /employees/:id ───────────────────────────────────────────────────

router.delete("/employees/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);

  await db.delete(usersTable).where(eq(usersTable.employeeId, id));

  const deleted = await db
    .delete(employeesTable)
    .where(eq(employeesTable.id, id))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Xodim topilmadi" });
    return;
  }

  res.json({ message: "Xodim o'chirildi" });
});

export default router;
