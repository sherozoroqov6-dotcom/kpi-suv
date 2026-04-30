import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { workPlansTable, workPlanTasksTable, employeesTable, departmentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

function mapTask(t: typeof workPlanTasksTable.$inferSelect) {
  return {
    id: t.id,
    planId: t.planId,
    orderNum: t.orderNum,
    isSection: t.isSection,
    title: t.title,
    implementationMechanism: t.implementationMechanism ?? null,
    fundingSource: t.fundingSource ?? null,
    unitOfMeasure: t.unitOfMeasure ?? null,
    plannedVolume: t.plannedVolume ?? null,
    actualVolume: t.actualVolume ?? null,
    completionPercentage: t.completionPercentage,
    responsiblePerson: t.responsiblePerson ?? null,
    location: t.location ?? null,
    controller: t.controller ?? null,
    startDate: t.startDate ?? null,
    deadline: t.deadline ?? null,
    expectedResult: t.expectedResult ?? null,
    actualResult: t.actualResult ?? null,
    status: t.status,
    pdfUrl: t.pdfUrl ?? null,
    category: t.category ?? null,
    ijroLate: t.ijroLate ?? null,
    ijroUnexecuted: t.ijroUnexecuted ?? null,
    mehnatWorkHours: t.mehnatWorkHours ?? null,
    mehnatLateMinutes: t.mehnatLateMinutes ?? null,
    mehnatLateDays: t.mehnatLateDays ?? null,
    mehnatResult: t.mehnatResult ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

async function enrichPlan(plan: typeof workPlansTable.$inferSelect) {
  let tasks = await db
    .select()
    .from(workPlanTasksTable)
    .where(eq(workPlanTasksTable.planId, plan.id))
    .orderBy(workPlanTasksTable.orderNum, workPlanTasksTable.createdAt);

  // Employee ma'lumotlari (agar employeeId bo'lsa)
  const emp = plan.employeeId
    ? (await db.select().from(employeesTable).where(eq(employeesTable.id, plan.employeeId)).limit(1))[0]
    : undefined;

  // Tizimda Ijro mas'uli mavjudmi (mehnat va ijro avto-vazifalari uchun zarur)
  const responsible = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.isIjroResponsible, true), eq(employeesTable.status, "active")))
    .limit(1);
  const hasResponsible = responsible.length > 0;

  // Ijro intizomi avto-vazifasi: agar tizimda Ijro mas'uli bor bo'lsa va shu rejaning
  // xodimi mas'ul tomonidan tanlangan (isIjroAssigned=true) bo'lsa — yaratamiz.
  const ijroEligible = !!(emp && !emp.isIjroResponsible && emp.isIjroAssigned && hasResponsible);
  if (ijroEligible && !tasks.some((t) => t.category === "ijro")) {
    await db.insert(workPlanTasksTable).values({
      planId: plan.id,
      orderNum: 0,
      isSection: false,
      title: "Ijro intizomi bo'yicha kelib tushgan xat-hujjatlar",
      unitOfMeasure: "dona",
      category: "ijro",
      status: "pending",
    });
    tasks = await db
      .select()
      .from(workPlanTasksTable)
      .where(eq(workPlanTasksTable.planId, plan.id))
      .orderBy(workPlanTasksTable.orderNum, workPlanTasksTable.createdAt);
  }

  // Mehnat intizomi avto-vazifasi: tizimda Ijro mas'uli mavjud bo'lsa, qolgan barcha
  // xodimlarga (Ijro mas'ulining o'zidan tashqari) avto-vazifa qo'shamiz.
  const mehnatEligible = !!(emp && !emp.isIjroResponsible && hasResponsible);
  if (mehnatEligible && !tasks.some((t) => t.category === "mehnat")) {
    await db.insert(workPlanTasksTable).values({
      planId: plan.id,
      orderNum: 1,
      isSection: false,
      title: "Mehnat intizomi (avto-vazifa)",
      unitOfMeasure: "soat",
      category: "mehnat",
      status: "pending",
    });
    tasks = await db
      .select()
      .from(workPlanTasksTable)
      .where(eq(workPlanTasksTable.planId, plan.id))
      .orderBy(workPlanTasksTable.orderNum, workPlanTasksTable.createdAt);
  }

  // Agar shartlar bajarilmasa, tegishli avto-vazifalarni javobdan filtrlaymiz
  // (DB'dagi ma'lumot saqlanadi — keyinchalik qaytadi).
  if (!ijroEligible)   tasks = tasks.filter((t) => t.category !== "ijro");
  if (!mehnatEligible) tasks = tasks.filter((t) => t.category !== "mehnat");
  const dept = emp
    ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, emp.departmentId)).limit(1)
    : [];
  // Agar employeeId yo'q bo'lsa, userId orqali user ma'lumotlarini olamiz
  const planUser = (!emp && plan.userId)
    ? (await db.select({ fullName: usersTable.fullName, tuman: usersTable.tuman }).from(usersTable).where(eq(usersTable.id, plan.userId)).limit(1))[0]
    : undefined;

  const approver = plan.approvedById
    ? await db.select().from(usersTable).where(eq(usersTable.id, plan.approvedById)).limit(1)
    : [];

  // Tasdiqlovchining lavozimini olish (employeeId orqali)
  const approverEmp = approver[0]?.employeeId
    ? (await db.select({ position: employeesTable.position }).from(employeesTable).where(eq(employeesTable.id, approver[0].employeeId)).limit(1))[0]
    : undefined;

  const realTasks = tasks.filter((t) => !t.isSection);
  const taskCount = realTasks.length;
  const completedTaskCount = realTasks.filter((t) => t.status === "completed").length;
  const overallProgress =
    taskCount > 0
      ? Math.round(realTasks.reduce((sum, t) => sum + t.completionPercentage, 0) / taskCount)
      : 0;

  const hasPdf = realTasks.some((t) => !!t.pdfUrl);

  return {
    id: plan.id,
    employeeId: plan.employeeId ?? null,
    userId: plan.userId ?? null,
    employeeName: emp?.fullName ?? planUser?.fullName ?? null,
    employeePosition: emp?.position ?? null,
    departmentName: dept[0]?.name ?? null,
    period: plan.period,
    title: plan.title,
    description: plan.description ?? null,
    status: plan.status,
    approvedById: plan.approvedById ?? null,
    approvedByName: approver[0]?.fullName ?? null,
    approvedByPosition: approverEmp?.position ?? null,
    approveComment: plan.approveComment ?? null,
    approvedAt: plan.approvedAt ? plan.approvedAt.toISOString() : null,
    tasks: tasks.map(mapTask),
    taskCount,
    completedTaskCount,
    overallProgress,
    hasPdf,
    createdAt: plan.createdAt.toISOString(),
  };
}

