import { useState, useEffect, useRef, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams, Link } from "wouter";
import * as XLSX from "xlsx";
import { useRegion } from "@/lib/region-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CheckCircle2,
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  FileText,
  Printer,
  Download,
} from "lucide-react";
import { MultiEmployeeSelect } from "@/components/multi-employee-select";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  useGetWorkPlan,
  getGetWorkPlanQueryKey,
  useSubmitWorkPlan,
  useApproveWorkPlan,
  useCreateWorkPlanTask,
  useUpdateWorkPlanTask,
  useDeleteWorkPlanTask,
  useGetMe,
  getGetMeQueryKey,
  useListEmployees,
  getListEmployeesQueryKey,
  customFetch,
} from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/lang-context";
import { getUnitOptions } from "@/lib/unit-options";


const UNIT_OPTIONS_PLACEHOLDER = [
  // Uzunlik
  { value: "mm", label: "mm — millimetr" },
  { value: "sm", label: "sm — santimetr" },
  { value: "m", label: "m — metr" },
  { value: "km", label: "km — kilometr" },
  // Yuza
  { value: "m²", label: "m² — kvadrat metr" },
  { value: "km²", label: "km² — kvadrat kilometr" },
  { value: "ga", label: "ga — gektar" },
  // Hajm
  { value: "ml", label: "ml — millilitr" },
  { value: "l", label: "l — litr" },
  { value: "m³", label: "m³ — kub metr" },
  { value: "ming m³", label: "ming m³" },
  { value: "mln m³", label: "mln m³ — million kub metr" },
  // Oqim
  { value: "l/s", label: "l/s — litr/soniya" },
  { value: "m³/s", label: "m³/s — kub metr/soniya" },
  { value: "m³/soat", label: "m³/soat — kub metr/soat" },
  { value: "m³/kun", label: "m³/kun — kub metr/kun" },
  // Massa
  { value: "g", label: "g — gramm" },
  { value: "kg", label: "kg — kilogramm" },
  { value: "t", label: "t — tonna" },
  { value: "ming t", label: "ming t — ming tonna" },
  // Bosim / Temperatura
  { value: "atm", label: "atm — atmosfera" },
  { value: "bar", label: "bar" },
  { value: "MPa", label: "MPa — megapaskal" },
  { value: "°C", label: "°C — daraja Selsiy" },
  // Elektr
  { value: "kVt", label: "kVt — kilovat" },
  { value: "MVt", label: "MVt — megavat" },
  { value: "kVt·soat", label: "kVt·soat — kilovatt-soat" },
  { value: "MVt·soat", label: "MVt·soat — megavatt-soat" },
  // Sanoq
  { value: "dona", label: "dona" },
  { value: "ta", label: "ta" },
  { value: "nafar", label: "nafar — kishi" },
  { value: "oila", label: "oila" },
  { value: "uy-joy", label: "uy-joy" },
  { value: "xonadon", label: "xonadon" },
  { value: "abonent", label: "abonent" },
  { value: "iste'molchi", label: "iste'molchi" },
  { value: "tashkilot", label: "tashkilot" },
  { value: "korxona", label: "korxona" },
  { value: "manzil", label: "manzil" },
  { value: "nuqta", label: "nuqta" },
  { value: "quduq", label: "quduq" },
  { value: "stansiya", label: "stansiya" },
  { value: "inshoot", label: "inshoot" },
  { value: "agregat", label: "agregat" },
  { value: "nasos", label: "nasos" },
  { value: "truba", label: "truba" },
  { value: "kran", label: "kran" },
  { value: "hisoblagich", label: "hisoblagich (schyotchik)" },
  // Vaqt
  { value: "daqiqa", label: "daqiqa" },
  { value: "soat", label: "soat" },
  { value: "kun", label: "kun" },
  { value: "hafta", label: "hafta" },
  { value: "oy", label: "oy" },
  { value: "yil", label: "yil" },
  { value: "marta", label: "marta" },
  { value: "seans", label: "seans" },
  { value: "muddat", label: "muddat" },
  // Hujjat / faoliyat
  { value: "loyiha", label: "loyiha" },
  { value: "hujjat", label: "hujjat" },
  { value: "tadbir", label: "tadbir" },
  { value: "dastur", label: "dastur" },
  { value: "shartnoma", label: "shartnoma" },
  { value: "buyurtma", label: "buyurtma" },
  { value: "ariza", label: "ariza" },
  { value: "shikoyat", label: "shikoyat" },
  { value: "tekshiruv", label: "tekshiruv" },
  { value: "hisobot", label: "hisobot" },
  { value: "yig'ilish", label: "yig'ilish" },
  { value: "o'quv", label: "o'quv (trening)" },
  { value: "ish o'rni", label: "ish o'rni" },
  // Moliyaviy
  { value: "so'm", label: "so'm" },
  { value: "ming so'm", label: "ming so'm" },
  { value: "mln so'm", label: "mln so'm — million so'm" },
  { value: "mlrd so'm", label: "mlrd so'm — milliard so'm" },
  { value: "USD", label: "USD — dollar" },
  // Foiz / nisbiy
  { value: "%", label: "% — foiz" },
  { value: "ball", label: "ball" },
  { value: "indeks", label: "indeks" },
  { value: "koeffitsient", label: "koeffitsient" },
  // Boshqa
  { value: "—", label: "— (ko'rsatilmagan)" },
];

const STATUS_CLASS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 border-gray-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  approved:  "bg-green-100 text-green-700 border-green-200",
  completed: "bg-teal-100 text-teal-700 border-teal-200",
};

const TASK_STATUS_CLASS: Record<string, string> = {
  pending:     "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed:   "bg-green-100 text-green-700",
};

