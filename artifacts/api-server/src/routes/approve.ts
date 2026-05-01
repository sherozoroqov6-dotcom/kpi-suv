import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import {
  workPlansTable, workPlanTasksTable, employeesTable, departmentsTable,
  evaluationsTable, kpiIndicatorsTable, kpiCategoriesTable, usersTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getTumanlarForViloyat } from "../lib/viloyatlar.js";

const router: IRouter = Router();

/* ── Foydalanuvchi Ijro yoki Mehnat mas'ulimi tekshirish ── */
async function isResponsibleUser(userId: number): Promise<boolean> {
  const [u] = await db.select({ employeeId: usersTable.employeeId, fullName: usersTable.fullName })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!u) return false;
  let empId: number | null = u.employeeId ?? null;
  if (empId === null && u.fullName) {
    const [matched] = await db.select({ id: employeesTable.id })
      .from(employeesTable)
      .where(eq(employeesTable.fullName, u.fullName.trim()))
      .limit(1);
    if (matched) empId = matched.id;
  }
  if (empId === null) return false;
  const [emp] = await db
    .select({ ijro: employeesTable.isIjroResponsible, mehnat: employeesTable.isMehnatResponsible })
    .from(employeesTable)
    .where(eq(employeesTable.id, empId))
    .limit(1);
  return !!(emp?.ijro || emp?.mehnat);
}

/* ── Foydalanuvchining hududiga mos xodimlar ID larini olish (baholashlar uchun) ── */
async function getEmployeeIdsForUser(userId: number): Promise<number[]> {
  const [user] = await db
    .select({ viloyat: usersTable.viloyat, tuman: usersTable.tuman })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const allEmployees = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);

  if (!user || !user.viloyat) {
    return allEmployees.map((e) => e.id);
  }

  if (user.tuman) {
    return allEmployees.filter((e) => e.tuman === user.tuman).map((e) => e.id);
  } else {
    const tumanlar = getTumanlarForViloyat(user.viloyat);
    return allEmployees.filter((e) => !e.tuman || tumanlar.includes(e.tuman)).map((e) => e.id);
  }
}