router.get("/work-plans", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { employeeId, period, departmentId, status, tuman, tumans } = req.query as Record<string, string | undefined>;

  const [userExt] = await db.select({ employeeId: usersTable.employeeId, tuman: usersTable.tuman })
    .from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  const isAdmin = req.user!.role === "admin";
  const userTuman = userExt?.tuman ?? null;

  let plans = await db.select().from(workPlansTable).orderBy(workPlansTable.createdAt);

  if (!isAdmin) {
    // Oddiy xodim: faqat o'z ish rejalarini ko'radi
    const currentUserId = req.user!.id;
    if (userExt?.employeeId) {
      plans = plans.filter((p) => p.userId === currentUserId || p.employeeId === userExt.employeeId);
    } else {
      plans = plans.filter((p) => p.userId === currentUserId);
    }
  } else if (userTuman) {
    // Tuman admini: FAQAT o'z tumaniga tegishli rejalarni ko'radi
    const allEmps = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);
    const empIds = new Set(allEmps.filter((e) => e.tuman === userTuman).map((e) => e.id));
    const tumanUsers = await db.select({ id: usersTable.id, tuman: usersTable.tuman }).from(usersTable);
    const tumanUserIds = new Set(tumanUsers.filter(u => u.tuman === userTuman).map(u => u.id));
    plans = plans.filter((p) => (p.userId && tumanUserIds.has(p.userId)) || (p.employeeId && empIds.has(p.employeeId)));
    if (employeeId) plans = plans.filter((p) => p.employeeId === parseInt(employeeId));
  } else {
    // Super admin (tuman yo'q): barcha rejalarni ko'radi, ixtiyoriy filtrlar bilan
    if (employeeId) plans = plans.filter((p) => p.employeeId === parseInt(employeeId));
    if (tumans) {
      const tumanList = tumans.split(",").map((t) => t.trim()).filter(Boolean);
      const tumanUsers = await db.select({ id: usersTable.id, tuman: usersTable.tuman }).from(usersTable);
      const tumanUserIds = new Set(tumanUsers.filter(u => u.tuman && tumanList.includes(u.tuman!)).map(u => u.id));
      const allEmps = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);
      const empIds = new Set(allEmps.filter((e) => e.tuman && tumanList.includes(e.tuman)).map((e) => e.id));
      plans = plans.filter((p) => (p.userId && tumanUserIds.has(p.userId)) || (p.employeeId && empIds.has(p.employeeId)));
    } else if (tuman) {
      const allEmps = await db.select({ id: employeesTable.id, tuman: employeesTable.tuman }).from(employeesTable);
      const empIds = new Set(allEmps.filter((e) => e.tuman === tuman).map((e) => e.id));
      const tumanUsers = await db.select({ id: usersTable.id, tuman: usersTable.tuman }).from(usersTable);
      const tumanUserIds = new Set(tumanUsers.filter(u => u.tuman === tuman).map(u => u.id));
      plans = plans.filter((p) => (p.userId && tumanUserIds.has(p.userId)) || (p.employeeId && empIds.has(p.employeeId)));
    }
  }

  if (period) plans = plans.filter((p) => p.period === period);
  if (status) plans = plans.filter((p) => p.status === status);
  if (departmentId) {
    const deptId = parseInt(departmentId);
    const empsInDept = await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.departmentId, deptId));
    const empIds = new Set(empsInDept.map((e) => e.id));
    plans = plans.filter((p) => p.employeeId && empIds.has(p.employeeId));
  }

  const result = await Promise.all(plans.map(enrichPlan));
  res.json(result);
});