function StatusBadge({ status }: { status: string }) {
  const { t, d } = useLang();
  const labelMap: Record<string, string> = {
    draft:     t("status_draft"),
    submitted: t("status_submitted"),
    approved:  t("status_approved"),
    completed: t("status_completed"),
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_CLASS[status] ?? ""}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const { t, d } = useLang();
  const labelMap: Record<string, string> = {
    pending:     t("status_pending"),
    in_progress: t("status_in_progress"),
    completed:   t("status_completed"),
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${TASK_STATUS_CLASS[status] ?? ""}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

const taskSchema = z.object({
  isSection: z.boolean().default(false),
  title: z.string().min(1, "Sarlavhani kiriting"),
  implementationMechanism: z.string().optional(),
  fundingSource: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  plannedVolume: z.string().optional(),
  actualVolume: z.string().optional(),
  completionPercentage: z.coerce.number().min(0).max(100).default(0),
  responsiblePerson: z.string().optional(),
  location: z.string().optional(),
  controller: z.string().optional(),
  actualResult: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const defaultValues: TaskFormValues = {
  isSection: false,
  title: "",
  implementationMechanism: "",
  fundingSource: "",
  unitOfMeasure: "",
  plannedVolume: "",
  actualVolume: "",
  completionPercentage: 0,
  responsiblePerson: "",
  location: "",
  controller: "",
  actualResult: "",
  status: "pending",
};

type TaskEdit = { actualVolume: string; pdfUrl: string | null; uploading: boolean; saving: boolean; approving: boolean; rejecting: boolean };

export default function WorkPlanDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const { lang, t, d } = useLang();
  const queryClient = useQueryClient();
  const { selectedTuman, selectedViloyat } = useRegion();
  const UNIT_OPTIONS = useMemo(() => getUnitOptions(lang), [lang]);

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [inlineEditTask, setInlineEditTask] = useState<any>(null);

  const [progressEdits, setProgressEdits] = useState<Record<number, TaskEdit>>({});
  const [ijroEdits, setIjroEdits] = useState<Record<number, { plannedVolume: string; actualVolume: string; ijroLate: string; ijroUnexecuted: string; saving: boolean }>>({});
  const [mehnatEdits, setMehnatEdits] = useState<Record<number, { workHours: string; lateMinutes: string; lateDays: string; result: string; saving: boolean }>>({});
  const [editingProgressIds, setEditingProgressIds] = useState<Set<number>>(new Set());
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isIjroResponsibleUser = !!(user as any)?.isIjroResponsible;
  const canEditIjroTask = isAdminOrManager || isIjroResponsibleUser;

  const { data: mfylarData = [] } = useQuery({
    queryKey: ["mfylar", selectedTuman],
    queryFn: () => {
      const params = selectedTuman ? `?tuman=${encodeURIComponent(selectedTuman)}` : "";
      return customFetch<{ id: number; name: string }[]>(`${BASE}/api/mfylar${params}`);
    },
    staleTime: 0,
  });
  const locationOptions = mfylarData.map((m) => ({ value: m.name, label: m.name }));

  const { data: departmentsData = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => customFetch<{ id: number; name: string }[]>(`${BASE}/api/departments`),
    staleTime: 60_000,
  });

  const { data: approverData } = useQuery({
    queryKey: ["approver", selectedViloyat, selectedTuman],
    queryFn: () => {
      if (!selectedViloyat && !selectedTuman) return Promise.resolve({ fullName: null });
      const p = new URLSearchParams();
      if (selectedTuman) p.set("tuman", selectedTuman);
      if (selectedViloyat) p.set("viloyat", selectedViloyat);
      return customFetch<{ fullName: string | null }>(`${BASE}/api/employees/approver?${p.toString()}`);
    },
    staleTime: 0,
  });
  const approverName = approverData?.fullName ?? "";

  const { data: employeesData } = useListEmployees(undefined, {
    query: { queryKey: getListEmployeesQueryKey() },
  });
  const employeeOptions = ((employeesData as any[] | undefined) ?? []).map((e: any) => ({
    value: e.fullName as string,
    label: e.fullName as string,
  }));

  const { data: plan, isLoading } = useGetWorkPlan(id, {
    query: { queryKey: getGetWorkPlanQueryKey(id), enabled: !!id },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetWorkPlanQueryKey(id) });

  useEffect(() => {
    if (!plan?.tasks) return;
    setProgressEdits((prev) => {
      const next = { ...prev };
      for (const task of (plan.tasks ?? [])) {
        if (!task.isSection && !(task.id in next)) {
          next[task.id] = { actualVolume: task.actualVolume ?? "", pdfUrl: task.pdfUrl ?? null, uploading: false, saving: false, approving: false, rejecting: false };
        }
      }
      return next;
    });
    setIjroEdits((prev) => {
      const next = { ...prev };
      for (const task of (plan.tasks ?? []) as any[]) {
        if (task.category === "ijro" && !(task.id in next)) {
          next[task.id] = {
            plannedVolume: task.plannedVolume ?? "",
            actualVolume: task.actualVolume ?? "",
            ijroLate: task.ijroLate != null ? String(task.ijroLate) : "",
            ijroUnexecuted: task.ijroUnexecuted != null ? String(task.ijroUnexecuted) : "",
            saving: false,
          };
        }
      }
      return next;
    });
    setMehnatEdits((prev) => {
      const next = { ...prev };
      for (const task of (plan.tasks ?? []) as any[]) {
        if (task.category === "mehnat" && !(task.id in next)) {
          next[task.id] = {
            workHours: task.mehnatWorkHours != null ? String(task.mehnatWorkHours) : "",
            lateMinutes: task.mehnatLateMinutes != null ? String(task.mehnatLateMinutes) : "",
            lateDays: task.mehnatLateDays != null ? String(task.mehnatLateDays) : "",
            result: task.mehnatResult ?? "",
            saving: false,
          };
        }
      }
      return next;
    });
  }, [plan?.tasks]);

  const submitMutation = useSubmitWorkPlan({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Ish reja tasdiqlash uchun yuborildi" }); } },
  });
  const approveMutation = useApproveWorkPlan({
    mutation: {
      onSuccess: () => {
        invalidate();
        setIsApproveDialogOpen(false);
        toast({ title: "Ish reja tasdiqlandi" });
      },
    },
  });
  const createTaskMutation = useCreateWorkPlanTask({
    mutation: { onSuccess: () => { invalidate(); setIsTaskDialogOpen(false); toast({ title: "Qator qo'shildi" }); } },
  });
  const updateTaskMutation = useUpdateWorkPlanTask({
    mutation: { onSuccess: () => { invalidate(); setInlineEditTask(null); toast({ title: "Qator yangilandi" }); } },
  });
  const deleteTaskMutation = useDeleteWorkPlanTask({
    mutation: { onSuccess: () => { invalidate(); setIsDeleteDialogOpen(false); toast({ title: "Qator o'chirildi" }); } },
  });

  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema), defaultValues });

  const openCreate = (isSection = false) => {
    setSelectedTask(null);
    setAddingSection(isSection);
    form.reset({ ...defaultValues, isSection, controller: approverName });
    setIsTaskDialogOpen(true);
  };

  const openEdit = (task: any) => {
    setInlineEditTask({
      id: task.id,
      isSection: task.isSection ?? false,
      title: task.title ?? "",
      implementationMechanism: task.implementationMechanism ?? "",
      fundingSource: task.fundingSource ?? "",
      unitOfMeasure: task.unitOfMeasure ?? "",
      plannedVolume: String(task.plannedVolume ?? ""),
      actualVolume: String(task.actualVolume ?? ""),
      completionPercentage: task.completionPercentage ?? 0,
      responsiblePerson: task.responsiblePerson ?? "",
      location: task.location ?? "",
      controller: task.controller ?? "",
      actualResult: task.actualResult ?? "",
      status: task.status ?? "pending",
    });
  };

  const saveInlineEdit = async () => {
    if (!inlineEditTask) return;
    if (isLocked) {
      // Tasdiqlangan/jo'natilgan rejalar uchun PATCH progress endpoint ishlatiladi
      try {
        await customFetch(`${BASE}/api/work-plans/${id}/tasks/${inlineEditTask.id}/progress`, {
          method: "PATCH",
          body: JSON.stringify({
            actualVolume: inlineEditTask.actualVolume || null,
            completionPercentage: Number(inlineEditTask.completionPercentage) || 0,
            status: inlineEditTask.status ?? "pending",
            actualResult: inlineEditTask.actualResult || null,
          }),
          headers: { "Content-Type": "application/json" },
        } as any);
        invalidate();
        setInlineEditTask(null);
        toast({ title: "Qator yangilandi" });
      } catch {
        toast({ title: "Xatolik yuz berdi", variant: "destructive" });
      }
    } else {
      updateTaskMutation.mutate({
        id,
        taskId: inlineEditTask.id,
        data: {
          isSection: inlineEditTask.isSection,
          title: inlineEditTask.title,
          implementationMechanism: inlineEditTask.implementationMechanism || null,
          fundingSource: inlineEditTask.fundingSource || null,
          unitOfMeasure: inlineEditTask.unitOfMeasure || null,
          plannedVolume: inlineEditTask.plannedVolume || null,
          actualVolume: inlineEditTask.actualVolume || null,
          completionPercentage: Number(inlineEditTask.completionPercentage) || 0,
          responsiblePerson: inlineEditTask.responsiblePerson || null,
          location: inlineEditTask.location || null,
          controller: inlineEditTask.controller || null,
          actualResult: inlineEditTask.actualResult || null,
          status: inlineEditTask.status ?? "pending",
        } as any,
      });
    }
  };

  const onSubmitTask = (data: TaskFormValues) => {
    createTaskMutation.mutate({ id, data: data as any });
  };

  const downloadExcel = () => {
    if (!plan) return;
    const rows: any[] = [];
    let counter = 0;
    for (const task of (plan.tasks ?? [])) {
      if (task.isSection) {
        rows.push({ "№": "", "Chora-tadbirlar": task.title, "Amalga oshirish mexanizmi": "", "Moliyalashtirish manbalari": "", "O'lchov birligi": "", "Reja": "", "Amalda": "", "Bajarilishi %": "", "Birgalikda bajaradigan ijrochi": "", "Hudud": "", "Tasdiqlovchi": "", "Holati": "" });
      } else {
        counter++;
        rows.push({
          "№": counter,
          "Chora-tadbirlar": task.title ?? "",
          "Amalga oshirish mexanizmi": task.implementationMechanism ?? "",
          "Moliyalashtirish manbalari": task.fundingSource ?? "",
          "O'lchov birligi": task.unitOfMeasure ?? "",
          "Reja": task.plannedVolume ?? "",
          "Amalda": task.actualVolume ?? "",
          "Bajarilishi %": task.completionPercentage ?? 0,
          "Birgalikda bajaradigan ijrochi": task.responsiblePerson ?? "",
          "Hudud": task.location ?? "",
          "Tasdiqlovchi": task.controller ?? "",
          "Holati": task.status === "completed" ? t("wp_completed") : task.status === "in_progress" ? t("wp_in_progress") : t("wp_pending"),
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chora-tadbirlar");
    const fileName = `${plan.employeeName ?? "ish-reja"}_${plan.period ?? ""}.xlsx`.replace(/\s+/g, "_");
    XLSX.writeFile(wb, fileName);
  };

  const downloadPdf = async () => {
    if (!plan) return;
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const QRCode = (await import("qrcode")).default;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = margin;

    doc.setTextColor(0, 0, 0);

    const txt = (text: string, x: number, yy: number, opts?: any) => {
      doc.text(text || "", x, yy, opts);
    };
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const fmtDate = (val: string | null | undefined) => {
      if (!val) return "";
      const d = new Date(val);
      return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
    };

    /* ── QR kod (o'ng yuqori burchak) ── */
    const qrSize = 34;
    const qrX = pageW - margin - qrSize;
    const qrY = margin;
    try {
      const planUrl = `${window.location.origin}/work-plans/${id}`;
      const qrDataUrl = await QRCode.toDataURL(planUrl, { width: 256, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      txt("Elektron ish reja", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });
    } catch (_) {}

    /* ── 1. KELISHILDI / TASDIQLANDI stamp bloki ── */
    const stampGap = 8;
    const stampAreaW = qrX - margin - stampGap;
    const stampW = (stampAreaW - stampGap) / 2;
    const stampH = 36;
    const lineH = 6.5;

    const drawStamp = (label: string, position: string | undefined, name: string, dateStr: string, sx: number) => {
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.5);
      doc.rect(sx, y, stampW, stampH);

      // header fill
      doc.setFillColor(240, 242, 246);
      doc.rect(sx, y, stampW, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      txt(label, sx + stampW / 2, y + 7, { align: "center" });

      doc.setLineWidth(0.3);
      doc.setDrawColor(120, 120, 120);
      doc.line(sx, y + 10, sx + stampW, y + 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      let iy = y + 10 + lineH;
      if (position) {
        const posLines: string[] = doc.splitTextToSize(position, stampW - 8);
        doc.text(posLines, sx + 5, iy);
        iy += posLines.length * lineH;
      }
      if (name) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        const nameLines: string[] = doc.splitTextToSize(name, stampW - 8);
        doc.text(nameLines, sx + 5, iy);
        doc.setFont("helvetica", "normal");
        iy += nameLines.length * lineH;
      }
      if (dateStr) {
        doc.setFontSize(9);
        txt(dateStr, sx + 5, iy);
      }
    };

    drawStamp(
      "KELISHILDI",
      (plan as any).employeePosition,
      plan.employeeName ?? "",
      fmtDate(plan.createdAt ?? null),
      margin,
    );

    const stampX2 = margin + stampW + stampGap;
    if (plan.approvedByName) {
      drawStamp(
        "TASDIQLANDI",
        (plan as any).approvedByPosition,
        plan.approvedByName,
        fmtDate((plan as any).approvedAt ?? null),
        stampX2,
      );
    } else {
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.5);
      doc.rect(stampX2, y, stampW, stampH);
      doc.setFillColor(240, 242, 246);
      doc.rect(stampX2, y, stampW, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      txt("TASDIQLANDI", stampX2 + stampW / 2, y + 7, { align: "center" });
      doc.setLineWidth(0.3);
      doc.setDrawColor(120, 120, 120);
      doc.line(stampX2, y + 10, stampX2 + stampW, y + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      txt("Tasdiqlanmagan", stampX2 + 5, y + 10 + lineH);
    }

    y += stampH + 8;

    /* ── 2. Sarlavha ── */
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize(plan.title ?? "Ish reja", pageW - margin * 2 - 4);
    doc.text(titleLines, pageW / 2, y, { align: "center" });
    y += titleLines.length * 7 + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const subParts = [plan.employeeName, plan.departmentName, plan.period ? `Davr: ${plan.period}` : null].filter(Boolean);
    txt(subParts.join("  \u2022  "), pageW / 2, y, { align: "center" });
    y += 7;

    /* ── 3. Statistika satri ── */
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const realCount = (plan.tasks ?? []).filter((t: any) => !t.isSection).length;
    const doneCount = (plan.tasks ?? []).filter((t: any) => !t.isSection && t.status === "completed").length;
    const pct = Math.round(plan.overallProgress ?? 0);
    doc.setFont("helvetica", "bold");
    txt("Jami vazifa:", margin, y);
    doc.setFont("helvetica", "normal");
    txt(`${realCount}`, margin + 26, y);
    doc.setFont("helvetica", "bold");
    txt("Bajarildi:", margin + 40, y);
    doc.setFont("helvetica", "normal");
    txt(`${doneCount}/${realCount}`, margin + 58, y);
    doc.setFont("helvetica", "bold");
    txt("Bajarilishi:", margin + 80, y);
    doc.setFont("helvetica", "normal");
    txt(`${pct}%`, margin + 101, y);
    y += 6;

    /* ── 4. Jadval ── */
    const head = [["#", "Chora-tadbirlar", "Mexanizm", "Moliya", "Birlik", "Reja", "Amalda", "%", "Hudud", "Tasdiqlovchi", "Holati"]];
    const body: any[] = [];
    let counter = 0;
    for (const task of (plan.tasks ?? [])) {
      if ((task as any).isSection) {
        body.push([{ content: (task as any).title ?? "", colSpan: 11, styles: { fontStyle: "bold", fontSize: 9, fillColor: [237, 241, 248], textColor: [0, 0, 0] } }]);
      } else {
        counter++;
        const statusLabel = (task as any).status === "completed" ? "Bajarildi" : (task as any).status === "in_progress" ? "Jarayonda" : "Kutilmoqda";
        body.push([
          counter,
          (task as any).title ?? "",
          (task as any).implementationMechanism ?? "",
          (task as any).fundingSource ?? "",
          (task as any).unitOfMeasure ?? "",
          (task as any).plannedVolume ?? "",
          (task as any).actualVolume ?? "",
          `${(task as any).completionPercentage ?? 0}%`,
          (task as any).location ?? "",
          (task as any).controller ?? "",
          statusLabel,
        ]);
      }
    }

    autoTable(doc, {
      startY: y,
      head,
      body,
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak", textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.25 },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: 54 },
        2: { cellWidth: 38 },
        7: { cellWidth: 11, halign: "center" },
        10: { cellWidth: 20, halign: "center" },
      },
      tableLineColor: [160, 160, 160],
      tableLineWidth: 0.3,
    });

    const fileName = `${plan.employeeName ?? "ish-reja"}_${plan.period ?? ""}.pdf`.replace(/\s+/g, "_");
    doc.save(fileName);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[280px]" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold">Ish reja topilmadi</h2>
        <Link href="/work-plans" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />Ro'yxatga qaytish
        </Link>
      </div>
    );
  }

  const isLocked = plan.status !== "draft" && plan.status !== "rejected";
  const realTasks = (plan.tasks ?? []).filter((t: any) => !t.isSection);
  let taskCounter = 0;

  const calcPct = (taskId: number, actualStr?: string) => {
    const task = plan.tasks?.find((t: any) => t.id === taskId);
    const planned = parseFloat(task?.plannedVolume ?? "0");
    const actual = parseFloat(actualStr ?? progressEdits[taskId]?.actualVolume ?? "0");
    if (!isNaN(planned) && planned > 0 && !isNaN(actual) && actual >= 0) {
      return Math.min(100, Math.round((actual / planned) * 100));
    }
    return null;
  };

  const saveProgress = async (taskId: number) => {
    const edit = progressEdits[taskId];
    if (!edit) return;
    // PDF mandatory check: when actualVolume is being entered, a PDF must exist
    if (edit.actualVolume && edit.actualVolume.trim() !== "") {
      const task = plan?.tasks?.find((t: any) => t.id === taskId);
      const hasPdf = !!edit.pdfUrl || !!task?.pdfUrl;
      if (!hasPdf && !isAdminOrManager) {
        toast({
          title: "PDF fayl yuklash majburiy",
          description: "Avval tasdiqlovchi PDF faylni yuklang, keyin saqlang",
          variant: "destructive",
        });
        return;
      }
    }
    setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], saving: true } }));
    try {
      const body: Record<string, unknown> = { actualVolume: edit.actualVolume || null };
      if (edit.pdfUrl) body.pdfUrl = edit.pdfUrl;
      // Foiz (completionPercentage) FAQAT admin tasdig'idan keyin hisoblanadi.
      // Foydalanuvchi saqlasa — foiz 0'ga reset bo'ladi, status "kutilmoqda".
      // Admin tasdiqlaganida (approveTask) actualVolume/plannedVolume bo'yicha foiz hisoblanadi.
      if (isAdminOrManager) {
        // Admin xohlasa, frontend hisobini saqlasin (qulaylik uchun)
        const pct = calcPct(taskId, edit.actualVolume);
        if (pct !== null) {
          body.completionPercentage = pct;
          body.status = pct > 0 ? "in_progress" : "pending";
        }
      } else {
        // Oddiy xodim saqlaganida — har safar qayta tasdiqlash zarur
        body.completionPercentage = 0;
        body.status = "pending";
      }
      await customFetch(`${BASE}/api/work-plans/${id}/tasks/${taskId}/progress`, {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      } as any);
      invalidate();
      toast({
        title: "Saqlandi",
        description: isAdminOrManager ? undefined : "Admin tasdig'i kutilmoqda",
      });
      setEditingProgressIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    } catch {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], saving: false } }));
    }
  };

  const saveIjroProgress = async (taskId: number) => {
    const edit = ijroEdits[taskId];
    if (!edit) return;
    setIjroEdits((p) => ({ ...p, [taskId]: { ...p[taskId], saving: true } }));
    try {
      await customFetch(`${BASE}/api/work-plans/${id}/tasks/${taskId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({
          plannedVolume: edit.plannedVolume || null,
          actualVolume: edit.actualVolume || null,
          ijroLate: edit.ijroLate ? parseInt(edit.ijroLate) : null,
          ijroUnexecuted: edit.ijroUnexecuted ? parseInt(edit.ijroUnexecuted) : null,
        }),
        headers: { "Content-Type": "application/json" },
      } as any);
      invalidate();
      toast({
        title: "Saqlandi",
        description: isAdminOrManager ? undefined : "Admin tasdig'i kutilmoqda",
      });
    } catch {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setIjroEdits((p) => ({ ...p, [taskId]: { ...p[taskId], saving: false } }));
    }
  };

  const saveMehnatProgress = async (taskId: number) => {
    const edit = mehnatEdits[taskId];
    if (!edit) return;
    setMehnatEdits((p) => ({ ...p, [taskId]: { ...p[taskId], saving: true } }));
    try {
      await customFetch(`${BASE}/api/work-plans/${id}/tasks/${taskId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({
          mehnatWorkHours:   edit.workHours   ? parseInt(edit.workHours)   : null,
          mehnatLateMinutes: edit.lateMinutes ? parseInt(edit.lateMinutes) : null,
          mehnatLateDays:    edit.lateDays    ? parseInt(edit.lateDays)    : null,
          mehnatResult:      edit.result || null,
        }),
        headers: { "Content-Type": "application/json" },
      } as any);
      invalidate();
      toast({ title: "Saqlandi" });
    } catch {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setMehnatEdits((p) => ({ ...p, [taskId]: { ...p[taskId], saving: false } }));
    }
  };

  const uploadPdf = async (taskId: number, file: File) => {
    setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], uploading: true } }));
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`${BASE}/api/work-plans/upload-pdf`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url: string };
      const pdfUrl = data.url;
      setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], pdfUrl, uploading: false } }));
      await customFetch(`${BASE}/api/work-plans/${id}/tasks/${taskId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ actualVolume: progressEdits[taskId]?.actualVolume || null, pdfUrl }),
        headers: { "Content-Type": "application/json" },
      } as any);
      invalidate();
      toast({ title: "PDF yuklandi va saqlandi" });
    } catch {
      toast({ title: "PDF yuklashda xatolik", variant: "destructive" });
      setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], uploading: false } }));
    }
  };

  const approveTask = async (taskId: number) => {
    setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], approving: true } }));
    try {
      // Tasdiqlash payti foizni real qiymatlar bo'yicha hisoblash:
      // foiz = bajarilgan / reja * 100 (0–100 oralig'ida)
      const task = plan?.tasks?.find((t: any) => t.id === taskId);
      const planned = parseFloat((task as any)?.plannedVolume ?? "0");
      const actual = parseFloat((task as any)?.actualVolume ?? "0");
      let pct = 100;
      if (!isNaN(planned) && planned > 0 && !isNaN(actual) && actual >= 0) {
        pct = Math.min(100, Math.max(0, Math.round((actual / planned) * 100)));
      }
      await customFetch(`${BASE}/api/work-plans/${id}/tasks/${taskId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", completionPercentage: pct }),
        headers: { "Content-Type": "application/json" },
      } as any);
      invalidate();
      toast({ title: `Vazifa tasdiqlandi (${pct}%)` });
    } catch {
      toast({ title: "Tasdiqlashda xatolik yuz berdi", variant: "destructive" });
    } finally {
      setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], approving: false } }));
    }
  };

  const rejectTask = async (taskId: number) => {
    setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], rejecting: true } }));
    try {
      await customFetch(`${BASE}/api/work-plans/${id}/tasks/${taskId}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress", completionPercentage: 0, pdfUrl: null }),
        headers: { "Content-Type": "application/json" },
      } as any);
      invalidate();
      toast({ title: "Vazifa rad qilindi", description: "Xodim qayta topshirishi kerak" });
    } catch {
      toast({ title: "Rad qilishda xatolik yuz berdi", variant: "destructive" });
    } finally {
      setProgressEdits((p) => ({ ...p, [taskId]: { ...p[taskId], rejecting: false } }));
    }
  };

  const rejectPlan = async () => {
    setIsRejecting(true);
    try {
      await customFetch(`${BASE}/api/approve/work-plans/${id}`, {
        method: "PUT",
        body: JSON.stringify({ action: "reject", comment: rejectComment }),
        headers: { "Content-Type": "application/json" },
      } as any);
      invalidate();
      setIsRejectDialogOpen(false);
      setRejectComment("");
      toast({ title: "Ish reja rad qilindi", description: rejectComment || undefined });
    } catch {
      toast({ title: "Rad qilishda xatolik yuz berdi", variant: "destructive" });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top actions bar — like samaradorlik.uz */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/work-plans" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Bosh sahifa</span>
            <span className="text-muted-foreground/50">›</span>
            <Link href="/work-plans" className="text-sm text-muted-foreground hover:text-primary">Ish rejalar</Link>
            <span className="text-muted-foreground/50">›</span>
            <span className="text-sm font-medium truncate max-w-[300px]">{d(plan.employeeName)}</span>
            <StatusBadge status={plan.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Chop etish
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Yuklab olish
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={downloadExcel}>
                <FileText className="h-3.5 w-3.5 mr-2 text-green-600" />
                Elektron (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadPdf}>
                <FileText className="h-3.5 w-3.5 mr-2 text-red-500" />
                PDF shaklida
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {(plan.status === "draft" || plan.status === "rejected") && (
            <Button size="sm" onClick={() => submitMutation.mutate({ id })} disabled={submitMutation.isPending} className={`h-8 text-xs ${plan.status === "rejected" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {submitMutation.isPending ? "Yuborilmoqda..." : plan.status === "rejected" ? "Qayta yuborish" : "Yuborish"}
            </Button>
          )}
          {plan.status === "submitted" && isAdminOrManager && (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsRejectDialogOpen(true)} className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Rad qilish
              </Button>
              <Button size="sm" onClick={() => setIsApproveDialogOpen(true)} className="h-8 text-xs bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Tasdiqlash
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Plan header card — merged with table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Approval stamps row */}
        <div className={`grid border-b ${(plan.status === "approved" || plan.status === "completed") ? "grid-cols-3" : "grid-cols-2"}`}>
          {(plan.status === "approved" || plan.status === "completed") && (
            <div className="p-4 border-r flex flex-col items-center justify-center">
              <QRCodeSVG
                value={`${window.location.origin}/work-plans/${id}`}
                size={90}
                level="M"
                includeMargin={false}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">Tasdiqlangan</p>
            </div>
          )}
          <div className="p-4 border-r">
            <div className="text-xs font-bold uppercase text-muted-foreground mb-1">Kelishildi</div>
            {plan.status === "approved" || plan.status === "completed" ? (
              <div className="text-sm">
                {(plan as any).employeePosition && (
                  <div className="text-xs text-muted-foreground mb-0.5 italic">{(plan as any).employeePosition}</div>
                )}
                <div className="font-medium">{d(plan.employeeName)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{plan.createdAt?.slice(0, 10)}</div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">Imzosini kutmoqda...</div>
            )}
          </div>
          <div className="p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground mb-1">Tasdiqlandi</div>
            {(plan.status === "approved" || plan.status === "completed") && plan.approvedByName ? (
              <div className="text-sm">
                {(plan as any).approvedByPosition && (
                  <div className="text-xs text-muted-foreground mb-0.5 italic">{(plan as any).approvedByPosition}</div>
                )}
                <div className="font-medium text-green-700">{d(plan.approvedByName)}</div>
                {(plan as any).approvedAt && (() => {
                  const d = new Date((plan as any).approvedAt);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  return (
                    <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {pad(d.getDate())}.{pad(d.getMonth() + 1)}.{d.getFullYear()} {pad(d.getHours())}:{pad(d.getMinutes())}
                    </div>
                  );
                })()}
                {plan.approveComment && (
                  <div className="text-xs text-muted-foreground mt-0.5 italic">"{d(plan.approveComment)}"</div>
                )}
              </div>
            ) : plan.status === "rejected" ? (
              <div className="text-sm">
                <div className="font-medium text-red-600">Rad etildi</div>
                {plan.approveComment && (
                  <div className="text-xs text-red-500 mt-0.5 italic">"{d(plan.approveComment)}"</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">Tasdiqlanmagan</div>
            )}
          </div>
        </div>

        {/* Plan title and info */}
        <div className="p-5 text-center border-b bg-muted/20">
          <h1 className="font-bold text-base leading-snug">{d(plan.title)}</h1>
          <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            <span>{d(plan.employeeName)}</span>
            <span>•</span>
            <span>{d(plan.departmentName)}</span>
            <span>•</span>
            <span>Davr: {plan.period}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-3 flex items-center justify-between text-sm border-b">
          <div className="text-muted-foreground">
            Umumiy ma'lumotlar: <span className="font-medium text-foreground">{realTasks.length} ta vazifa mavjud</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Bajarilishi:</span>
            <span className="font-semibold">
              {plan.completedTaskCount}/{plan.taskCount}
            </span>
            <Progress value={plan.overallProgress} className="h-2 w-[100px]" />
            <span className="font-bold text-primary">{Math.round(plan.overallProgress ?? 0)}%</span>
          </div>
        </div>

        {/* Rejected notice — inside card */}
        {plan.status === "rejected" && (
          <div className="mx-5 my-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 text-sm text-red-800">
            <span className="text-lg mt-0.5">❌</span>
            <div>
              <div className="font-semibold mb-0.5">Ish reja rad etildi</div>
              {plan.approveComment && (
                <div className="text-red-700">Sabab: <span className="font-medium">{d(plan.approveComment)}</span></div>
              )}
              <div className="text-red-600 mt-1 text-xs">Tahrirlang va qayta imzoga yuboring.</div>
            </div>
          </div>
        )}

        {/* Main table header */}
        <div className="px-5 py-3 border-b bg-primary/5 flex items-center justify-between">
          <span className="font-semibold text-sm text-primary">Chora-tadbirlar jadvali</span>
          <div className="flex gap-2">
            {!isLocked && (
              <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => openCreate(false)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Vazifa qo'shish
              </Button>
            )}
          </div>
        </div>

        {plan.tasks?.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground text-sm">
            Hali vazifalar qo'shilmagan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: 1200 }}>
              <thead>
                <tr className="bg-[#1565C0] text-white">
                  <th className="w-8 px-2 py-2.5 text-center border-r border-blue-400">№</th>
                  <th className="min-w-[260px] px-2 py-2.5 text-left border-r border-blue-400">Chora-tadbirlar</th>
                  <th className="min-w-[140px] px-2 py-2.5 text-left border-r border-blue-400">Amalga oshirish mexanizmi</th>
                  <th className="min-w-[100px] px-2 py-2.5 text-left border-r border-blue-400">Moliyalashtirish manbalari</th>
                  <th className="min-w-[130px] px-2 py-2.5 text-center border-r border-blue-400">Birgalikda bajaradigan ijrochi</th>
                  <th className="min-w-[70px] px-2 py-2.5 text-center border-r border-blue-400">O'lchov birligi</th>
                  <th className="min-w-[55px] px-2 py-2.5 text-center border-r border-blue-400">Reja</th>
                  <th className="min-w-[55px] px-2 py-2.5 text-center border-r border-blue-400">Amalda</th>
                  <th className="min-w-[65px] px-2 py-2.5 text-center border-r border-blue-400">Bajarlishi%</th>
                  <th className="min-w-[110px] px-2 py-2.5 text-center border-r border-blue-400">Hudud</th>
                  <th className="min-w-[110px] px-2 py-2.5 text-center border-r border-blue-400">Tasdiqlovchi</th>
                  <th className="min-w-[80px] px-2 py-2.5 text-center border-r border-blue-400">Holati</th>
                  {isLocked
                    ? <th className="min-w-[110px] px-2 py-2.5 text-center border-r border-blue-400">Amalda (kiritish)</th>
                    : <th className="w-8 px-2 py-2.5 text-center">Amal</th>}
                  {isLocked && <th className="min-w-[90px] px-2 py-2.5 text-center border-blue-400">PDF hujjat</th>}
                </tr>
              </thead>
              <tbody>
                {plan.tasks?.map((task: any) => {
                  const isSection = task.isSection;
                  if (!isSection) taskCounter++;
                  const rowNum = isSection ? null : taskCounter;
                  const isInlineEditing = inlineEditTask?.id === task.id;
                  const inp = "w-full border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-800";
                  const sel = "w-full border rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400";
                  const setIE = (field: string, val: any) => setInlineEditTask((prev: any) => ({ ...prev, [field]: val }));

                  // ── Maxsus ijro intizomi qatori ─────────────────────────
                  if (task.category === "ijro") {
                    const e = ijroEdits[task.id] ?? { plannedVolume: "", actualVolume: "", ijroLate: "", ijroUnexecuted: "", saving: false };
                    const setIJ = (field: string, val: string) =>
                      setIjroEdits((p) => ({ ...p, [task.id]: { ...(p[task.id] ?? e), [field]: val } }));
                    const planned = parseFloat(e.plannedVolume || "0");
                    const actual = parseFloat(e.actualVolume || "0");
                    const ijroPct = planned > 0 ? Math.min(100, Math.max(0, Math.round((actual / planned) * 100))) : null;
                    const totalCols = isLocked ? 13 : 12;
                    const ijroDisabled = !canEditIjroTask;
                    const inpCls = "w-24 border rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
                    return (
                      <tr key={task.id} className="border-b bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70">
                        <td className="px-2 py-2 text-center border-r text-muted-foreground align-top">{rowNum}</td>
                        <td colSpan={totalCols} className="px-3 py-3 border-r">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded uppercase tracking-wide">Ijro intizomi</span>
                              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                Ijro.gov bo'yicha kelib tushgan xat-hujjatlar (avto-vazifa)
                              </span>
                              {ijroDisabled ? (
                                <span className="text-[10px] text-gray-700 bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded">
                                  🔒 Faqat Ijro.gov mas'uli to'ldira oladi
                                </span>
                              ) : (
                                !isAdminOrManager && (
                                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">⏳ Tasdiq kutilmoqda</span>
                                )
                              )}
                            </div>
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Kelib tushgan</span>
                                <input className={inpCls} type="number" min="0" value={e.plannedVolume} disabled={ijroDisabled}
                                  onChange={(ev) => setIJ("plannedVolume", ev.target.value)} />
                              </label>
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Bajarilgan</span>
                                <input className={inpCls} type="number" min="0" value={e.actualVolume} disabled={ijroDisabled}
                                  onChange={(ev) => setIJ("actualVolume", ev.target.value)} />
                              </label>
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Muddatidan kech</span>
                                <input className={inpCls} type="number" min="0" value={e.ijroLate} disabled={ijroDisabled}
                                  onChange={(ev) => setIJ("ijroLate", ev.target.value)} />
                              </label>
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Bajarilmagan</span>
                                <input className={inpCls} type="number" min="0" value={e.ijroUnexecuted} disabled={ijroDisabled}
                                  onChange={(ev) => setIJ("ijroUnexecuted", ev.target.value)} />
                              </label>
                              <div className="flex flex-col items-center px-3 border-l border-amber-200">
                                <div className="text-[10px] text-gray-500 uppercase">KPI</div>
                                <div className="text-base font-bold text-amber-700">{ijroPct !== null ? `${ijroPct}%` : "—"}</div>
                              </div>
                              {!ijroDisabled && (
                                <button
                                  onClick={() => saveIjroProgress(task.id)}
                                  disabled={e.saving}
                                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded px-3 py-1.5 font-medium disabled:opacity-50"
                                >
                                  {e.saving ? "Saqlanmoqda..." : "Saqlash"}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // ── Maxsus mehnat intizomi qatori ────────────────────────
                  if (task.category === "mehnat") {
                    const m = mehnatEdits[task.id] ?? { workHours: "", lateMinutes: "", lateDays: "", result: "", saving: false };
                    const setM = (field: string, val: string) =>
                      setMehnatEdits((p) => ({ ...p, [task.id]: { ...(p[task.id] ?? m), [field]: val } }));
                    const hours = parseFloat(m.workHours || "0");
                    const lateMin = parseFloat(m.lateMinutes || "0");
                    let mehnatPct: number | null = null;
                    if (hours > 0) {
                      const penalty = Math.min(100, (lateMin / (hours * 60)) * 100);
                      mehnatPct = Math.max(0, Math.round(100 - penalty));
                    } else if (lateMin === 0 && m.workHours !== "") {
                      mehnatPct = 100;
                    }
                    const totalCols = isLocked ? 13 : 12;
                    const mehnatDisabled = !canEditIjroTask;
                    const mInpCls = "w-24 border rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
                    return (
                      <tr key={task.id} className="border-b bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/70">
                        <td className="px-2 py-2 text-center border-r text-muted-foreground align-top">{rowNum}</td>
                        <td colSpan={totalCols} className="px-3 py-3 border-r">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded uppercase tracking-wide">Mehnat intizomi</span>
                              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                Xodimning oylik mehnat intizomi (avto-vazifa)
                              </span>
                              {mehnatDisabled && (
                                <span className="text-[10px] text-gray-700 bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded">
                                  🔒 Faqat Ijro.gov mas'uli to'ldira oladi
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Oylik ish soati</span>
                                <input className={mInpCls} type="number" min="0" value={m.workHours} disabled={mehnatDisabled}
                                  onChange={(ev) => setM("workHours", ev.target.value)} />
                              </label>
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Kechikkan daqiqa</span>
                                <input className={mInpCls} type="number" min="0" value={m.lateMinutes} disabled={mehnatDisabled}
                                  onChange={(ev) => setM("lateMinutes", ev.target.value)} />
                              </label>
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Kech kelgan kunlar</span>
                                <input className={mInpCls} type="number" min="0" value={m.lateDays} disabled={mehnatDisabled}
                                  onChange={(ev) => setM("lateDays", ev.target.value)} />
                              </label>
                              <label className="text-[11px] text-gray-600 dark:text-gray-400">
                                <span className="block mb-0.5 font-medium">Natija (izoh)</span>
                                <input className={`${mInpCls} w-48`} type="text" value={m.result} disabled={mehnatDisabled}
                                  onChange={(ev) => setM("result", ev.target.value)} placeholder="Masalan: Yaxshi" />
                              </label>
                              <div className="flex flex-col items-center px-3 border-l border-emerald-200">
                                <div className="text-[10px] text-gray-500 uppercase">KPI</div>
                                <div className="text-base font-bold text-emerald-700">{mehnatPct !== null ? `${mehnatPct}%` : "—"}</div>
                              </div>
                              {!mehnatDisabled && (
                                <button
                                  onClick={() => saveMehnatProgress(task.id)}
                                  disabled={m.saving}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1.5 font-medium disabled:opacity-50"
                                >
                                  {m.saving ? "Saqlanmoqda..." : "Saqlash"}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={task.id}
                      className={
                        isInlineEditing
                          ? "bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200"
                          : isSection
                          ? "bg-blue-50 dark:bg-blue-950/30 border-b font-semibold"
                          : "border-b hover:bg-muted/20"
                      }
                    >
                      <td className="px-2 py-2 text-center border-r text-muted-foreground">{rowNum}</td>

                      {isSection ? (
                        isInlineEditing ? (
                          <td colSpan={11} className="px-1 py-1 border-r">
                            <input className={inp} value={inlineEditTask.title} onChange={e => setIE("title", e.target.value)} />
                          </td>
                        ) : (
                          <td colSpan={isLocked ? 13 : 11} className="px-3 py-2 border-r text-blue-800 dark:text-blue-300 text-xs font-semibold">
                            {d(task.title)}
                          </td>
                        )
                      ) : isInlineEditing ? (
                        <>
                          <td className="px-1 py-1 border-r min-w-[150px]">
                            <textarea className={`${inp} resize-none`} rows={2} value={inlineEditTask.title} onChange={e => setIE("title", e.target.value)} />
                          </td>
                          <td className="px-1 py-1 border-r min-w-[120px]">
                            <textarea className={`${inp} resize-none`} rows={2} value={inlineEditTask.implementationMechanism} onChange={e => setIE("implementationMechanism", e.target.value)} />
                          </td>
                          <td className="px-1 py-1 border-r min-w-[90px]">
                            <input className={inp} value={inlineEditTask.fundingSource} onChange={e => setIE("fundingSource", e.target.value)} />
                          </td>
                          <td className="px-1 py-1 border-r min-w-[130px]">
                            <MultiEmployeeSelect
                              compact
                              value={inlineEditTask.responsiblePerson ?? ""}
                              onChange={(val) => setIE("responsiblePerson", val)}
                              options={employeeOptions}
                              placeholder="— Tanlang —"
                            />
                          </td>
                          <td className="px-1 py-1 border-r min-w-[70px]">
                            <select className={sel} value={inlineEditTask.unitOfMeasure} onChange={e => setIE("unitOfMeasure", e.target.value)}>
                              <option value="">—</option>
                              {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1 border-r min-w-[50px]">
                            <input className={inp} value={inlineEditTask.plannedVolume} onChange={e => setIE("plannedVolume", e.target.value)} />
                          </td>
                          <td className="px-1 py-1 border-r min-w-[50px]">
                            <input className={inp} value={inlineEditTask.actualVolume} onChange={e => setIE("actualVolume", e.target.value)} />
                          </td>
                          <td className="px-1 py-1 border-r min-w-[55px]">
                            <input className={inp} type="number" min={0} max={100} value={inlineEditTask.completionPercentage} onChange={e => setIE("completionPercentage", e.target.value)} />
                          </td>
                          <td className="px-1 py-1 border-r min-w-[100px]">
                            <select className={sel} value={inlineEditTask.location} onChange={e => setIE("location", e.target.value)}>
                              <option value="">—</option>
                              {locationOptions.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1 border-r min-w-[100px]">
                            <select className={sel} value={inlineEditTask.controller} onChange={e => setIE("controller", e.target.value)}>
                              <option value="">—</option>
                              {employeeOptions.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1 border-r min-w-[75px]">
                            <select className={sel} value={inlineEditTask.status} onChange={e => setIE("status", e.target.value)}>
                              <option value="pending">Kutilmoqda</option>
                              <option value="in_progress">Jarayonda</option>
                              <option value="completed">Bajarildi</option>
                            </select>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 border-r leading-snug whitespace-normal break-words max-w-[300px]">{d(task.title)}</td>
                          <td className="px-2 py-2 border-r text-muted-foreground leading-snug whitespace-normal break-words">
                            {task.implementationMechanism || "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-muted-foreground">
                            {task.fundingSource || "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-muted-foreground leading-snug">
                            {task.responsiblePerson
                              ? task.responsiblePerson.split(",").map((n: string) => n.trim()).filter(Boolean).map((name: string, i: number) => (
                                  <span key={i} className="inline-block bg-primary/10 text-primary text-[10px] rounded px-1.5 py-0.5 mr-0.5 mb-0.5 font-medium">{name}</span>
                                ))
                              : "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-center text-muted-foreground">
                            {task.unitOfMeasure || "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-center font-medium">
                            {task.plannedVolume || "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-center font-medium text-blue-600">
                            {task.actualVolume || "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold">{task.completionPercentage}%</span>
                              <Progress value={task.completionPercentage} className="h-1 w-12" />
                            </div>
                          </td>
                          <td className="px-2 py-2 border-r text-muted-foreground leading-snug">
                            {task.location || "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-muted-foreground leading-snug">
                            {task.controller || "—"}
                          </td>
                          <td className="px-2 py-2 border-r text-center">
                            <TaskStatusBadge status={task.status} />
                          </td>
                        </>
                      )}

                      {isLocked && !isSection && (
                        <>
                          <td className="px-1 py-1 border-r">
                            {editingProgressIds.has(task.id) ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  className="w-16 border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-800"
                                  placeholder="Miqdor"
                                  autoFocus
                                  value={progressEdits[task.id]?.actualVolume ?? ""}
                                  onChange={(e) =>
                                    setProgressEdits((p) => ({ ...p, [task.id]: { ...p[task.id], actualVolume: e.target.value } }))
                                  }
                                  onKeyDown={(e) => { if (e.key === "Enter") saveProgress(task.id); if (e.key === "Escape") setEditingProgressIds((p) => { const n = new Set(p); n.delete(task.id); return n; }); }}
                                />
                                {(() => { const p = calcPct(task.id, progressEdits[task.id]?.actualVolume); return p !== null ? <span className="text-[10px] text-blue-600 font-semibold whitespace-nowrap">{p}%</span> : null; })()}
                                <button
                                  onClick={() => saveProgress(task.id)}
                                  disabled={progressEdits[task.id]?.saving}
                                  className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded px-1.5 py-0.5 disabled:opacity-50 whitespace-nowrap"
                                >
                                  {progressEdits[task.id]?.saving ? "..." : t("btn_save")}
                                </button>
                                <button
                                  onClick={() => setEditingProgressIds((p) => { const n = new Set(p); n.delete(task.id); return n; })}
                                  className="text-[10px] text-gray-400 hover:text-gray-600"
                                >✕</button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1 cursor-pointer group"
                                onClick={() => setEditingProgressIds((p) => new Set(p).add(task.id))}
                                title="Tahrirlash uchun bosing"
                              >
                                <span className="text-xs font-medium">{progressEdits[task.id]?.actualVolume || task.actualVolume || "—"}</span>
                                <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 text-center">
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[task.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadPdf(task.id, file);
                                e.target.value = "";
                              }}
                            />
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => fileInputRefs.current[task.id]?.click()}
                                disabled={progressEdits[task.id]?.uploading}
                                className="text-[10px] bg-green-600 hover:bg-green-700 text-white rounded px-1.5 py-0.5 disabled:opacity-50 whitespace-nowrap"
                              >
                                {progressEdits[task.id]?.uploading ? "Yuklanmoqda..." : "PDF yuklash"}
                              </button>
                              {(() => {
                                const rawUrl = progressEdits[task.id]?.pdfUrl ?? task.pdfUrl;
                                if (!rawUrl) return null;
                                const href = rawUrl.startsWith("/api/") ? rawUrl : `/api${rawUrl}`;
                                return (
                                  <div className="flex flex-col items-center gap-0.5 w-full">
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] text-blue-600 underline hover:text-blue-800"
                                    >
                                      📄 Ko'rish
                                    </a>
                                    {isAdminOrManager && task.status !== "completed" && (
                                      <div className="flex gap-1 mt-0.5">
                                        <button
                                          onClick={() => approveTask(task.id)}
                                          disabled={progressEdits[task.id]?.approving || progressEdits[task.id]?.rejecting}
                                          className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-0.5 disabled:opacity-50 whitespace-nowrap font-medium"
                                        >
                                          {progressEdits[task.id]?.approving ? "..." : "✓ Tasdiqlash"}
                                        </button>
                                        <button
                                          onClick={() => rejectTask(task.id)}
                                          disabled={progressEdits[task.id]?.approving || progressEdits[task.id]?.rejecting}
                                          className="text-[10px] bg-red-500 hover:bg-red-600 text-white rounded px-2 py-0.5 disabled:opacity-50 whitespace-nowrap font-medium"
                                        >
                                          {progressEdits[task.id]?.rejecting ? "..." : "✗ Rad qilish"}
                                        </button>
                                      </div>
                                    )}
                                    {task.status === "completed" && (
                                      <span className="text-[10px] text-emerald-700 font-semibold">✓ Tasdiqlangan</span>
                                    )}
                                    {task.status !== "completed" && !isAdminOrManager && (
                                      <span className="text-[10px] text-amber-600 font-semibold">⏳ Tasdiqlash kutilmoqda</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        </>
                      )}

                      {!isLocked && (
                        <td className="px-1 py-2 text-center">
                          {isInlineEditing ? (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={saveInlineEdit}
                                disabled={updateTaskMutation.isPending}
                                className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-0.5 disabled:opacity-50 whitespace-nowrap font-medium"
                              >
                                {updateTaskMutation.isPending ? "..." : t("btn_save")}
                              </button>
                              <button
                                onClick={() => setInlineEditTask(null)}
                                className="text-[10px] text-gray-500 hover:text-gray-700"
                              >
                                {t("btn_cancel")}
                              </button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(task)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" />Tahrirlash
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { setSelectedTask(task); setIsDeleteDialogOpen(true); }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />O'chirish
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {addingSection ? "Bo'lim sarlavhasi qo'shish" : "Yangi vazifa qo'shish"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitTask)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {addingSection ? "Bo'lim" : "Chora-tadbirlar (vazifa nomi)"}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      {addingSection ? (
                        <select
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— Bo'limni tanlang —</option>
                          {departmentsData.map((dept) => (
                            <option key={dept.id} value={dept.name}>{d(dept.name)}</option>
                          ))}
                        </select>
                      ) : (
                        <Textarea
                          placeholder="Vazifa nomini kiriting..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!addingSection && (
                <>
                  <FormField
                    control={form.control}
                    name="implementationMechanism"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amalga oshirish mexanizmi</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Mexanizm..." className="resize-none" rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsiblePerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birgalikda bajaradigan ijrochi</FormLabel>
                        <FormControl>
                          <MultiEmployeeSelect
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            options={employeeOptions}
                            placeholder="— Ijrochi(larni) tanlang —"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fundingSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Moliyalashtirish manbalari</FormLabel>
                          <FormControl>
                            <Input placeholder="Manba yoki summa..." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitOfMeasure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>O'lchov birligi</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Tanlang..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {UNIT_OPTIONS.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plannedVolume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reja (hajm)</FormLabel>
                          <FormControl>
                            <Input placeholder="100" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actualVolume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amalda (bajarilgan)</FormLabel>
                          <FormControl>
                            <Input placeholder="71" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="controller"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tasdiqlovchi</FormLabel>
                        <FormControl>
                          <select
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">— Tanlang —</option>
                            {employeeOptions.map((e) => (
                              <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hudud</FormLabel>
                        <select
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Tanlang...</option>
                          {locationOptions.map((l) => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualResult"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Haqiqiy natija (izoh)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Bajarilgan natija haqida..." className="resize-none" rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="completionPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bajarilishi % (0–100)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} max={100} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holati</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Kutilmoqda</SelectItem>
                              <SelectItem value="in_progress">Jarayonda</SelectItem>
                              <SelectItem value="completed">Bajarildi</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                  {t("btn_cancel")}
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                  {createTaskMutation.isPending || updateTaskMutation.isPending ? t("btn_saving") : t("btn_save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>O'chirishni tasdiqlang</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bu qatorni o'chirmoqchimisiz?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t("btn_cancel")}</Button>
            <Button variant="destructive"
              onClick={() => selectedTask && deleteTaskMutation.mutate({ id, taskId: selectedTask.id })}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? t("btn_deleting") : t("btn_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Ish rejani tasdiqlash</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Izoh (ixtiyoriy)..."
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>{t("btn_cancel")}</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate({ id, data: { comment: approveComment } })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Ish rejani rad qilish</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Rad qilish sababi (ixtiyoriy)..."
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="resize-none border-red-200 focus-visible:ring-red-400"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>{t("btn_cancel")}</Button>
            <Button
              variant="destructive"
              onClick={rejectPlan}
              disabled={isRejecting}
            >
              {isRejecting ? "Rad qilinmoqda..." : "Rad qilish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
