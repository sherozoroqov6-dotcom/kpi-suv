import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { evaluationsTable, employeesTable, departmentsTable, kpiIndicatorsTable, workPlanTasksTable, workPlansTable, mfylarTable, usersTable } from "@workspace/db";
import { count, avg, eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

function filterByPeriod<T extends { period: string }>(
  rows: T[],
  period?: string,
  periodFrom?: string,
  periodTo?: string,
): T[] {
  if (periodFrom && periodTo) {
    return rows.filter((r) => r.period >= periodFrom && r.period <= periodTo);
  }
  if (period) {
    return rows.filter((r) => r.period === period);
  }
  return rows;
}

router.get("/dashboard/summary", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { tuman, tumans, period, periodFrom, periodTo } = req.query as {
    tuman?: string; tumans?: string; period?: string; periodFrom?: string; periodTo?: string;
  };
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const activePeriod = period || currentPeriod;
  const tumanList = tumans ? tumans.split(",").map((t) => t.trim()).filter(Boolean) : null;

  let allEmps = await db.select().from(employeesTable);
  let allDepts = await db.select().from(departmentsTable);
  if (tumanList) {
    allEmps = allEmps.filter((e) => e.tuman && tumanList.includes(e.tuman));
    allDepts = allDepts.filter((d) => d.tuman && tumanList.includes(d.tuman));
  } else if (tuman) {
    allEmps = allEmps.filter((e) => e.tuman === tuman);
    allDepts = allDepts.filter((d) => d.tuman === tuman);
  }
  const empCount = allEmps.length;
  const deptCount = allDepts.length;
  const empIds = new Set(allEmps.map((e) => e.id));
  const [indCount] = await db.select({ cnt: count() }).from(kpiIndicatorsTable);

  let allEvals = await db.select().from(evaluationsTable);
  if (tumanList || tuman) {
    allEvals = allEvals.filter((e) => empIds.has(e.employeeId));
  }

  // Filter by selected period or range
  const periodEvals = filterByPeriod(allEvals, activePeriod, periodFrom, periodTo);

  const avgScore = periodEvals.length > 0
    ? periodEvals.reduce((sum, e) => sum + (e.score / e.maxScore) * 100, 0) / periodEvals.length
    : 0;

  const empScores = new Map<number, number[]>();
  for (const e of periodEvals) {
    const arr = empScores.get(e.employeeId) ?? [];
    arr.push((e.score / e.maxScore) * 100);
    empScores.set(e.employeeId, arr);
  }

  let highPerformers = 0;
  let lowPerformers = 0;
  for (const [, scores] of empScores) {
    const avgVal = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgVal >= 80) highPerformers++;
    else if (avgVal < 60) lowPerformers++;
  }

  res.json({
    totalEmployees: empCount,
    totalDepartments: deptCount,
    totalKpiIndicators: Number(indCount.cnt),
    averageScore: Math.round(avgScore * 10) / 10,
    evaluationsThisMonth: periodEvals.length,
    highPerformers,
    lowPerformers,
    currentPeriod: activePeriod,
  });
});

