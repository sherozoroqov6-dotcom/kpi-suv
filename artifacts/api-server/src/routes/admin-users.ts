import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

const SUPER_USER = "5279606";

function requireSuperUser(req: AuthenticatedRequest, res: Response, next: any) {
  if (req.user?.username !== SUPER_USER) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  next();
}

router.get("/admin/users", requireAuth, requireSuperUser, async (req: AuthenticatedRequest, res: Response) => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      role: usersTable.role,
      viloyat: usersTable.viloyat,
      tuman: usersTable.tuman,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.id);
  res.json(users);
});

router.post("/admin/users", requireAuth, requireSuperUser, async (req: AuthenticatedRequest, res: Response) => {
  const { username, password, fullName, role, viloyat, tuman, employeeId } = req.body as {
    username?: string;
    password?: string;
    fullName?: string;
    role?: string;
    viloyat?: string;
    tuman?: string;
    employeeId?: number | null;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Login va parol kiritilishi shart" });
    return;
  }
  if (!viloyat) {
    res.status(400).json({ error: "Viloyat tanlanishi shart" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Bu login allaqachon mavjud" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      password,
      fullName: fullName || username,
      role: (role as any) || "employee",
      viloyat: viloyat || null,
      tuman: tuman || null,
      employeeId: employeeId || null,
    })
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      role: usersTable.role,
      viloyat: usersTable.viloyat,
      tuman: usersTable.tuman,
      createdAt: usersTable.createdAt,
    });

  res.status(201).json(user);
});

router.put("/admin/users/:id", requireAuth, requireSuperUser, async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);
  const { password, fullName, role, viloyat, tuman, employeeId } = req.body as {
    password?: string;
    fullName?: string;
    role?: string;
    viloyat?: string;
    tuman?: string;
    employeeId?: number | null;
  };

  const updates: any = {};
  if (password) updates.password = password;
  if (fullName !== undefined) updates.fullName = fullName;
  if (role) updates.role = role;
  if (viloyat !== undefined) updates.viloyat = viloyat || null;
  updates.tuman = tuman || null;
  updates.employeeId = employeeId || null;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      role: usersTable.role,
      viloyat: usersTable.viloyat,
      tuman: usersTable.tuman,
    });

  if (!user) {
    res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    return;
  }
  res.json(user);
});

router.delete("/admin/users/:id", requireAuth, requireSuperUser, async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id);

  const target = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (target.length === 0) {
    res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    return;
  }
  if (target[0].username === SUPER_USER) {
    res.status(403).json({ error: "Bu foydalanuvchini o'chirib bo'lmaydi" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "Foydalanuvchi o'chirildi" });
});

export default router;
