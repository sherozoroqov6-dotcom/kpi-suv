import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, employeesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { createSession, deleteSession } from "../lib/session.js";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Foydalanuvchi nomi va parol kiritilishi shart" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);

  if (users.length === 0 || users[0].password !== password) {
    res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    return;
  }

  const user = users[0];
  const token = await createSession({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    departmentId: user.departmentId ?? null,
  });

  res.cookie("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    message: "Muvaffaqiyatli kirildi",
  });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.["session_token"] as string | undefined;
  if (token) {
    await deleteSession(token);
  }
  res.clearCookie("session_token", { path: "/" });
  res.json({ message: "Muvaffaqiyatli chiqildi" });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const dbUsers = await db
    .select({
      viloyat: usersTable.viloyat,
      tuman: usersTable.tuman,
      employeeId: usersTable.employeeId,
      fullName: usersTable.fullName,
    })
    .from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  const extra = dbUsers[0] ?? {};

  let employeeId: number | null = extra.employeeId ?? null;

  // Agar employee_id bog'lanmagan bo'lsa — full_name bo'yicha employees jadvalida qidirish
  // (admin/manager bo'lmagan barcha rollar uchun, faqat employee emas)
  if (employeeId === null && user.role !== "admin" && user.role !== "manager" && extra.fullName) {
    const matched = await db
      .select({ id: employeesTable.id })
      .from(employeesTable)
      .where(ilike(employeesTable.fullName, extra.fullName.trim()))
      .limit(1);
    if (matched[0]) {
      employeeId = matched[0].id;
      // Kelajakdagi tezkor qidirish uchun users jadvaliga yozib qo'yamiz
      await db.update(usersTable).set({ employeeId: matched[0].id }).where(eq(usersTable.id, user.id));
    }
  }

  // Joriy foydalanuvchi Ijro.gov / Mehnat mas'ulimi?
  let isIjroResponsible = false;
  let isMehnatResponsible = false;
  if (employeeId !== null) {
    const [empFlag] = await db
      .select({
        isIjroResponsible: employeesTable.isIjroResponsible,
        isMehnatResponsible: employeesTable.isMehnatResponsible,
      })
      .from(employeesTable)
      .where(eq(employeesTable.id, employeeId))
      .limit(1);
    isIjroResponsible = !!empFlag?.isIjroResponsible;
    isMehnatResponsible = !!empFlag?.isMehnatResponsible;
  }

  res.json({
    id: user.id,
    username: user.username,
    fullName: extra.fullName ?? user.fullName,
    role: user.role,
    departmentId: user.departmentId ?? null,
    employeeId,
    isIjroResponsible,
    isMehnatResponsible,
    viloyat: extra.viloyat ?? null,
    tuman: extra.tuman ?? null,
    createdAt: new Date().toISOString(),
  });
});

export default router;
