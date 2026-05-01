import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronLeft, Save, Send, AlignLeft, Sparkles } from "lucide-react";
import {
  useCreateWorkPlan,
  useSubmitWorkPlan,
  getListWorkPlansQueryKey,
  useListEmployees,
  getListEmployeesQueryKey,
  customFetch,
  useGetMe,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { MultiEmployeeSelect } from "@/components/multi-employee-select";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegion } from "@/lib/region-context";
import { useLang } from "@/lib/lang-context";
import { getUnitOptions } from "@/lib/unit-options";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const UZ_MONTHS = [
  "yanvar","fevral","mart","aprel","may","iyun",
  "iyul","avgust","sentabr","oktabr","noyabr","dekabr",
];

type RowType = "section" | "task";

type Row = {
  id: string;
  type: RowType;
  title: string;
  implementationMechanism: string;
  fundingSource: string;
  unitOfMeasure: string;
  plannedVolume: string;
  responsiblePerson: string;
  location: string;
  controller: string;
};

const newId = () => Math.random().toString(36).slice(2);

const emptyTask = (): Row => ({
  id: newId(), type: "task",
  title: "", implementationMechanism: "", fundingSource: "",
  unitOfMeasure: "", plannedVolume: "", responsiblePerson: "", location: "", controller: "",
});

const emptySection = (): Row => ({
  id: newId(), type: "section",
  title: "", implementationMechanism: "", fundingSource: "",
  unitOfMeasure: "", plannedVolume: "", responsiblePerson: "", location: "", controller: "",
});

const currentMonth = new Date().toISOString().slice(0, 7);