router.get("/dashboard/top-employees", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { period, limit, tuman, tumans, periodFrom, periodTo } = req.query as {
    period?: string; limit?: string; tuman?: string; tumans?: string; periodFrom?: string; periodTo?: string;
  };
  const limitNum = parseInt(limit ?? "5");
  const tumanList = tumans ? tumans.split(",").map((t) => t.trim()).filter(Boolean) : null;

  let emps = await db.select().from(employeesTable);
  if (tumanList) {
    emps = emps.filter((e) => e.tuman && tumanList.includes(e.tuman));
  } else if (tuman) {
    emps = emps.filter((e) => e.tuman === tuman);
  }
  const allowedEmpIds = new Set(emps.map((e) => e.id));

  let evals = await db.select().from(evaluationsTable);
  if (tuman || tumanList) {
    evals = evals.filter((e) => allowedEmpIds.has(e.employeeId));
  }
  evals = filterByPeriod(evals, period, periodFrom, periodTo);

  const empScores = new Map<number, number[]>();
  for (const e of evals) {
    const arr = empScores.get(e.employeeId) ?? [];
    arr.push((e.score / e.maxScore) * 100);
    empScores.set(e.employeeId, arr);
  }

  const ranked = Array.from(empScores.entries())
    .map(([empId, scores]) => ({
      employeeId: empId,
      avgPct: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => b.avgPct - a.avgPct)
    .slice(0, limitNum);

  const empMap = new Map(emps.map((e) => [e.id, e]));
  const depts = await db.select().from(departmentsTable);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));

  const result = ranked.map((r, idx) => {
    const emp = empMap.get(r.employeeId);
    return {
      employeeId: r.employeeId,
      fullName: emp?.fullName ?? "Noma'lum",
      position: emp?.position ?? "",
      departmentName: emp ? (deptMap.get(emp.departmentId) ?? null) : null,
      averageScore: Math.round(r.avgPct * 10) / 10,
      scorePercentage: Math.round(r.avgPct * 10) / 10,
      rank: idx + 1,
    };
  });

  res.json(result);
});

router.get("/dashboard/department-scores", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { period, tuman, tumans, periodFrom, periodTo } = req.query as {
    period?: string; tuman?: string; tumans?: string; periodFrom?: string; periodTo?: string;
  };
  const tumanList = tumans ? tumans.split(",").map((t) => t.trim()).filter(Boolean) : null;

  let depts = await db.select().from(departmentsTable);
  let emps = await db.select().from(employeesTable);
  if (tumanList) {
    depts = depts.filter((d) => d.tuman && tumanList.includes(d.tuman));
    emps = emps.filter((e) => e.tuman && tumanList.includes(e.tuman));
  } else if (tuman) {
    depts = depts.filter((d) => d.tuman === tuman);
    emps = emps.filter((e) => e.tuman === tuman);
  }
  const allowedEmpIds = new Set(emps.map((e) => e.id));

  let evals = await db.select().from(evaluationsTable);
  if (tuman || tumanList) {
    evals = evals.filter((e) => allowedEmpIds.has(e.employeeId));
  }
  evals = filterByPeriod(evals, period, periodFrom, periodTo);

  const empDeptMap = new Map(emps.map((e) => [e.id, e.departmentId]));
  const deptScoresMap = new Map<number, number[]>();

  for (const ev of evals) {
    const deptId = empDeptMap.get(ev.employeeId);
    if (!deptId) continue;
    const arr = deptScoresMap.get(deptId) ?? [];
    arr.push((ev.score / ev.maxScore) * 100);
    deptScoresMap.set(deptId, arr);
  }

  const deptEmpCount = new Map<number, number>();
  for (const emp of emps) {
    deptEmpCount.set(emp.departmentId, (deptEmpCount.get(emp.departmentId) ?? 0) + 1);
  }

  const result = depts.map((d) => {
    const scores = deptScoresMap.get(d.id) ?? [];
    const avgPct = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      departmentId: d.id,
      departmentName: d.name,
      averageScore: Math.round(avgPct * 10) / 10,
      scorePercentage: Math.round(avgPct * 10) / 10,
      employeeCount: deptEmpCount.get(d.id) ?? 0,
    };
  }).sort((a, b) => b.averageScore - a.averageScore);

  res.json(result);
});

