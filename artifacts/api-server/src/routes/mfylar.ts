import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { mfylarTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/mfylar", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { tuman, tumans, viloyat } = req.query as { tuman?: string; tumans?: string; viloyat?: string };

  const rows = await db.select().from(mfylarTable).orderBy(asc(mfylarTable.id));

  let filtered = rows;
  if (tumans) {
    const tumanList = tumans.split(",").map((t) => t.trim()).filter(Boolean);
    if (tumanList.length > 0) {
      filtered = filtered.filter((r) => tumanList.includes(r.tuman));
    }
  } else if (tuman) {
    filtered = filtered.filter((r) => r.tuman === tuman);
  }
  if (viloyat) {
    filtered = filtered.filter((r) => r.viloyat === viloyat);
  }

  res.json(filtered);
});

router.post("/mfylar", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, tuman, viloyat } = req.body as { name?: string; tuman?: string; viloyat?: string };

  if (!name || !name.trim()) {
    res.status(400).json({ error: "MFY nomi kiritilishi shart" });
    return;
  }

  const [row] = await db
    .insert(mfylarTable)
    .values({
      name: name.trim(),
      tuman: tuman?.trim() || "Kattaqo'rg'on tumani",
      viloyat: viloyat?.trim() || "samarqand",
      active: true,
    })
    .returning();

  res.status(201).json(row);
});

router.put("/mfylar/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const { name, tuman, viloyat, active } = req.body as {
    name?: string;
    tuman?: string;
    viloyat?: string;
    active?: boolean;
  };

  if (!name || !name.trim()) {
    res.status(400).json({ error: "MFY nomi kiritilishi shart" });
    return;
  }

  const [row] = await db
    .update(mfylarTable)
    .set({
      name: name.trim(),
      tuman: tuman?.trim() || "Kattaqo'rg'on tumani",
      viloyat: viloyat?.trim() || "samarqand",
      active: active !== undefined ? active : true,
    })
    .where(eq(mfylarTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "MFY topilmadi" });
    return;
  }

  res.json(row);
});

router.delete("/mfylar/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const deleted = await db.delete(mfylarTable).where(eq(mfylarTable.id, id)).returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "MFY topilmadi" });
    return;
  }

  res.json({ message: "MFY o'chirildi" });
});

export default router;
