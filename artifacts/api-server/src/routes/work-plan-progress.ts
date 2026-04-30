import { Router, type IRouter, type Response } from "express";
import { db } from "@workspace/db";
import { workPlanTasksTable, workPlansTable, employeesTable, usersTable } from "@workspace/db";
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
    const isMehnatTask = currentTask.category === "mehnat";

    // Ijro vazifasi: faqat Ijro.gov mas'uli (yoki admin/manager) yangilashi mumkin
    // Mehnat (Malaka talabi) vazifasi: FAQAT Mehnat intizomi mas'uli (admin/manager ham YO'Q)
    if (isIjroTask || isMehnatTask) {
      const [linkedUser] = await db
        .select({ employeeId: usersTable.employeeId })
        .from(usersTable)
        .where(eq(usersTable.id, req.user!.id))
        .limit(1);
      const empId = linkedUser?.employeeId ?? null;
      let isIjroResp = false;
      let isMehnatResp = false;
      if (empId !== null) {
        const [respEmp] = await db
          .select({
            isIjroResponsible: employeesTable.isIjroResponsible,
            isMehnatResponsible: employeesTable.isMehnatResponsible,
          })
          .from(employeesTable)
          .where(eq(employeesTable.id, empId))
          .limit(1);
        isIjroResp = !!respEmp?.isIjroResponsible;
        isMehnatResp = !!respEmp?.isMehnatResponsible;
      }
      // Ijro: faqat Ijro intizomi mas'uli kirita oladi (admin/manager bo'lsa ham yo'q)
      if (isIjroTask && !isIjroResp) {
        res.status(403).json({ error: "Ijro intizomi vazifasini faqat Ijro intizomi bo'yicha mas'ul kirita oladi" });
        return;
      }
      // Mehnat: faqat Mehnat mas'uli kirita oladi (admin/manager bo'lsa ham yo'q)
      if (isMehnatTask && !isMehnatResp) {
        res.status(403).json({ error: "Xodimning malaka talabini faqat Mehnat intizomi bo'yicha mas'ul kirita oladi" });
        return;
      }
    }

    const { actualVolume, completionPercentage, status, pdfUrl, actualResult, plannedVolume, ijroLate, ijroUnexecuted, mehnatWorkHours, mehnatLateMinutes, mehnatLateDays, mehnatResult } = req.body as {
      actualVolume?: string | null;
      completionPercentage?: number;
      status?: string;
      pdfUrl?: string | null;
      actualResult?: string | null;
      plannedVolume?: string | null;
      ijroLate?: number | null;
      ijroUnexecuted?: number | null;
      mehnatWorkHours?: number | null;
      mehnatLateMinutes?: number | null;
      mehnatLateDays?: number | null;
      mehnatResult?: string | null;
    };

    // Rule 1: Non-admin users must attach a PDF when reporting actualVolume
    // (Ijro/Mehnat avto-vazifalari uchun PDF talab qilinmaydi — bu oylik statistika)
    if (!isIjroTask && !isMehnatTask && !isAdminOrManager && actualVolume !== undefined && actualVolume !== null && actualVolume !== "") {
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
    // Rule 3: Faqat admin/manager (yoki ijro/mehnat maxsus avto-hisobi) completionPercentage'ni > 0 qila oladi.
    // Oddiy xodim actualVolume saqlasa — foiz 0'ga reset bo'ladi (qayta tasdiqlash zarur).
    if (!isIjroTask && !isMehnatTask && !isAdminOrManager) {
      if (actualVolume !== undefined) {
        updateData.completionPercentage = 0;
      } else if (completionPercentage !== undefined && Number(completionPercentage) > 0) {
        updateData.completionPercentage = 0;
      }
    }
    // Rule 4 (bug fix): agar oddiy vazifa Amalda (actualVolume) bo'shaytirilsa
    // — foiz va status'ni avtomatik reset qilish (admin uchun ham, xodim uchun ham).
    if (!isIjroTask && !isMehnatTask && actualVolume !== undefined) {
      const av = actualVolume;
      const isCleared = av === null || (typeof av === "string" && av.trim() === "");
      if (isCleared) {
        updateData.actualVolume = null;
        updateData.completionPercentage = 0;
        updateData.status = "pending";
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

    // Malaka talabi vazifasi uchun: 0-5 ball, KPI = (ball/5)*100
    if (isMehnatTask) {
      // Eski fieldlarni ham qabul qilamiz (orqaga muvofiqlik uchun, KPI'ga ta'sir qilmaydi)
      if (mehnatWorkHours !== undefined)   updateData.mehnatWorkHours = mehnatWorkHours;
      if (mehnatLateMinutes !== undefined) updateData.mehnatLateMinutes = mehnatLateMinutes;
      if (mehnatLateDays !== undefined)    updateData.mehnatLateDays = mehnatLateDays;

      if (mehnatResult !== undefined) {
        const trimmed = mehnatResult === null ? "" : String(mehnatResult).trim();
        if (trimmed === "") {
          // Bo'sh — tozalash va KPI'ni 0'ga qaytarish
          updateData.mehnatResult = null;
          updateData.completionPercentage = 0;
        } else {
          const ball = Number(trimmed.replace(",", "."));
          if (isNaN(ball)) {
            res.status(400).json({ error: "Ball son bo'lishi shart (0–5 oralig'ida)" });
            return;
          }
          // 5 ball'dan yuqori yoki 0'dan past — qabul qilinmaydi
          if (ball < 0 || ball > 5) {
            res.status(400).json({ error: "Ball 0–5 oralig'ida bo'lishi shart (5 ball'dan yuqori berilmaydi)" });
            return;
          }
          updateData.mehnatResult = String(ball);
          updateData.completionPercentage = Math.round((ball / 5) * 100);
        }
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