router.get("/dashboard/recent-evaluations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { limit, tuman, tumans, period, periodFrom, periodTo } = req.query as {
    limit?: string; tuman?: string; tumans?: string; period?: string; periodFrom?: string; periodTo?: string;
  };
  const limitNum = parseInt(limit ?? "10");
  const tumanList = tumans ? tumans.split(",").map((t) => t.trim()).filter(Boolean) : null;

  let emps = await db.select().from(employeesTable);
  if (tumanList) {
    emps = emps.filter((e) => e.tuman && tumanList.includes(e.tuman));
  } else if (tuman) {
    emps = emps.filter((e) => e.tuman === tuman);
  }
  const allowedEmpIds = new Set(emps.map((e) => e.id));

  let evRows = await db.select().from(evaluationsTable).orderBy(evaluationsTable.createdAt);
  if (tuman || tumanList) {
    evRows = evRows.filter((e) => allowedEmpIds.has(e.employeeId));
  }
  evRows = filterByPeriod(evRows, period, periodFrom, periodTo);
  evRows = evRows.slice(0, limitNum);

  const empMap = new Map(emps.map((e) => [e.id, e]));
  const depts = await db.select().from(departmentsTable);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));
  const inds = await db.select().from(kpiIndicatorsTable);
  const indMap = new Map(inds.map((i) => [i.id, i]));

  const result = evRows.map((ev) => {
    const emp = empMap.get(ev.employeeId);
    const ind = indMap.get(ev.indicatorId);
    return {
      id: ev.id,
      employeeId: ev.employeeId,
      employeeName: emp?.fullName ?? null,
      departmentName: emp ? (deptMap.get(emp.departmentId) ?? null) : null,
      indicatorId: ev.indicatorId,
      indicatorName: ind?.name ?? null,
      categoryName: null,
      period: ev.period,
      score: ev.score,
      maxScore: ev.maxScore,
      comment: ev.comment ?? null,
      evaluatorId: ev.evaluatorId ?? null,
      evaluatorName: null,
      createdAt: ev.createdAt.toISOString(),
    };
  });

  res.json(result);
});

router.get("/dashboard/monthly-trend", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { year, tuman, tumans } = req.query as { year?: string; tuman?: string; tumans?: string };
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  const tumanList = tumans ? tumans.split(",").map((t) => t.trim()).filter(Boolean) : null;

  let allEmps = await db.select().from(employeesTable);
  if (tumanList) {
    allEmps = allEmps.filter((e) => e.tuman && tumanList.includes(e.tuman));
  } else if (tuman) {
    allEmps = allEmps.filter((e) => e.tuman === tuman);
  }
  const empIds = new Set(allEmps.map((e) => e.id));

  let evals = await db.select().from(evaluationsTable);
  if (tumanList || tuman) {
    evals = evals.filter((e) => empIds.has(e.employeeId));
  }
  evals = evals.filter((e) => e.period && e.period.startsWith(`${targetYear}-`));

  const byMonth = new Map<string, { scores: number[]; count: number }>();
  for (let m = 1; m <= 12; m++) {
    const key = `${targetYear}-${String(m).padStart(2, "0")}`;
    byMonth.set(key, { scores: [], count: 0 });
  }
  for (const ev of evals) {
    const month = ev.period;
    const entry = byMonth.get(month) ?? { scores: [], count: 0 };
    entry.scores.push((ev.score / ev.maxScore) * 100);
    entry.count++;
    byMonth.set(month, entry);
  }

  const MONTH_NAMES = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
  const result = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data], idx) => ({
      month: MONTH_NAMES[idx] ?? month,
      period: month,
      averageScore: data.scores.length > 0
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
        : null,
      evaluationCount: data.count,
    }));

  res.json(result);
});