/* ── Ish rejalar uchun: employeeId + userId bo'yicha filtr ── */
// Employee rol foydalanuvchilari userId orqali ish reja yaratadi
async function getPlanScope(adminUserId: number): Promise<{ empIds: number[]; tumanUserIds: number[] }> {
  const [user] = await db
    .select({ viloyat: usersTable.viloyat, tuman: usersTable.tuman })
    .from(usersTable)
    .where(eq(usersTable.id, adminUserId))
    .limit(1);

  const allEmployees = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);
  const allUsers = await db.select({ id: usersTable.id, tuman: usersTable.tuman }).from(usersTable);

  if (!user || !user.viloyat) {
    return {
      empIds: allEmployees.map((e) => e.id),
      tumanUserIds: allUsers.map((u) => u.id),
    };
  }

  if (user.tuman) {
    return {
      empIds: allEmployees.filter((e) => e.tuman === user.tuman).map((e) => e.id),
      tumanUserIds: allUsers.filter((u) => u.tuman === user.tuman).map((u) => u.id),
    };
  } else {
    const tumanlar = getTumanlarForViloyat(user.viloyat);
    return {
      empIds: allEmployees.filter((e) => !e.tuman || tumanlar.includes(e.tuman)).map((e) => e.id),
      tumanUserIds: allUsers.filter((u) => !u.tuman || tumanlar.includes(u.tuman!)).map((u) => u.id),
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   WORK PLANS approval
══════════════════════════════════════════════════════════════ */
router.get("/approve/work-plans", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";
  const isResp = !isAdmin && (await isResponsibleUser(userId));

  if (!isAdmin && !isResp) {
    res.status(403).json({ error: "Faqat admin yoki Ijro/Mehnat mas'uli uchun" });
    return;
  }

  const { status = "pending" } = req.query as { status?: string };

  // Barcha ish rejalarni olish
  const allPlans = await db.select().from(workPlansTable).orderBy(workPlansTable.createdAt);

  let plans;
  if (isAdmin) {
    // Admin — tuman bo'yicha cheklangan ko'rinish
    const { empIds, tumanUserIds } = await getPlanScope(userId);
    plans = allPlans.filter((p) =>
      (p.employeeId != null && empIds.includes(p.employeeId)) ||
      (p.userId != null && tumanUserIds.includes(p.userId))
    );
  } else {
    // Ijro/Mehnat mas'uli (global rol) — barcha tumanlardagi planlarni ko'radi (faqat o'z bo'limini kiritish uchun)
    plans = allPlans;
  }

  const filtered = status === "all"
    ? plans
    : status === "pending"
      ? plans.filter((p) => p.status === "submitted" || p.status === "pending")
      : plans.filter((p) => p.status === status);

  const result = await Promise.all(
    filtered.map(async (plan) => {
      const tasks = await db.select().from(workPlanTasksTable).where(eq(workPlanTasksTable.planId, plan.id)).orderBy(workPlanTasksTable.orderNum);
      // Xodim ma'lumotlari: employeeId orqali yoki userId orqali
      const emp = plan.employeeId
        ? (await db.select().from(employeesTable).where(eq(employeesTable.id, plan.employeeId)).limit(1))[0]
        : undefined;
      const planUser = (!emp && plan.userId)
        ? (await db.select({ fullName: usersTable.fullName, tuman: usersTable.tuman }).from(usersTable).where(eq(usersTable.id, plan.userId)).limit(1))[0]
        : undefined;
      const dept = emp ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, emp.departmentId)).limit(1) : [];
      const approver = plan.approvedById ? await db.select().from(usersTable).where(eq(usersTable.id, plan.approvedById)).limit(1) : [];
      const realTasks = tasks.filter((t) => !t.isSection);
      const taskCount = realTasks.length;
      const overallProgress = taskCount > 0 ? Math.round(realTasks.reduce((s, t) => s + t.completionPercentage, 0) / taskCount) : 0;
      return {
        id: plan.id,
        employeeId: plan.employeeId ?? null,
        userId: plan.userId ?? null,
        employeeName: emp?.fullName ?? planUser?.fullName ?? null,
        employeeTuman: emp?.tuman ?? planUser?.tuman ?? null,
        departmentName: dept[0]?.name ?? null,
        period: plan.period,
        title: plan.title,
        description: plan.description ?? null,
        status: plan.status,
        approvedByName: approver[0]?.fullName ?? null,
        approveComment: plan.approveComment ?? null,
        taskCount,
        overallProgress,
        createdAt: plan.createdAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.put("/approve/work-plans/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Faqat admin uchun" }); return; }
  const id = parseInt(req.params["id"] as string);
  const userId = req.user!.id;
  const { action, comment } = req.body as { action: "approve" | "reject"; comment?: string };

  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "Noto'g'ri amal" });
    return;
  }

  const { empIds, tumanUserIds } = await getPlanScope(userId);

  const [plan] = await db.select().from(workPlansTable).where(eq(workPlansTable.id, id)).limit(1);
  if (!plan) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }

  // Ushbu reja tuman adminiga tegishliligini tekshirish (employeeId yoki userId orqali)
  const belongsToScope =
    (plan.employeeId != null && empIds.includes(plan.employeeId)) ||
    (plan.userId != null && tumanUserIds.includes(plan.userId));
  if (!belongsToScope) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const [updated] = await db
    .update(workPlansTable)
    .set({
      status: newStatus,
      approvedById: userId,
      approveComment: comment ?? null,
    })
    .where(eq(workPlansTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status, approveComment: updated.approveComment });
});