type TaskInput = {
  orderNum?: number; isSection?: boolean; title: string;
  implementationMechanism?: string | null; fundingSource?: string | null;
  unitOfMeasure?: string | null; plannedVolume?: string | null; actualVolume?: string | null;
  completionPercentage?: number; responsiblePerson?: string | null; location?: string | null; controller?: string | null;
  startDate?: string | null; deadline?: string | null;
  expectedResult?: string | null; actualResult?: string | null; status?: string;
};

function buildTaskValues(planId: number, t: TaskInput, i: number) {
  return {
    planId,
    orderNum: t.orderNum ?? i + 1,
    isSection: t.isSection ?? false,
    title: t.title,
    implementationMechanism: t.implementationMechanism ?? null,
    fundingSource: t.fundingSource ?? null,
    unitOfMeasure: t.unitOfMeasure ?? null,
    plannedVolume: t.plannedVolume ?? null,
    actualVolume: t.actualVolume ?? null,
    completionPercentage: t.completionPercentage ?? 0,
    responsiblePerson: t.responsiblePerson ?? null,
    location: t.location ?? null,
    controller: t.controller ?? null,
    startDate: t.startDate ?? null,
    deadline: t.deadline ?? null,
    expectedResult: t.expectedResult ?? null,
    actualResult: t.actualResult ?? null,
    status: t.status ?? "pending",
  };
}