export default function WorkPlanCreate() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { lang, d } = useLang();
  const { selectedViloyat, selectedTuman } = useRegion();
  const UNIT_OPTIONS = useMemo(() => getUnitOptions(lang), [lang]);
  const { data: currentUser } = useGetMe();

  const { data: mfylarData = [] } = useQuery({
    queryKey: ["mfylar", selectedTuman],
    queryFn: () => {
      const params = selectedTuman ? `?tuman=${encodeURIComponent(selectedTuman)}` : "";
      return customFetch<{ id: number; name: string }[]>(`${BASE}/api/mfylar${params}`);
    },
    staleTime: 0,
  });

  const locationOptions = useMemo(
    () => mfylarData.map((m) => ({ value: m.name, label: m.name })),
    [mfylarData],
  );

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

  const [employeeId, setEmployeeId] = useState("");
  // Global app_settings.workPlanCreatePeriod — super admin tomonidan belgilanadi.
  // Super admin (5279606) uchun chegara yo'q.
  const isSuperUser = (currentUser as any)?.username === "5279606";
  const { data: appSettings } = useQuery<{ workPlanCreatePeriod: string | null; resultsEnterPeriod: string | null }>({
    queryKey: ["app-settings"],
    queryFn: () => customFetch(`${BASE}/api/app-settings`),
    staleTime: 0,
  });
  const restrictedCreatePeriod: string | null =
    !isSuperUser && appSettings?.workPlanCreatePeriod ? appSettings.workPlanCreatePeriod : null;
  const [period, setPeriod] = useState(restrictedCreatePeriod || currentMonth);
  // Period restriction o'zgarsa avtomatik o'rnatish
  useEffect(() => {
    if (restrictedCreatePeriod && period !== restrictedCreatePeriod) {
      setPeriod(restrictedCreatePeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restrictedCreatePeriod]);
  const [rows, setRows] = useState<Row[]>([emptyTask()]);
  const [submitAfterSave, setSubmitAfterSave] = useState(false);
  const [kpiLoaded, setKpiLoaded] = useState(false);

  const { data: employees } = useListEmployees(undefined, {
    query: { queryKey: getListEmployeesQueryKey() },
  });

  const employeeOptions = ((employees as any[] | undefined) ?? []).map((e: any) => ({
    value: e.fullName as string,
    label: e.fullName as string,
  }));

  useEffect(() => {
    if (employeeId) return;
    // 1. Bevosita users.employee_id orqali bog'langan bo'lsa
    if (currentUser?.employeeId) {
      setEmployeeId(String(currentUser.employeeId));
      return;
    }
    // 2. employee_id bog'lanmagan bo'lsa — full_name bo'yicha employees ro'yxatida qidirish
    if (currentUser?.role === "employee" && currentUser?.fullName && employees) {
      const list: any[] = Array.isArray(employees)
        ? (employees as any[])
        : (employees as any)?.employees ?? [];
      const match = list.find(
        (e: any) => e.fullName?.toLowerCase().trim() === currentUser.fullName?.toLowerCase().trim()
      );
      if (match) {
        setEmployeeId(String(match.id));
      }
    }
  }, [currentUser?.employeeId, currentUser?.fullName, currentUser?.role, employees]);

  useEffect(() => {
    if (!approverName) return;
    setRows((prev) =>
      prev.map((r) =>
        r.type === "task" && !r.controller ? { ...r, controller: approverName } : r,
      ),
    );
  }, [approverName]);

  // Tanlangan xodimga biriktirilgan KPI ko'rsatkichlari
  const { data: employeeKpis = [] } = useQuery<any[]>({
    queryKey: ["kpi-indicators-employee", employeeId],
    queryFn: () =>
      employeeId
        ? customFetch<any[]>(`${BASE}/api/kpi-indicators?employeeId=${employeeId}`)
        : Promise.resolve([]),
    enabled: !!employeeId,
    staleTime: 0,
  });

  // Xodim tanlanib, KPI ma'lumotlari kelganda — avtomatik to'ldirish
  useEffect(() => {
    if (!employeeId || kpiLoaded) return;
    if (!employeeKpis || employeeKpis.length === 0) return;
    const allEmpty = rows.every((r) => !r.title.trim());
    if (!allEmpty) return;
    const kpiRows: Row[] = employeeKpis.map((kpi: any) => ({
      id: newId(),
      type: "task" as RowType,
      title: kpi.name,
      implementationMechanism: "",
      fundingSource: "",
      unitOfMeasure: kpi.unit || "",
      plannedVolume: kpi.targetValue ? String(kpi.targetValue) : "",
      responsiblePerson: "",
      location: "",
      controller: approverName,
    }));
    setRows(kpiRows);
    setKpiLoaded(true);
  }, [employeeKpis, employeeId]);

  // Xodim o'zgarganda kpiLoaded reset
  const handleEmployeeChange = (newEmpId: string) => {
    setEmployeeId(newEmpId);
    setKpiLoaded(false);
  };

  const loadFromKpi = () => {
    if (!employeeKpis || employeeKpis.length === 0) return;
    const kpiRows: Row[] = employeeKpis.map((kpi: any) => ({
      id: newId(),
      type: "task" as RowType,
      title: kpi.name,
      implementationMechanism: "",
      fundingSource: "",
      unitOfMeasure: kpi.unit || "",
      plannedVolume: kpi.targetValue ? String(kpi.targetValue) : "",
      responsiblePerson: "",
      location: "",
      controller: approverName,
    }));
    setRows(kpiRows);
    toast({ title: "KPI ko'rsatkichlari yuklandi", description: `${kpiRows.length} ta vazifa qo'shildi` });
  };

  const submitMutation = useSubmitWorkPlan({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListWorkPlansQueryKey() });
        toast({ title: "Ish reja yuborildi", description: "Tasdiqlash uchun yuborildi" });
        setLocation(`/work-plans/${data.id}`);
      },
    },
  });

  const createMutation = useCreateWorkPlan({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListWorkPlansQueryKey() });
        if (submitAfterSave) {
          submitMutation.mutate({ id: data.id });
        } else {
          toast({ title: "Saqlandi", description: "Qoralama sifatida saqlandi" });
          setLocation(`/work-plans/${data.id}`);
        }
      },
      onError: () => {
        toast({ title: "Xatolik", description: "Ish reja saqlanmadi", variant: "destructive" });
      },
    },
  });

  const addTask = () =>
    setRows((p) => [...p, { ...emptyTask(), controller: approverName }]);
  const addSection = () => setRows((p) => [...p, emptySection()]);

  const removeRow = (id: string) =>
    setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));

  const updateRow = (id: string, field: keyof Row, value: string) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const handleSave = (andSubmit = false) => {
    const effectiveEmployeeId = employeeId || (currentUser?.employeeId ? String(currentUser.employeeId) : "");
    if (!period) { toast({ title: "Davrni kiriting", variant: "destructive" }); return; }

    const periodYear = period.slice(0, 4);
    const periodMonthIdx = parseInt(period.slice(5, 7)) - 1;
    const autoTitle = `${[viloyatDisplay, tumanDisplay, selectedEmployee?.fullName || currentUser?.fullName || ""].filter(Boolean).join(" ")} — ${periodYear}-yil ${UZ_MONTHS[periodMonthIdx] || ""} oyi ish rejasi`;

    setSubmitAfterSave(andSubmit);

    createMutation.mutate({
      data: {
        ...(effectiveEmployeeId ? { employeeId: parseInt(effectiveEmployeeId) } : {}),
        period,
        title: autoTitle,
        tasks: rows
          .filter((r) => r.title.trim())
          .map((r, i) => ({
            orderNum: i + 1,
            isSection: r.type === "section",
            title: r.title.trim(),
            implementationMechanism: r.implementationMechanism || undefined,
            fundingSource: r.fundingSource || undefined,
            unitOfMeasure: r.unitOfMeasure || undefined,
            plannedVolume: r.plannedVolume || undefined,
            responsiblePerson: r.responsiblePerson || undefined,
            location: r.location || undefined,
            controller: r.controller || undefined,
            completionPercentage: 0,
            status: "pending" as const,
          })),
      } as any,
    });
  };

  const selectedEmployee = (employees as any)?.find
    ? (employees as any).find((e: any) => e.id.toString() === employeeId)
    : (employees as any)?.employees?.find((e: any) => e.id.toString() === employeeId);

  const employeeList: any[] = Array.isArray(employees)
    ? (employees as any[])
    : (employees as any)?.employees ?? [];

  const taskCount = rows.filter((r) => r.type === "task" && r.title.trim()).length;
  const isPending = createMutation.isPending || submitMutation.isPending;

  const periodYear = period.slice(0, 4);
  const periodMonthIdx = parseInt(period.slice(5, 7)) - 1;
  const periodMonthName = UZ_MONTHS[periodMonthIdx] || "";

  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const viloyatRaw = cap(currentUser?.viloyat || "");
  const viloyatDisplay = viloyatRaw
    ? (viloyatRaw.toLowerCase().includes("viloyat") ? viloyatRaw : `${viloyatRaw} viloyati`)
    : "";

  const tumanRaw = cap(selectedEmployee?.tuman || currentUser?.tuman || selectedTuman || "");
  const tumanDisplay = tumanRaw
    ? (tumanRaw.toLowerCase().includes("tuman") ? tumanRaw : `${tumanRaw} tumani`)
    : "";

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: "calc(100vh - 8rem)" }}>
      {/* Top navigation bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/work-plans")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">Yangi ish reja yaratish</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* O'zbek tilida oy/yil tanlash */}
          <div className="flex items-center gap-1">
            <Select
              value={String(periodMonthIdx + 1).padStart(2, "0")}
              onValueChange={(v) => setPeriod(`${periodYear}-${v}`)}
              disabled={!!restrictedCreatePeriod}
            >
              <SelectTrigger className="h-8 text-xs w-32 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UZ_MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={periodYear}
              onValueChange={(v) => setPeriod(`${v}-${period.slice(5, 7)}`)}
              disabled={!!restrictedCreatePeriod}
            >
              <SelectTrigger className="h-8 text-xs w-20 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) =>
                  String(new Date().getFullYear() - 1 + i)
                ).map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {restrictedCreatePeriod && (
              <span className="text-[11px] text-amber-700 ml-1" title="Super admin tomonidan belgilangan oy">
                🔒
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isPending && !submitAfterSave ? "Saqlanmoqda..." : "Qoralama"}
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={isPending}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isPending && submitAfterSave ? "Yuborilmoqda..." : "Saqlash va yuborish"}
          </Button>
        </div>
      </div>

      {/* Admin uchun xodim tanlash + KPI yuklash */}
      {currentUser?.role !== "employee" && (
        <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-blue-800 whitespace-nowrap">Xodim:</label>
            <Select value={employeeId || "none"} onValueChange={(v) => handleEmployeeChange(v === "none" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs flex-1 border-blue-300 bg-white">
                <SelectValue placeholder="Xodimni tanlang..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Xodim tanlanmagan —</SelectItem>
                {employeeList.filter((e: any) => e.status === "active").map((emp: any) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {d(emp.fullName)}{emp.departmentName ? ` (${emp.departmentName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {employeeId && (employeeKpis as any[]).length > 0 && (
            <button
              onClick={loadFromKpi}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 border border-blue-400 hover:border-blue-600 bg-white px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              KPI ko'rsatkichlaridan to'ldirish ({(employeeKpis as any[]).length} ta)
            </button>
          )}
          {employeeId && (employeeKpis as any[]).length === 0 && (
            <span className="text-xs text-blue-500 italic">Bu xodimga KPI ko'rsatkich biriktirilmagan</span>
          )}
        </div>
      )}

      {/* Document container */}
      <div className="flex-1 flex flex-col bg-white border border-gray-300 shadow-sm rounded-sm mx-auto" style={{ maxWidth: "100%", fontFamily: "Times New Roman, serif" }}>

        {/* ── TASDIQLAYMAN + QR block ── */}
        <div className="flex justify-between items-start px-8 pt-6 pb-2">
          {/* Left: QR kod placeholder (bo'sh — faqat tasdiqlanganda ko'rinadi) */}
          <div className="border border-gray-300" style={{ minWidth: 100, minHeight: 100 }} />

          {/* Right: TASDIQLAYMAN */}
          <div className="text-right text-xs leading-6" style={{ minWidth: 220 }}>
            <p className="font-bold text-sm">"TASDIQLAYMAN"</p>
            {viloyatDisplay && <p>{viloyatDisplay}</p>}
            <p>{tumanDisplay || "________ tumani"}</p>
            <p>Suv yetkazib berish DM direktori</p>
            <p className="font-semibold">_______________</p>
            <p className="text-gray-400 text-[10px]">__.__.____ __:__</p>
          </div>
        </div>

        {/* ── Document header: viloyat + tuman + employee + period ── */}
        <div className="px-8 pt-4 pb-1 text-center">
          <p style={{ fontSize: 18, fontWeight: 600, lineHeight: "1.6" }}>
            {[
              viloyatDisplay,
              tumanDisplay,
              selectedEmployee?.fullName || currentUser?.fullName || "",
              `${periodYear}-yil ${periodMonthName} oyi`,
            ].filter(Boolean).join(" ")}
          </p>
          <p className="text-base font-bold uppercase tracking-wide mt-0.5">ISH REJASI</p>
        </div>

        {/* ── Jadval ── */}
        <div className="flex-1 px-4 pb-4 pt-3 overflow-x-auto">
          <table
            className="w-full text-xs border-collapse"
            style={{ borderColor: "#000", minWidth: 1100, fontFamily: "Times New Roman, serif" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#fff" }}>
                {[
                  { label: "№", w: 32 },
                  { label: "Chora-tadbirlar", w: 200 },
                  { label: "Amalga oshirish mexanizmi", w: 180 },
                  { label: "Moliyalashtirish manbalari", w: 110 },
                  { label: "Birgalikda bajaradigan ijrochi", w: 150 },
                  { label: "O'lchov birligi", w: 70 },
                  { label: "Reja", w: 55 },
                  { label: "Amalda", w: 55 },
                  { label: "Bajarilishi %", w: 60 },
                ].map((col) => (
                  <th
                    key={col.label}
                    style={{
                      border: "1px solid #000",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontWeight: "bold",
                      width: col.w,
                      fontSize: 11,
                      lineHeight: 1.3,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
                <th style={{ border: "1px solid #000", width: 28, padding: 2 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isSection = row.type === "section";
                const taskNum = isSection
                  ? null
                  : i + 1 - rows.slice(0, i).filter((r) => r.type === "section").length;

                const cellStyle: React.CSSProperties = {
                  border: "1px solid #000",
                  padding: "3px 5px",
                  verticalAlign: "top",
                };
                const inputStyle: React.CSSProperties = {
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 11,
                  fontFamily: "Times New Roman, serif",
                  resize: "none" as const,
                  padding: 0,
                };

                return (
                  <tr key={row.id}>
                    <td style={{ ...cellStyle, textAlign: "center", color: "#555" }}>
                      {taskNum}
                    </td>

                    {isSection ? (
                      <td colSpan={8} style={cellStyle}>
                        <select
                          value={row.title}
                          onChange={(e) => updateRow(row.id, "title", e.target.value)}
                          style={{ ...inputStyle, fontWeight: "bold", cursor: "pointer" }}
                        >
                          <option value="">— Bo'limni tanlang —</option>
                          {departmentsData.map((dept) => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <>
                        <td style={cellStyle}>
                          <textarea
                            value={row.title}
                            onChange={(e) => updateRow(row.id, "title", e.target.value)}
                            placeholder="Vazifa..."
                            rows={3}
                            style={inputStyle}
                          />
                        </td>
                        <td style={cellStyle}>
                          <textarea
                            value={row.implementationMechanism}
                            onChange={(e) => updateRow(row.id, "implementationMechanism", e.target.value)}
                            placeholder="Mexanizm..."
                            rows={3}
                            style={inputStyle}
                          />
                        </td>
                        <td style={cellStyle}>
                          <input
                            value={row.fundingSource}
                            onChange={(e) => updateRow(row.id, "fundingSource", e.target.value)}
                            placeholder="Manba..."
                            style={inputStyle}
                          />
                        </td>
                        <td style={cellStyle}>
                          <MultiEmployeeSelect
                            compact
                            value={row.responsiblePerson ?? ""}
                            onChange={(val) => updateRow(row.id, "responsiblePerson", val)}
                            options={employeeOptions}
                            placeholder="— Tanlang —"
                          />
                        </td>
                        <td style={{ ...cellStyle, textAlign: "center" }}>
                          <select
                            value={row.unitOfMeasure || ""}
                            onChange={(e) => updateRow(row.id, "unitOfMeasure", e.target.value)}
                            style={{ ...inputStyle, textAlign: "center", cursor: "pointer" }}
                          >
                            <option value="">—</option>
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u.value} value={u.value}>{u.value}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...cellStyle, textAlign: "center" }}>
                          <input
                            value={row.plannedVolume}
                            onChange={(e) => updateRow(row.id, "plannedVolume", e.target.value)}
                            placeholder="0"
                            style={{ ...inputStyle, textAlign: "center" }}
                          />
                        </td>
                        <td style={{ ...cellStyle, textAlign: "center", color: "#999" }}>
                          —
                        </td>
                        <td style={{ ...cellStyle, textAlign: "center", color: "#999" }}>
                          0
                        </td>
                      </>
                    )}

                    <td style={{ ...cellStyle, textAlign: "center", padding: 2 }}>
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        style={{
                          color: rows.length <= 1 ? "#ccc" : "#ef4444",
                          cursor: rows.length <= 1 ? "default" : "pointer",
                          background: "none",
                          border: "none",
                          padding: 2,
                        }}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add row buttons */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={addTask}
              className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 border border-blue-300 px-3 py-1 rounded hover:bg-blue-50"
            >
              <Plus className="h-3 w-3" />
              Vazifa qo'shish
            </button>
            <button
              onClick={addSection}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
            >
              <AlignLeft className="h-3 w-3" />
              Bo'lim sarlavhasi
            </button>
          </div>
        </div>

      </div>

      {/* Bottom action row */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/work-plans")} className="text-muted-foreground">
          Bekor qilish
        </Button>
        <div className="flex gap-2.5">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isPending && !submitAfterSave ? "Saqlanmoqda..." : "Qoralama saqlash"}
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={isPending}>
            <Send className="h-4 w-4 mr-2" />
            {isPending && submitAfterSave ? "Yuborilmoqda..." : "Saqlash va yuborish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
