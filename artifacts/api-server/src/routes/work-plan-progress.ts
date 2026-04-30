import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { workPlanTasksTable, workPlansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../public/uploads/pdfs");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Faqat PDF formatdagi fayllar qabul qilinadi"));
    }
  },
});

const router: IRouter = Router();

// ─── POST /work-plans/upload-pdf ────────────────────────────────────────────
router.post(
  "/work-plans/upload-pdf",
  requireAuth,
  upload.single("pdf"),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "Fayl yuborilmadi" });
      return;
    }
    const url = `/api/uploads/pdfs/${req.file.filename}`;
    res.json({ url, originalName: req.file.originalname, size: req.file.size });
  },
);

// ─── PATCH /work-plans/:planId/tasks/:taskId/progress ───────────────────────
// Updates task completion data without requiring draft status
router.patch(
  "/work-plans/:planId/tasks/:taskId/progress",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const planId = parseInt(req.params["planId"] as string);
    const taskId = parseInt(req.params["taskId"] as string);

    if (isNaN(planId) || isNaN(taskId)) {
      res.status(400).json({ error: "Noto'g'ri ID" }); return;
    }

    // Verify plan exists (no status restriction — allows approved plans)
    const [plan] = await db.select().from(workPlansTable).where(eq(workPlansTable.id, planId)).limit(1);
    if (!plan) { res.status(404).json({ error: "Ish reja topilmadi" }); return; }

    // Get current task to check existing pdfUrl for PDF requirement enforcement
    const [currentTask] = await db
      .select()
      .from(workPlanTasksTable)
      .where(and(eq(workPlanTasksTable.id, taskId), eq(workPlanTasksTable.planId, planId)))
      .limit(1);
    if (!currentTask) { res.status(404).json({ error: "Vazifa topilmadi" }); return; }

    const isAdminOrManager = req.user!.role === "admin" || req.user!.role === "manager";
    const isIjroTask = currentTask.category === "ijro";

    const { actualVolume, completionPercentage, status, pdfUrl, actualResult, plannedVolume, ijroLate, ijroUnexecuted } = req.body as {
      actualVolume?: string | null;
      completionPercentage?: number;
      status?: string;
      pdfUrl?: string | null;
      actualResult?: string | null;
      plannedVolume?: string | null;
      ijroLate?: number | null;
      ijroUnexecuted?: number | null;
    };

    // Rule 1: Non-admin users must attach a PDF when reporting actualVolume
    // (Ijro vazifasi uchun PDF talab qilinmaydi — bu oylik statistika)
    if (!isIjroTask && !isAdminOrManager && actualVolume !== undefined && actualVolume !== null && actualVolume !== "") {
      const incomingPdf = pdfUrl !== undefined && pdfUrl !== null && pdfUrl !== "";
      const existingPdf = !!currentTask.pdfUrl;
      if (!incomingPdf && !existingPdf) {
        res.status(400).json({ error: "PDF fayl yuklash majburiy" });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (actualVolume !== undefined)        updateData.actualVolume = actualVolume;
    if (completionPercentage !== undefined) updateData.completionPercentage = completionPercentage;
    if (status !== undefined) {
      // Rule 2: Only admin/manager can mark a task as "completed"
      if (status === "completed" && !isAdminOrManager) {
        updateData.status = "in_progress";
      } else {
        updateData.status = status;
      }
    }
    if (pdfUrl !== undefined)              updateData.pdfUrl = pdfUrl;
    if (actualResult !== undefined)        updateData.actualResult = actualResult;

    // Ijro vazifasi uchun qo'shimcha maydonlar
    if (isIjroTask) {
      if (plannedVolume !== undefined)   updateData.plannedVolume = plannedVolume;
      if (ijroLate !== undefined)        updateData.ijroLate = ijroLate;
      if (ijroUnexecuted !== undefined)  updateData.ijroUnexecuted = ijroUnexecuted;

      // KPI ni avto-hisoblash: bajarilgan / kelib_tushgan * 100
      const newPlanned = plannedVolume !== undefined ? plannedVolume : currentTask.plannedVolume;
      const newActual = actualVolume !== undefined ? actualVolume : currentTask.actualVolume;
      const planned = newPlanned ? parseFloat(String(newPlanned)) : 0;
      const actual = newActual ? parseFloat(String(newActual)) : 0;
      if (planned > 0) {
        const pct = Math.min(100, Math.max(0, Math.round((actual / planned) * 100)));
        updateData.completionPercentage = pct;
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "Yangilanadigan ma'lumot yo'q" }); return;
    }

    const [updated] = await db
      .update(workPlanTasksTable)
      .set(updateData)
      .where(and(eq(workPlanTasksTable.id, taskId), eq(workPlanTasksTable.planId, planId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Vazifa topilmadi" }); return; }

    res.json(updated);
  },
);

export default router;
