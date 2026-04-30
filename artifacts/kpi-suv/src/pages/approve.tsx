import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useGetMe } from "@workspace/api-client-react";
import {
  CheckCircle2, XCircle, ClipboardList, BarChart3,
  FileDown, Clock, AlertCircle, BadgeCheck, Eye,
} from "lucide-react";
import { exportToXlsx } from "@/lib/export-xlsx";
import { getViloyatLabel } from "@/lib/viloyatlar";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TFn = (k: string) => string;

function getStatusConfig(t: TFn): Record<string, { label: string; color: string; icon: any }> {
  return {
    pending:   { label: t("status_pending"),   color: "bg-amber-100 text-amber-700 border-amber-200",  icon: Clock },
    submitted: { label: t("status_submitted"), color: "bg-blue-100 text-blue-700 border-blue-200",     icon: Clock },
    approved:  { label: t("status_approved"),  color: "bg-green-100 text-green-700 border-green-200",  icon: BadgeCheck },
    rejected:  { label: t("status_rejected"),  color: "bg-red-100 text-red-700 border-red-200",        icon: XCircle },
    draft:     { label: t("status_draft"),     color: "bg-gray-100 text-gray-600 border-gray-200",     icon: AlertCircle },
  };
}

function StatusBadge({ status }: { status: string }) {
  const { t, d } = useLang();
  const statusConfig = getStatusConfig(t as TFn);
  const cfg = statusConfig[status] ?? statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md border ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function getStatusBadge(status: string, t: TFn) {
  switch (status) {
    case "draft":     return <Badge variant="secondary">{t("status_draft")}</Badge>;
    case "submitted": return <Badge className="bg-blue-500 hover:bg-blue-600">{t("status_submitted")}</Badge>;
    case "approved":  return <Badge className="bg-green-500 hover:bg-green-600">{t("status_approved")}</Badge>;
    case "rejected":  return <Badge className="bg-red-500 hover:bg-red-600">{t("status_rejected")}</Badge>;
    default:          return <Badge variant="secondary">{status}</Badge>;
  }
}

function getTaskStatusConfig(t: TFn): Record<string, { label: string; className: string }> {
  return {
    pending:     { label: t("status_pending"),     className: "bg-gray-100 text-gray-600" },
    in_progress: { label: t("status_in_progress"), className: "bg-blue-100 text-blue-700" },
    completed:   { label: t("status_completed"),   className: "bg-green-100 text-green-700" },
  };
}

function getPlanStatusConfig(t: TFn): Record<string, { label: string; className: string }> {
  return {
    draft:     { label: t("status_draft"),     className: "bg-gray-100 text-gray-600 border-gray-200" },
    submitted: { label: t("status_submitted"), className: "bg-blue-100 text-blue-700 border-blue-200" },
    approved:  { label: t("status_approved"),  className: "bg-green-100 text-green-700 border-green-200" },
    rejected:  { label: t("status_rejected"),  className: "bg-red-100 text-red-700 border-red-200" },
  };
}

function PlanStatusBadge({ status }: { status: string }) {
  const { t, d } = useLang();
  const cfg = getPlanStatusConfig(t as TFn)[status] ?? { label: status, className: "" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

/* ─── Work Plan Detail Modal ─── */
function WorkPlanDetailModal({
  plan,
  open,
  onClose,
  onApprove,
  onReject,
  isPending,
}: {
  plan: any;
  open: boolean;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (plan: any) => void;
  isPending: boolean;
}) {
  const { t, d } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const isIjroResponsibleUser = !!(user as any)?.isIjroResponsible;
  const isMehnatResponsibleUser = !!(user as any)?.isMehnatResponsible;

  // Modal ochilganda to'liq plan ma'lumotini (tasks bilan) olish
  const { data: fullPlan } = useQuery<any>({
    queryKey: ["/api/work-plans", plan?.id],
    queryFn: () => customFetch<any>(`${BASE}/api/work-plans/${plan!.id}`),
    enabled: !!plan?.id && open,
  });

  // Ijro/Mehnat avto-vazifalarini topish (planlangan tasks ichidan)
  const tasksAll = fullPlan?.tasks ?? plan?.tasks ?? [];
  const ijroTask = tasksAll.find((t: any) => t.category === "ijro");
  const mehnatTask = tasksAll.find((t: any) => t.category === "mehnat");
  const showIjroBlock = isIjroResponsibleUser && !!ijroTask;
  const showMehnatBlock = isMehnatResponsibleUser && !!mehnatTask;

  // Edit state
  const [ijroEdit, setIjroEdit] = useState<{ planned: string; actual: string; late: string; un: string; saving: boolean }>({ planned: "", actual: "", late: "", un: "", saving: false });
  const [mehnatEdit, setMehnatEdit] = useState<{ ball: string; saving: boolean }>({ ball: "", saving: false });

  // fullPlan kelganda mavjud qiymatlarni state'ga yuklash
  useEffect(() => {
    if (ijroTask) {
      setIjroEdit({
        planned: ijroTask.plannedVolume ?? "",
        actual: ijroTask.actualVolume ?? "",
        late: ijroTask.ijroLate != null ? String(ijroTask.ijroLate) : "",
        un: ijroTask.ijroUnexecuted != null ? String(ijroTask.ijroUnexecuted) : "",
        saving: false,
      });
    }
  }, [ijroTask?.id, ijroTask?.plannedVolume, ijroTask?.actualVolume, ijroTask?.ijroLate, ijroTask?.ijroUnexecuted]);

  useEffect(() => {
    if (mehnatTask) {
      setMehnatEdit({
        ball: mehnatTask.mehnatResult ?? "",
        saving: false,
      });
    }
  }, [mehnatTask?.id, mehnatTask?.mehnatResult]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/work-plans", plan?.id] });
    queryClient.invalidateQueries({ queryKey: ["approve-work-plans"] });
  };

  const saveIjro = async () => {
    if (!ijroTask || !plan) return;
    setIjroEdit((p) => ({ ...p, saving: true }));
    try {
      await customFetch(`${BASE}/api/work-plans/${plan.id}/tasks/${ijroTask.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannedVolume: ijroEdit.planned || null,
          actualVolume: ijroEdit.actual || null,
          ijroLate: ijroEdit.late ? parseInt(ijroEdit.late) : null,
          ijroUnexecuted: ijroEdit.un ? parseInt(ijroEdit.un) : null,
        }),
      } as any);
      toast({ title: "Saqlandi" });
      refresh();
    } catch {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setIjroEdit((p) => ({ ...p, saving: false }));
    }
  };

  const saveMehnat = async () => {
    if (!mehnatTask || !plan) return;
    const raw = (mehnatEdit.ball ?? "").toString().replace(",", ".").trim();
    if (raw !== "") {
      const n = Number(raw);
      if (isNaN(n) || n < 0 || n > 5) {
        toast({ title: "Ball 0–5 oralig'ida bo'lishi kerak", variant: "destructive" });
        return;
      }
    }
    setMehnatEdit((p) => ({ ...p, saving: true }));
    try {
      await customFetch(`${BASE}/api/work-plans/${plan.id}/tasks/${mehnatTask.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mehnatResult: raw === "" ? null : raw }),
      } as any);
      toast({ title: "Saqlandi" });
      refresh();
    } catch {
      toast({ title: "Xatolik yuz berdi", variant: "destructive" });
    } finally {
      setMehnatEdit((p) => ({ ...p, saving: false }));
    }
  };

  if (!plan) return null;
  const canAct = plan.status === "submitted" || plan.status === "pending" || plan.status === "draft";
  const realTasks = (plan.tasks ?? []).filter((task: any) => !task.isSection);
  let taskCounter = 0;
  const taskStatusConfig = getTaskStatusConfig(t as TFn);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-[95vw] max-h-[95vh] overflow-y-auto p-0 gap-0">
        <DialogTitle className="sr-only">{d(plan.title)}</DialogTitle>
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{t("lbl_work_plans_breadcrumb")}</span>
            <span className="text-muted-foreground/50">›</span>
            <span className="text-sm font-medium">{d(plan.employeeName)}</span>
            <PlanStatusBadge status={plan.status} />
          </div>
          <div className="flex items-center gap-2">
            {canAct && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-50 h-8 text-xs"
                  onClick={() => { onClose(); onReject(plan); }}
                  disabled={isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />{t("btn_reject")}
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  onClick={() => { onApprove(plan.id); onClose(); }}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{t("btn_approve")}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>{t("btn_close")}</Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Plan header card */}
          <div className="rounded-xl border bg-card shadow-sm">
            {/* Stamps */}
            <div className="grid grid-cols-2 border-b">
              <div className="p-4 border-r">
                <div className="text-xs font-bold uppercase text-muted-foreground mb-1">{t("lbl_agreed")}</div>
                {plan.status === "approved" ? (
                  <div className="text-sm">
                    <div className="font-medium">{d(plan.employeeName)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{plan.createdAt?.slice(0, 10)}</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">{t("lbl_awaiting")}</div>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs font-bold uppercase text-muted-foreground mb-1">{t("lbl_confirmed")}</div>
                {plan.approvedByName ? (
                  <div className="text-sm">
                    <div className="font-medium text-green-700">{plan.approvedByName}</div>
                    {plan.approveComment && (
                      <div className="text-xs text-muted-foreground mt-0.5 italic">"{plan.approveComment}"</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">{t("lbl_not_approved_yet")}</div>
                )}
              </div>
            </div>

            {/* Centered title */}
            <div className="p-5 text-center border-b bg-muted/20">
              <h1 className="font-bold text-base leading-snug">{d(plan.title)}</h1>
              <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                <span>{d(plan.employeeName)}</span>
                <span>•</span>
                <span>{d(plan.departmentName)}</span>
                <span>•</span>
                <span>{t("lbl_period")}: {plan.period}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="px-5 py-3 flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {t("lbl_tasks")}: <span className="font-medium text-foreground">{realTasks.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{t("lbl_completion_percent")}:</span>
                <span className="font-semibold">{plan.completedTaskCount}/{plan.taskCount}</span>
                <Progress value={plan.overallProgress} className="h-2 w-[100px]" />
                <span className="font-bold text-primary">{Math.round(plan.overallProgress ?? 0)}%</span>
              </div>
            </div>
          </div>

          {/* Submitted notice */}
          {plan.status === "submitted" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 text-sm text-amber-800">
              <span className="text-lg">📋</span>
              <span>{t("lbl_submitted_notice")}</span>
            </div>
          )}

          {/* Ijro intizomi mas'uli uchun kiritish bloki */}
          {showIjroBlock && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/10 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded uppercase tracking-wide">Ijro intizomi</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ijro.gov xat-hujjatlar — bu ijrochi uchun ko'rsatkichlarni kiriting</span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-[11px] text-gray-700 dark:text-gray-300">
                  <span className="block mb-1 font-medium">Kelib tushgan</span>
                  <input className="w-24 border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500" type="number" min="0" value={ijroEdit.planned} onChange={(e) => setIjroEdit((p) => ({ ...p, planned: e.target.value }))} />
                </label>
                <label className="text-[11px] text-gray-700 dark:text-gray-300">
                  <span className="block mb-1 font-medium">Bajarilgan</span>
                  <input className="w-24 border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500" type="number" min="0" value={ijroEdit.actual} onChange={(e) => setIjroEdit((p) => ({ ...p, actual: e.target.value }))} />
                </label>
                <label className="text-[11px] text-gray-700 dark:text-gray-300">
                  <span className="block mb-1 font-medium">Muddatdan kech</span>
                  <input className="w-24 border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500" type="number" min="0" value={ijroEdit.late} onChange={(e) => setIjroEdit((p) => ({ ...p, late: e.target.value }))} />
                </label>
                <label className="text-[11px] text-gray-700 dark:text-gray-300">
                  <span className="block mb-1 font-medium">Bajarilmagan</span>
                  <input className="w-24 border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500" type="number" min="0" value={ijroEdit.un} onChange={(e) => setIjroEdit((p) => ({ ...p, un: e.target.value }))} />
                </label>
                <div className="flex flex-col items-center px-3 border-l border-amber-200">
                  <div className="text-[10px] text-gray-500 uppercase">KPI</div>
                  <div className="text-base font-bold text-amber-700">{(() => {
                    const pl = parseFloat(ijroEdit.planned || "0");
                    const ac = parseFloat(ijroEdit.actual || "0");
                    return pl > 0 ? `${Math.min(100, Math.max(0, Math.round((ac / pl) * 100)))}%` : "—";
                  })()}</div>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-9 text-xs" onClick={saveIjro} disabled={ijroEdit.saving}>
                  {ijroEdit.saving ? "..." : "Saqlash"}
                </Button>
              </div>
            </div>
          )}

          {/* Mehnat intizomi (Malaka talabi) mas'uli uchun kiritish bloki */}
          {showMehnatBlock && (
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded uppercase tracking-wide">Malaka talabi</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Xodimning malaka talabi — 0–5 ball oralig'ida baholang</span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-[11px] text-gray-700 dark:text-gray-300">
                  <span className="block mb-1 font-medium">Ball (0–5)</span>
                  <input
                    className="w-32 border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    type="number" min="0" max="5" step="0.1"
                    value={mehnatEdit.ball}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") { setMehnatEdit((p) => ({ ...p, ball: "" })); return; }
                      const n = Number(raw.replace(",", "."));
                      if (isNaN(n)) { setMehnatEdit((p) => ({ ...p, ball: raw })); return; }
                      if (n > 5) { setMehnatEdit((p) => ({ ...p, ball: "5" })); return; }
                      if (n < 0) { setMehnatEdit((p) => ({ ...p, ball: "0" })); return; }
                      setMehnatEdit((p) => ({ ...p, ball: raw }));
                    }}
                    placeholder="masalan 4.5"
                  />
                </label>
                <div className="flex flex-col items-center px-3 border-l border-emerald-200">
                  <div className="text-[10px] text-gray-500 uppercase">KPI</div>
                  <div className="text-base font-bold text-emerald-700">{(() => {
                    const s = (mehnatEdit.ball ?? "").toString().replace(",", ".").trim();
                    if (s === "") return "—";
                    const n = Number(s);
                    if (isNaN(n)) return "—";
                    const c = Math.min(5, Math.max(0, n));
                    return `${Math.round((c / 5) * 100)}%`;
                  })()}</div>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs" onClick={saveMehnat} disabled={mehnatEdit.saving}>
                  {mehnatEdit.saving ? "..." : "Saqlash"}
                </Button>
              </div>
            </div>
          )}

          {/* Main table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-primary/5 flex items-center justify-between">
              <span className="font-semibold text-sm text-primary">{t("lbl_plan_tasks_table")}</span>
            </div>

            {!plan.tasks?.length ? (
              <div className="py-14 text-center text-muted-foreground text-sm">{t("lbl_no_tasks")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
                  <thead>
                    <tr className="bg-[#1565C0] text-white">
                      <th className="w-8 px-2 py-2.5 text-center border-r border-blue-400">№</th>
                      <th className="min-w-[180px] px-2 py-2.5 text-left border-r border-blue-400">{t("lbl_plan_measures")}</th>
                      <th className="min-w-[140px] px-2 py-2.5 text-left border-r border-blue-400">{t("lbl_mechanism")}</th>
                      <th className="min-w-[100px] px-2 py-2.5 text-left border-r border-blue-400">{t("lbl_funding")}</th>
                      <th className="min-w-[70px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_unit")}</th>
                      <th className="min-w-[55px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_planned")}</th>
                      <th className="min-w-[55px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_actual")}</th>
                      <th className="min-w-[65px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_completion")}%</th>
                      <th className="min-w-[130px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_executor_col")}</th>
                      <th className="min-w-[110px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_location_col")}</th>
                      <th className="min-w-[110px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_controller_col")}</th>
                      <th className="min-w-[80px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_status")}</th>
                      <th className="min-w-[110px] px-2 py-2.5 text-center border-r border-blue-400">{t("lbl_actual")}</th>
                      <th className="min-w-[90px] px-2 py-2.5 text-center border-blue-400">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.tasks.map((task: any) => {
                      const isSection = task.isSection;
                      if (!isSection) taskCounter++;
                      const rowNum = isSection ? null : taskCounter;
                      return (
                        <tr
                          key={task.id}
                          className={isSection
                            ? "bg-blue-50 border-b font-semibold"
                            : "border-b hover:bg-muted/20"
                          }
                        >
                          <td className="px-2 py-2 text-center border-r text-muted-foreground">{rowNum}</td>
                          {isSection ? (
                            <td colSpan={13} className="px-3 py-2 border-r text-blue-800 text-xs font-semibold">
                              {task.title}
                            </td>
                          ) : (
                            <>
                              <td className="px-2 py-2 border-r leading-snug">{task.title}</td>
                              <td className="px-2 py-2 border-r text-muted-foreground leading-snug">{task.implementationMechanism || "—"}</td>
                              <td className="px-2 py-2 border-r text-muted-foreground">{task.fundingSource || "—"}</td>
                              <td className="px-2 py-2 border-r text-center text-muted-foreground">{task.unitOfMeasure || "—"}</td>
                              <td className="px-2 py-2 border-r text-center font-medium">{task.plannedVolume || "—"}</td>
                              <td className="px-2 py-2 border-r text-center font-medium text-blue-600">{task.actualVolume || "—"}</td>
                              <td className="px-2 py-2 border-r text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-bold">{task.completionPercentage ?? task.completionPercent ?? 0}%</span>
                                  <Progress value={task.completionPercentage ?? task.completionPercent ?? 0} className="h-1 w-12" />
                                </div>
                              </td>
                              <td className="px-2 py-2 border-r text-muted-foreground leading-snug">{task.responsiblePerson || "—"}</td>
                              <td className="px-2 py-2 border-r text-muted-foreground leading-snug">{task.location || "—"}</td>
                              <td className="px-2 py-2 border-r text-muted-foreground leading-snug">{task.controller || "—"}</td>
                              <td className="px-2 py-2 border-r text-center">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${taskStatusConfig[task.status]?.className ?? "bg-gray-100 text-gray-600"}`}>
                                  {taskStatusConfig[task.status]?.label ?? task.status}
                                </span>
                              </td>
                              <td className="px-2 py-1 border-r text-center">
                                <span className="text-xs font-medium text-gray-700">
                                  {task.actualVolume || "—"}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-center">
                                {task.pdfUrl ? (
                                  <a
                                    href={`${BASE}${task.pdfUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-blue-600 underline whitespace-nowrap"
                                  >
                                    {t("lbl_view_pdf")}
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">—</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Work Plans Tab ─── */
function WorkPlansTab({ filterStatus }: { filterStatus: string }) {
  const { t, d } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [viewPlan, setViewPlan] = useState<any>(null);

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["approve-work-plans", filterStatus],
    queryFn: () => customFetch<any[]>(`${BASE}/api/approve/work-plans?status=${filterStatus}`),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: number; action: string; comment?: string }) =>
      customFetch(`${BASE}/api/approve/work-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["approve-work-plans"] });
      setRejectOpen(false);
      setViewPlan(null);
      toast({ title: vars.action === "approve" ? t("toast_approved") : t("toast_rejected") });
    },
    onError: () => toast({ title: t("toast_error"), variant: "destructive" }),
  });

  const handleExport = () => {
    if (!data?.length) return;
    const statusConfig = getStatusConfig(t as TFn);
    exportToXlsx(
      data.map((p, i) => ({
        "№": i + 1,
        [t("lbl_employee_col")]: p.employeeName ?? "",
        [t("lbl_tuman")]: p.employeeTuman ?? "",
        [t("col_dept")]: p.departmentName ?? "",
        [t("lbl_period")]: p.period,
        [t("lbl_title")]: p.title,
        [t("lbl_status")]: statusConfig[p.status]?.label ?? p.status,
        [`${t("lbl_completion")} (%)`]: p.overallProgress,
        [t("col_date")]: new Date(p.createdAt).toLocaleDateString("uz-UZ"),
      })),
      "ish-rejalari",
      t("tab_work_plans"),
    );
  };

  const canAct = (status: string) =>
    status === "submitted" || status === "pending" || status === "draft";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <FileDown className="h-4 w-4 mr-1.5" />{t("btn_excel")}
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("lbl_employee_col")}</TableHead>
              <TableHead>{t("lbl_period")}</TableHead>
              <TableHead>{t("lbl_title")}</TableHead>
              <TableHead>{t("lbl_status")}</TableHead>
              <TableHead>{t("lbl_tasks")}</TableHead>
              <TableHead>{t("lbl_completion")}</TableHead>
              <TableHead className="text-right">{t("lbl_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {filterStatus === "pending" ? t("approve_pending_none_plan") : t("no_data_found")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setViewPlan(plan)}
                >
                  <TableCell className="font-medium">
                    <div>{d(plan.employeeName)}</div>
                    <div className="text-xs text-muted-foreground">{plan.employeeTuman ?? plan.departmentName}</div>
                  </TableCell>
                  <TableCell>{plan.period}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{d(plan.title)}</TableCell>
                  <TableCell>{getStatusBadge(plan.status, t as TFn)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.completedTaskCount ?? 0} / {plan.taskCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={plan.overallProgress ?? 0} className="h-2 w-[80px]" />
                      <span className="text-xs font-medium">{Math.round(plan.overallProgress ?? 0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setViewPlan(plan)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canAct(plan.status) && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-2 text-xs"
                            onClick={() => actionMutation.mutate({ id: plan.id, action: "approve" })}
                            disabled={actionMutation.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t("btn_approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-300 hover:bg-red-50 h-8 px-2 text-xs"
                            onClick={() => { setSelected(plan); setRejectComment(""); setRejectOpen(true); }}
                            disabled={actionMutation.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />{t("btn_reject_short")}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ish reja batafsil ko'rish modali */}
      <WorkPlanDetailModal
        plan={viewPlan}
        open={!!viewPlan}
        onClose={() => setViewPlan(null)}
        onApprove={(id) => actionMutation.mutate({ id, action: "approve" })}
        onReject={(plan) => { setSelected(plan); setRejectComment(""); setRejectOpen(true); }}
        isPending={actionMutation.isPending}
      />

      {/* Rad etish dialogi */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("approve_reject_plan_title")}</DialogTitle>
            <DialogDescription>"{selected?.title}" — {t("approve_reject_reason_opt")}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("approve_reject_reason_ph")}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t("btn_cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => actionMutation.mutate({ id: selected.id, action: "reject", comment: rejectComment })}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? t("btn_rejecting") : t("btn_reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Evaluations Tab ─── */
function EvaluationsTab({ filterStatus }: { filterStatus: string }) {
  const { t, d } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["approve-evaluations", filterStatus],
    queryFn: () => customFetch<any[]>(`${BASE}/api/approve/evaluations?status=${filterStatus}`),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, rejectionReason }: { id: number; action: string; rejectionReason?: string }) =>
      customFetch(`${BASE}/api/approve/evaluations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["approve-evaluations"] });
      setRejectOpen(false);
      toast({ title: vars.action === "approve" ? t("toast_approved") : t("toast_rejected") });
    },
    onError: () => toast({ title: t("toast_error"), variant: "destructive" }),
  });

  const handleExport = () => {
    if (!data?.length) return;
    const statusConfig = getStatusConfig(t as TFn);
    exportToXlsx(
      data.map((ev, i) => ({
        "№": i + 1,
        [t("lbl_employee_col")]: ev.employeeName ?? "",
        [t("lbl_tuman")]: ev.employeeTuman ?? "",
        [t("col_dept")]: ev.departmentName ?? "",
        [t("pg_kpi_categories")]: ev.categoryName ?? "",
        [t("pg_kpi_indicators")]: ev.indicatorName ?? "",
        [t("lbl_period")]: ev.period,
        [t("col_score")]: ev.score,
        "Max": ev.maxScore,
        "%": ev.percent,
        [t("lbl_status")]: statusConfig[ev.status]?.label ?? ev.status,
        [t("col_date")]: new Date(ev.createdAt).toLocaleDateString("uz-UZ"),
      })),
      "baholashlar",
      t("tab_evaluations"),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <FileDown className="h-4 w-4 mr-1.5" />{t("btn_excel")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : !data?.length ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filterStatus === "pending" ? t("approve_pending_none_eval") : t("no_data_found")}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((ev) => (
            <div key={ev.id} className="bg-white border rounded-xl p-4 shadow-sm flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusBadge status={ev.status} />
                  <span className="text-xs text-muted-foreground">{ev.period}</span>
                  {ev.categoryName && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                      {ev.categoryName}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm truncate">{ev.indicatorName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ev.employeeName} · {ev.employeeTuman ?? ev.departmentName}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-28 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ev.percent}%` }} />
                    </div>
                    <span className="text-xs font-medium">{ev.score}/{ev.maxScore}</span>
                    <span className="text-xs text-muted-foreground">({ev.percent}%)</span>
                  </div>
                </div>
                {ev.comment && <p className="text-xs text-muted-foreground italic mt-1">"{ev.comment}"</p>}
                {ev.rejectionReason && <p className="text-xs text-red-500 mt-1">{t("lbl_rejection_reason_prefix")} {ev.rejectionReason}</p>}
              </div>
              {ev.status === "pending" ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-300 hover:bg-green-50 h-8"
                    onClick={() => actionMutation.mutate({ id: ev.id, action: "approve" })}
                    disabled={actionMutation.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t("btn_approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-700 border-red-300 hover:bg-red-50 h-8"
                    onClick={() => { setSelected(ev); setRejectReason(""); setRejectOpen(true); }}
                    disabled={actionMutation.isPending}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />{t("btn_reject_short")}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("approve_reject_eval_title")}</DialogTitle>
            <DialogDescription>"{selected?.indicatorName}" — {t("approve_reject_reason_opt")}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("approve_reject_reason_ph")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t("btn_cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => actionMutation.mutate({ id: selected.id, action: "reject", rejectionReason: rejectReason })}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? t("btn_rejecting") : t("btn_reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Asosiy sahifa
═══════════════════════════════════════════════════════════ */
export default function ApprovePage() {
  const { t, d } = useLang();
  const { data: me } = useGetMe();
  const [activeTabKey, setActiveTabKey] = useState<"work_plans" | "evaluations">("work_plans");
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  const viloyatLabel = me?.viloyat ? getViloyatLabel(me.viloyat) : null;

  const TABS = [
    { key: "work_plans" as const,   label: t("tab_work_plans"),  icon: ClipboardList },
    { key: "evaluations" as const,  label: t("tab_evaluations"), icon: BarChart3 },
  ];

  const STATUS_TABS = [
    { key: "pending",  label: t("status_pending") },
    { key: "approved", label: t("status_approved") },
    { key: "rejected", label: t("status_rejected") },
    { key: "all",      label: t("status_all") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <BadgeCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("pg_approve")}</h1>
            <p className="text-xs text-gray-400">
              {viloyatLabel
                ? `${viloyatLabel}${me?.tuman ? ` · ${me.tuman}` : ""}`
                : t("approve_region_attached")}
            </p>
          </div>
        </div>
      </div>

      {/* Asosiy tablar */}
      <div className="border-b flex gap-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTabKey(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTabKey === key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-muted-foreground hover:text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterStatus === s.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tarkib */}
      {activeTabKey === "work_plans"
        ? <WorkPlansTab filterStatus={filterStatus} />
        : <EvaluationsTab filterStatus={filterStatus} />
      }
    </div>
  );
}