router.post("/work-plans", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { employeeId: bodyEmployeeId, period, title, description, tasks } = req.body as {
    employeeId?: number; period?: string; title?: string;
    description?: string | null; tasks?: TaskInput[];
  };

  if (!period || !title) {
    res.status(400).json({ error: "Davr va sarlavha kiritilishi shart" }); return;
  }

  const currentUserId = req.user!.id;
  // employeeId: agar body da kelsa yoki user yozuvida bo'lsa ishlatiladi, aks holda null
  let employeeId: number | null = bodyEmployeeId ?? null;
  if (!employeeId) {
    const [userExt] = await db.select({ employeeId: usersTable.employeeId })
      .from(usersTable).where(eq(usersTable.id, currentUserId)).limit(1);
    employeeId = userExt?.employeeId ?? null;
  }

  const [plan] = await db.insert(workPlansTable).values({
    employeeId: employeeId ?? undefined,
    userId: currentUserId,
    period,
    title,
    description: description ?? null,
    status: "draft",
  }).returning();

  if (tasks && tasks.length > 0) {
    await db.insert(workPlanTasksTable).values(tasks.map((t, i) => buildTaskValues(plan.id, t, i)));
  }

  res.status(201).json(await enrichPlan(plan));
});

router.get("/work-plans/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const plans = await db.select().from(workPlansTable).where(eq(workPlansTable.id, id)).limit(1);
  if (plans.length === 0) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  res.json(await enrichPlan(plans[0]));
});

router.put("/work-plans/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const existing = await db.select({ status: workPlansTable.status }).from(workPlansTable).where(eq(workPlansTable.id, id)).limit(1);
  if (existing.length === 0) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  if (existing[0].status !== "draft") { res.status(403).json({ error: "Imzolashga yuborilgan ish rejani tahrirlash mumkin emas" }); return; }
  const { employeeId, period, title, description } = req.body as { employeeId?: number; period?: string; title?: string; description?: string | null };
  if (!employeeId || !period || !title) { res.status(400).json({ error: "Majburiy maydonlar" }); return; }
  const [plan] = await db.update(workPlansTable).set({ employeeId, period, title, description: description ?? null }).where(eq(workPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  res.json(await enrichPlan(plan));
});

router.delete("/work-plans/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  await db.delete(workPlanTasksTable).where(eq(workPlanTasksTable.planId, id));
  const deleted = await db.delete(workPlansTable).where(eq(workPlansTable.id, id)).returning();
  if (deleted.length === 0) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  res.json({ message: "Ish reja o'chirildi" });
});