/* ══════════════════════════════════════════════════════════════
   EVALUATIONS approval
══════════════════════════════════════════════════════════════ */
router.get("/approve/evaluations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Faqat admin uchun" }); return; }
  const userId = req.user!.id;
  const { status = "pending" } = req.query as { status?: string };

  const empIds = await getEmployeeIdsForUser(userId);
  if (empIds.length === 0) {
    res.json([]);
    return;
  }

  const evals = await db
    .select()
    .from(evaluationsTable)
    .where(inArray(evaluationsTable.employeeId, empIds))
    .orderBy(evaluationsTable.createdAt);

  const filtered = status === "all" ? evals : evals.filter((e) => e.status === status);

  const result = await Promise.all(
    filtered.map(async (ev) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, ev.employeeId)).limit(1);
      const dept = emp ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, emp.departmentId)).limit(1) : [];
      const [ind] = await db.select().from(kpiIndicatorsTable).where(eq(kpiIndicatorsTable.id, ev.indicatorId)).limit(1);
      const cat = ind ? await db.select().from(kpiCategoriesTable).where(eq(kpiCategoriesTable.id, ind.categoryId)).limit(1) : [];
      const approver = ev.approvedById ? await db.select().from(usersTable).where(eq(usersTable.id, ev.approvedById)).limit(1) : [];
      return {
        id: ev.id,
        employeeId: ev.employeeId,
        employeeName: emp?.fullName ?? null,
        employeeTuman: emp?.tuman ?? null,
        departmentName: dept[0]?.name ?? null,
        indicatorName: ind?.name ?? null,
        categoryName: cat[0]?.name ?? null,
        period: ev.period,
        score: ev.score,
        maxScore: ev.maxScore,
        percent: ev.maxScore > 0 ? Math.round((ev.score / ev.maxScore) * 100) : 0,
        comment: ev.comment ?? null,
        status: ev.status,
        rejectionReason: ev.rejectionReason ?? null,
        approvedByName: approver[0]?.fullName ?? null,
        createdAt: ev.createdAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

router.put("/approve/evaluations/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Faqat admin uchun" }); return; }
  const id = parseInt(req.params["id"] as string);
  const userId = req.user!.id;
  const { action, rejectionReason } = req.body as { action: "approve" | "reject"; rejectionReason?: string };

  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "Noto'g'ri amal" });
    return;
  }

  const empIds = await getEmployeeIdsForUser(userId);

  const [ev] = await db.select().from(evaluationsTable).where(eq(evaluationsTable.id, id)).limit(1);
  if (!ev) { res.status(404).json({ error: "Baholash topilmadi" }); return; }
  if (empIds.length > 0 && !empIds.includes(ev.employeeId)) { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const [updated] = await db
    .update(evaluationsTable)
    .set({
      status: newStatus,
      approvedById: userId,
      rejectionReason: action === "reject" ? (rejectionReason ?? null) : null,
    })
    .where(eq(evaluationsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status, rejectionReason: updated.rejectionReason });
});

/* ══════════════════════════════════════════════════════════════
   EXCEL EXPORT — all data for user's region
══════════════════════════════════════════════════════════════ */
router.get("/approve/export-data", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Faqat admin uchun" }); return; }
  const userId = req.user!.id;
  const { type } = req.query as { type?: string };

  const empIds = await getEmployeeIdsForUser(userId);

  if (type === "work-plans" || !type) {
    if (empIds.length === 0) { res.json([]); return; }
    const plans = await db.select().from(workPlansTable).where(inArray(workPlansTable.employeeId, empIds)).orderBy(workPlansTable.createdAt);
    const result = await Promise.all(plans.map(async (plan) => {
      const emp = plan.employeeId != null
        ? (await db.select().from(employeesTable).where(eq(employeesTable.id, plan.employeeId)).limit(1))[0]
        : undefined;
      const dept = emp && emp.departmentId != null
        ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, emp.departmentId)).limit(1)
        : [];
      return { id: plan.id, employeeName: emp?.fullName ?? "", tuman: emp?.tuman ?? "", departmentName: dept[0]?.name ?? "", period: plan.period, title: plan.title, status: plan.status, createdAt: plan.createdAt.toISOString() };
    }));
    res.json(result);
    return;
  }

  if (type === "evaluations") {
    if (empIds.length === 0) { res.json([]); return; }
    const evals = await db.select().from(evaluationsTable).where(inArray(evaluationsTable.employeeId, empIds)).orderBy(evaluationsTable.createdAt);
    const result = await Promise.all(evals.map(async (ev) => {
      const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, ev.employeeId)).limit(1);
      const dept = emp ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, emp.departmentId)).limit(1) : [];
      const [ind] = await db.select().from(kpiIndicatorsTable).where(eq(kpiIndicatorsTable.id, ev.indicatorId)).limit(1);
      return { id: ev.id, employeeName: emp?.fullName ?? "", tuman: emp?.tuman ?? "", departmentName: dept[0]?.name ?? "", indicatorName: ind?.name ?? "", period: ev.period, score: ev.score, maxScore: ev.maxScore, status: ev.status, createdAt: ev.createdAt.toISOString() };
    }));
    res.json(result);
    return;
  }

  res.status(400).json({ error: "Noto'g'ri tur" });
});

export default router;