router.get("/dashboard/workplan-stats", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { tuman, tumans, period, periodFrom, periodTo } = req.query as {
    tuman?: string; tumans?: string; period?: string; periodFrom?: string; periodTo?: string;
  };
  const tumanList = tumans ? tumans.split(",").map((t) => t.trim()).filter(Boolean) : null;

  // Filter employees by tuman/tumanList — tasks belong to plans which belong to employees
  let allEmps = await db.select().from(employeesTable);
  if (tumanList) {
    allEmps = allEmps.filter((e) => e.tuman && tumanList.includes(e.tuman));
  } else if (tuman) {
    allEmps = allEmps.filter((e) => e.tuman === tuman);
  }
  const allowedEmpIds = new Set(allEmps.map((e) => e.id));
  const empTumanMap = new Map(allEmps.map((e) => [e.id, e.tuman ?? "Belgilanmagan"]));
  const empDeptIdMap = new Map(allEmps.map((e) => [e.id, e.departmentId]));

  // Department name lookup
  const allDepts = await db.select().from(departmentsTable);
  const deptNameMap = new Map(allDepts.map((d) => [d.id, d.name]));

  // Tuman/tumanList bo'yicha userId larni ham olish (employee rol foydalanuvchilari)
  let tumanUserIds = new Set<number>();
  if (tuman || tumanList) {
    const allUsers = await db.select({ id: usersTable.id, tuman: usersTable.tuman }).from(usersTable);
    if (tumanList) {
      allUsers.filter((u) => u.tuman && tumanList.includes(u.tuman)).forEach((u) => tumanUserIds.add(u.id));
    } else if (tuman) {
      allUsers.filter((u) => u.tuman === tuman).forEach((u) => tumanUserIds.add(u.id));
    }
  }

  // Get work plans for those employees, then filter by period
  const allPlans = await db.select().from(workPlansTable);
  let filteredPlans = (tuman || tumanList)
    ? allPlans.filter((p) =>
        (p.employeeId != null && allowedEmpIds.has(p.employeeId)) ||
        (p.userId != null && tumanUserIds.has(p.userId))
      )
    : allPlans;

  // Period filter on work plans
  if (periodFrom && periodTo) {
    filteredPlans = filteredPlans.filter((p) => p.period >= periodFrom && p.period <= periodTo);
  } else if (period) {
    filteredPlans = filteredPlans.filter((p) => p.period === period);
  }
  const planIds = new Set(filteredPlans.map((p) => p.id));
  const planEmpMap = new Map(filteredPlans.map((p) => [p.id, p.employeeId]));
  const planUserIdMap = new Map(filteredPlans.map((p) => [p.id, p.userId]));

  // userId orqali ham bo'lim/xodim aniqlash uchun users jadvalini yuklaymiz
  const allUsersForDept = await db.select({ id: usersTable.id, employeeId: usersTable.employeeId, departmentId: usersTable.departmentId }).from(usersTable);
  const userEmpIdMap = new Map(allUsersForDept.map((u) => [u.id, u.employeeId]));
  const userDeptIdMap = new Map(allUsersForDept.map((u) => [u.id, u.departmentId]));

  // Get all non-section tasks for those plans
  const allTasks = await db.select().from(workPlanTasksTable);
  const relevantTasks = allTasks.filter((t) => !t.isSection && planIds.has(t.planId));

  const total = relevantTasks.length;
  const completed = relevantTasks.filter((t) => t.status === "completed").length;
  const inProgress = relevantTasks.filter((t) => t.status === "in_progress").length;
  const pending = relevantTasks.filter((t) => t.status === "pending").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // byMfy — breakdown by MFY (task.location) for specific tuman view
  const byMfyMap: Record<string, { total: number; completed: number; name: string }> = {};
  for (const task of relevantTasks) {
    const loc = task.location || "Belgilanmagan";
    if (!byMfyMap[loc]) byMfyMap[loc] = { total: 0, completed: 0, name: loc };
    byMfyMap[loc].total++;
    if (task.status === "completed") byMfyMap[loc].completed++;
  }
  const byMfyList = Object.values(byMfyMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((m) => ({
      name: m.name,
      total: m.total,
      completed: m.completed,
      rate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
    }));

  // byDepartment — breakdown by department when a specific tuman is selected
  let byDepartmentList: { name: string; total: number; completed: number; inProgress: number; pending: number; rate: number }[] = [];
  if (tuman) {
    const byDeptMap: Record<string, { name: string; total: number; completed: number; inProgress: number; pending: number }> = {};
    const resolveDeptId = (planId: number): number | null | undefined => {
      // 1. Plan.employeeId orqali
      const empId = planEmpMap.get(planId);
      if (empId != null) {
        const d = empDeptIdMap.get(empId);
        if (d != null) return d;
      }
      // 2. Plan.userId → user.employeeId orqali
      const uid = planUserIdMap.get(planId);
      if (uid != null) {
        const userEmpId = userEmpIdMap.get(uid);
        if (userEmpId != null) {
          const d = empDeptIdMap.get(userEmpId);
          if (d != null) return d;
        }
        // 3. Plan.userId → user.departmentId orqali
        const ud = userDeptIdMap.get(uid);
        if (ud != null) return ud;
      }
      return undefined;
    };

    for (const task of relevantTasks) {
      const deptId = resolveDeptId(task.planId);
      const deptName = (deptId && deptNameMap.get(deptId)) || "Belgilanmagan";
      if (!byDeptMap[deptName]) byDeptMap[deptName] = { name: deptName, total: 0, completed: 0, inProgress: 0, pending: 0 };
      byDeptMap[deptName].total++;
      if (task.status === "completed")    byDeptMap[deptName].completed++;
      else if (task.status === "in_progress") byDeptMap[deptName].inProgress++;
      else byDeptMap[deptName].pending++;
    }
    byDepartmentList = Object.values(byDeptMap)
      .sort((a, b) => b.total - a.total)
      .map((d) => ({
        name: d.name,
        total: d.total,
        completed: d.completed,
        inProgress: d.inProgress,
        pending: d.pending,
        rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      }));
  }

  // byTuman — breakdown via plan → employee → tuman chain (reliable even without task.location)
  let byTumanList: { name: string; total: number; completed: number; inProgress: number; pending: number; rate: number }[] = [];
  if (!tuman) {
    const byTumanMap: Record<string, { name: string; total: number; completed: number; inProgress: number; pending: number }> = {};
    for (const task of relevantTasks) {
      const empId = planEmpMap.get(task.planId);
      const tumanName = (empId && empTumanMap.get(empId)) || "Belgilanmagan";
      if (!byTumanMap[tumanName]) byTumanMap[tumanName] = { name: tumanName, total: 0, completed: 0, inProgress: 0, pending: 0 };
      byTumanMap[tumanName].total++;
      if (task.status === "completed")  byTumanMap[tumanName].completed++;
      else if (task.status === "in_progress") byTumanMap[tumanName].inProgress++;
      else byTumanMap[tumanName].pending++;
    }
    byTumanList = Object.values(byTumanMap)
      .sort((a, b) => b.total - a.total)
      .map((m) => ({
        name: m.name,
        total: m.total,
        completed: m.completed,
        inProgress: m.inProgress,
        pending: m.pending,
        rate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
      }));
  }

  // byCoExecutor — KPI breakdown by responsiblePerson (birgalikda bajaradigan ijrochi)
  // responsiblePerson may contain comma-separated multiple names
  const empNameMap = new Map(allEmps.map((e) => [e.fullName.toLowerCase().trim(), e]));
  const byCoExecMap: Record<string, { name: string; total: number; completed: number; inProgress: number; pending: number }> = {};
  for (const task of relevantTasks) {
    if (!task.responsiblePerson) continue;
    const names = task.responsiblePerson.split(",").map((n) => n.trim()).filter(Boolean);
    for (const name of names) {
      if (!byCoExecMap[name]) byCoExecMap[name] = { name, total: 0, completed: 0, inProgress: 0, pending: 0 };
      byCoExecMap[name].total++;
      if (task.status === "completed")       byCoExecMap[name].completed++;
      else if (task.status === "in_progress") byCoExecMap[name].inProgress++;
      else byCoExecMap[name].pending++;
    }
  }
  const byCoExecutorList = Object.values(byCoExecMap)
    .sort((a, b) => b.completed - a.completed || b.total - a.total)
    .map((c) => {
      const emp = empNameMap.get(c.name.toLowerCase().trim());
      return {
        name: c.name,
        employeeId: emp?.id ?? null,
        total: c.total,
        completed: c.completed,
        inProgress: c.inProgress,
        pending: c.pending,
        rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
      };
    });

  res.json({
    total, completed, inProgress, pending, completionRate,
    byMfy: byMfyList,
    byTuman: byTumanList,
    byDepartment: byDepartmentList,
    byCoExecutor: byCoExecutorList,
    tuman: tuman || null,
  });
});

export default router;