router.post("/work-plans/:id/submit", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const [plan] = await db.update(workPlansTable).set({ status: "submitted", approvedById: null, approveComment: null }).where(eq(workPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  res.json(await enrichPlan(plan));
});

router.post("/work-plans/:id/approve", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const { comment } = req.body as { comment?: string | null };
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Ruxsat yo'q" }); return; }

  // Tuman admini faqat o'z tumaniga tegishli rejani tasdiqlashi mumkin
  const [approverExt] = await db.select({ tuman: usersTable.tuman }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  if (approverExt?.tuman) {
    const [existing] = await db.select({ userId: workPlansTable.userId, employeeId: workPlansTable.employeeId }).from(workPlansTable).where(eq(workPlansTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
    // Ushbu reja tuman admini tumaniga tegishliligini tekshirish
    let belongsToTuman = false;
    if (existing.userId) {
      const [planUser] = await db.select({ tuman: usersTable.tuman }).from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
      if (planUser?.tuman === approverExt.tuman) belongsToTuman = true;
    }
    if (!belongsToTuman && existing.employeeId) {
      const [planEmp] = await db.select({ tuman: employeesTable.tuman }).from(employeesTable).where(eq(employeesTable.id, existing.employeeId)).limit(1);
      if (planEmp?.tuman === approverExt.tuman) belongsToTuman = true;
    }
    if (!belongsToTuman) { res.status(403).json({ error: "Siz bu tumanning rejasini tasdiqlashga vakolatli emassiz" }); return; }
  }

  const [plan] = await db.update(workPlansTable).set({ status: "approved", approvedById: req.user?.id ?? null, approveComment: comment ?? null, approvedAt: new Date() }).where(eq(workPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  res.json(await enrichPlan(plan));
});

router.get("/work-plans/:id/tasks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const planId = parseInt(req.params["id"] as string);
  const tasks = await db.select().from(workPlanTasksTable).where(eq(workPlanTasksTable.planId, planId)).orderBy(workPlanTasksTable.orderNum, workPlanTasksTable.createdAt);
  res.json(tasks.map(mapTask));
});

router.post("/work-plans/:id/tasks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const planId = parseInt(req.params["id"] as string);
  const planCheck = await db.select({ status: workPlansTable.status }).from(workPlansTable).where(eq(workPlansTable.id, planId)).limit(1);
  if (planCheck.length === 0) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  if (planCheck[0].status !== "draft" && planCheck[0].status !== "rejected") { res.status(403).json({ error: "Bu ish rejani tahrirlash mumkin emas" }); return; }
  const t = req.body as TaskInput;
  if (!t.title) { res.status(400).json({ error: "Sarlavha kiritilishi shart" }); return; }
  const existing = await db.select({ id: workPlanTasksTable.id }).from(workPlanTasksTable).where(eq(workPlanTasksTable.planId, planId));
  const [task] = await db.insert(workPlanTasksTable).values(buildTaskValues(planId, t, existing.length)).returning();
  res.status(201).json(mapTask(task));
});

router.put("/work-plans/:id/tasks/:taskId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const planId = parseInt(req.params["id"] as string);
  const planCheck = await db.select({ status: workPlansTable.status }).from(workPlansTable).where(eq(workPlansTable.id, planId)).limit(1);
  if (planCheck.length === 0) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  if (planCheck[0].status !== "draft" && planCheck[0].status !== "rejected") { res.status(403).json({ error: "Bu ish rejani tahrirlash mumkin emas" }); return; }
  const taskId = parseInt(req.params["taskId"] as string);
  const t = req.body as TaskInput;
  if (!t.title) { res.status(400).json({ error: "Sarlavha kiritilishi shart" }); return; }
  const [task] = await db.update(workPlanTasksTable).set({
    orderNum: t.orderNum ?? 1,
    isSection: t.isSection ?? false,
    title: t.title,
    implementationMechanism: t.implementationMechanism ?? null,
    fundingSource: t.fundingSource ?? null,
    unitOfMeasure: t.unitOfMeasure ?? null,
    plannedVolume: t.plannedVolume ?? null,
    actualVolume: t.actualVolume ?? null,
    completionPercentage: t.completionPercentage ?? 0,
    responsiblePerson: t.responsiblePerson ?? null,
    location: t.location ?? null,
    controller: t.controller ?? null,
    startDate: t.startDate ?? null,
    deadline: t.deadline ?? null,
    expectedResult: t.expectedResult ?? null,
    actualResult: t.actualResult ?? null,
    status: t.status ?? "pending",
  }).where(eq(workPlanTasksTable.id, taskId)).returning();
  if (!task) { res.status(404).json({ error: "Vazifa topilmadi" }); return; }
  res.json(mapTask(task));
});

router.delete("/work-plans/:id/tasks/:taskId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const planId = parseInt(req.params["id"] as string);
  const planCheck = await db.select({ status: workPlansTable.status }).from(workPlansTable).where(eq(workPlansTable.id, planId)).limit(1);
  if (planCheck.length === 0) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }
  if (planCheck[0].status !== "draft" && planCheck[0].status !== "rejected") { res.status(403).json({ error: "Bu ish rejani tahrirlash mumkin emas" }); return; }
  const taskId = parseInt(req.params["taskId"] as string);
  const deleted = await db.delete(workPlanTasksTable).where(eq(workPlanTasksTable.id, taskId)).returning();
  if (deleted.length === 0) { res.status(404).json({ error: "Vazifa topilmadi" }); return; }
  res.json({ message: "Vazifa o'chirildi" });
});

export default router;
