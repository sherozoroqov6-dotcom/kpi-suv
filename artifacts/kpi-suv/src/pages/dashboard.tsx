import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRegion } from "@/lib/region-context";
import { useLang, Lang } from "@/lib/lang-context";
import { VILOYATLAR, getTumanlarByViloyat, getViloyatLabel } from "@/lib/viloyatlar";
import { Link } from "wouter";
import { 
  Users, 
  Building2, 
  Target, 
  TrendingUp, 
  MapPin,
  ChevronRight,
  Download,
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { exportMultiSheetXlsx } from "@/lib/export-xlsx";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
} from "recharts";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlobalPeriodSettings } from "@/components/global-period-settings";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WorkplanStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
  byMfy: { name: string; total: number; completed: number; rate: number }[];
  byTuman: { name: string; total: number; completed: number; inProgress: number; pending: number; rate: number }[];
  byDepartment: { name: string; total: number; completed: number; inProgress: number; pending: number; rate: number }[];
  byCoExecutor: { name: string; employeeId: number | null; total: number; completed: number; inProgress: number; pending: number; rate: number }[];
  tuman: string | null;
}

const ALL_TUMANS = "__all__";


function getPeriodRange(davrTuri: string, year: number, month: number) {
  const pad = (m: number) => String(m).padStart(2, "0");
  switch (davrTuri) {
    case "q1":     return { from: `${year}-01`, to: `${year}-03` };
    case "q2":     return { from: `${year}-04`, to: `${year}-06` };
    case "q3":     return { from: `${year}-07`, to: `${year}-09` };
    case "q4":     return { from: `${year}-10`, to: `${year}-12` };
    case "h1":     return { from: `${year}-01`, to: `${year}-06` };
    case "h2":     return { from: `${year}-07`, to: `${year}-12` };
    case "yillik": return { from: `${year}-01`, to: `${year}-12` };
    default:       return { from: `${year}-${pad(month)}`, to: `${year}-${pad(month)}` };
  }
}


const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 4 + i);

export default function Dashboard() {
  const {
    selectedViloyat, selectedTuman,
    setSelectedViloyat, setSelectedTuman,
    setShowAllTumans, setViloyatTumanlar,
    showAllTumans,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    davrTuri, setDavrTuri,
  } = useRegion();

  const { lang, setLang, t, translit, d: disp } = useLang();

  const MONTHS = useMemo(() => [
    { value: 1,  label: t("m1") },  { value: 2,  label: t("m2") },
    { value: 3,  label: t("m3") },  { value: 4,  label: t("m4") },
    { value: 5,  label: t("m5") },  { value: 6,  label: t("m6") },
    { value: 7,  label: t("m7") },  { value: 8,  label: t("m8") },
    { value: 9,  label: t("m9") },  { value: 10, label: t("m10") },
    { value: 11, label: t("m11") }, { value: 12, label: t("m12") },
  ], [lang]);

  const DAVR_OPTIONS = useMemo(() => [
    { value: "oylik",  label: t("davr_oylik") },
    { value: "q1",     label: t("davr_q1") },
    { value: "q2",     label: t("davr_q2") },
    { value: "q3",     label: t("davr_q3") },
    { value: "q4",     label: t("davr_q4") },
    { value: "h1",     label: t("davr_h1") },
    { value: "h2",     label: t("davr_h2") },
    { value: "yillik", label: t("davr_yillik") },
  ], [lang]);

  // tumanFilter: ALL_TUMANS if showAllTumans was true from prev session, else selectedTuman
  const [tumanFilter, setTumanFilter] = useState<string>(() => {
    if (showAllTumans) return ALL_TUMANS;
    return selectedTuman || "";
  });
  // Ref to read current tumanFilter in useEffect without adding it to deps
  const tumanFilterRef = useRef(tumanFilter);
  tumanFilterRef.current = tumanFilter;

  const { data: user } = useGetMe();

  // Foydalanuvchining viloyat/tumani bo'lsa — avtomatik o'rnatish
  useEffect(() => {
    if (!user) return;
    if (user.viloyat) {
      // Viloyatni har doim to'g'ri o'rnat (boshqa foydalanuvchi localStorage qoldiqlaridan himoya)
      if (selectedViloyat !== user.viloyat) {
        setSelectedViloyat(user.viloyat);
      }
      const tumans = getTumanlarByViloyat(user.viloyat);
      setViloyatTumanlar(tumans);
      setShowAllTumans(true);

      if (user.tuman) {
        // Foydalanuvchi aniq tumanga biriktirilgan — har doim majburlash
        // (boshqa foydalanuvchi localStorage qoldiqlaridan himoya)
        setSelectedTuman(user.tuman);
        setTumanFilter(user.tuman);
      } else if (!tumanFilterRef.current || tumanFilterRef.current === "") {
        // Faqat viloyat bor (tuman yo'q) — bo'sh bo'lsa barcha tumanlar
        setTumanFilter(ALL_TUMANS);
      }
    }
  }, [user?.viloyat, user?.tuman]);
  // Note: tumanFilterRef intentionally not in deps — we read via ref to avoid infinite loop

  const { from: pFrom, to: pTo } = getPeriodRange(davrTuri, selectedYear, selectedMonth);
  const selectedPeriod = pFrom; // used in monthly-trend & chart descriptions
  const displayPeriod = pFrom === pTo ? pFrom : `${pFrom} – ${pTo}`;
  const displayDavrLabel = DAVR_OPTIONS.find((d) => d.value === davrTuri)?.label ?? "";

  const activeTumanlar = useMemo(() => {
    return getTumanlarByViloyat(selectedViloyat);
  }, [selectedViloyat]);

  // When a new viloyat is selected → auto-switch to "Barcha tumanlar" for that viloyat
  const handleViloyatChange = (value: string) => {
    setSelectedViloyat(value);
    setSelectedTuman("");
    if (value) {
      setShowAllTumans(true);
      setViloyatTumanlar(getTumanlarByViloyat(value));
      setTumanFilter(ALL_TUMANS);
    } else {
      setShowAllTumans(false);
      setViloyatTumanlar([]);
      setTumanFilter("");
    }
  };

  const handleTumanChange = (value: string) => {
    setTumanFilter(value);
    if (value === ALL_TUMANS) {
      setSelectedTuman("");
      setShowAllTumans(true);
      setViloyatTumanlar(activeTumanlar);
    } else {
      setSelectedTuman(value);
      setShowAllTumans(false);
      setViloyatTumanlar([]);
    }
  };

  // Build query string helpers
  const buildParams = (extra: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();
    if (tumanFilter === ALL_TUMANS && activeTumanlar.length > 0) {
      params.set("tumans", activeTumanlar.join(","));
    } else if (tumanFilter && tumanFilter !== ALL_TUMANS) {
      params.set("tuman", tumanFilter);
    }
    if (pFrom === pTo) {
      params.set("period", pFrom);
    } else {
      params.set("periodFrom", pFrom);
      params.set("periodTo", pTo);
    }
    Object.entries(extra).forEach(([k, v]) => v !== undefined && params.set(k, v));
    return `?${params.toString()}`;
  };

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["dashboard-summary", tumanFilter, selectedViloyat, pFrom, pTo, davrTuri],
    queryFn: () => customFetch<any>(`${BASE}/api/dashboard/summary${buildParams()}`),
    staleTime: 0,
  });
  
  const { data: topEmployees, isLoading: isLoadingTop } = useQuery({
    queryKey: ["dashboard-top-employees", tumanFilter, selectedViloyat, pFrom, pTo, davrTuri],
    queryFn: () => customFetch<any[]>(`${BASE}/api/dashboard/top-employees${buildParams({ limit: "5" })}`),
    staleTime: 0,
  });

  const { data: top10Employees, isLoading: isLoadingTop10 } = useQuery({
    queryKey: ["dashboard-top10-employees", tumanFilter, selectedViloyat, pFrom, pTo, davrTuri],
    queryFn: () => customFetch<any[]>(`${BASE}/api/dashboard/top-employees${buildParams({ limit: "10" })}`),
    staleTime: 0,
  });

  const { data: deptScores, isLoading: isLoadingDepts } = useQuery({
    queryKey: ["dashboard-dept-scores", tumanFilter, selectedViloyat, pFrom, pTo, davrTuri],
    queryFn: () => customFetch<any[]>(`${BASE}/api/dashboard/department-scores${buildParams()}`),
    staleTime: 0,
  });

  const { data: recentEvals, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["dashboard-recent-evals", tumanFilter, selectedViloyat, pFrom, pTo, davrTuri],
    queryFn: () => customFetch<any[]>(`${BASE}/api/dashboard/recent-evaluations${buildParams({ limit: "5" })}`),
    staleTime: 0,
  });

  const buildTrendParams = () => {
    const params = new URLSearchParams();
    params.set("year", String(selectedYear));
    if (tumanFilter === ALL_TUMANS && activeTumanlar.length > 0) {
      params.set("tumans", activeTumanlar.join(","));
    } else if (tumanFilter && tumanFilter !== ALL_TUMANS) {
      params.set("tuman", tumanFilter);
    }
    return `?${params.toString()}`;
  };

  const { data: monthlyTrend, isLoading: isLoadingTrend } = useQuery({
    queryKey: ["dashboard-monthly-trend", tumanFilter, selectedViloyat, selectedYear],
    queryFn: () => customFetch<any[]>(`${BASE}/api/dashboard/monthly-trend${buildTrendParams()}`),
    staleTime: 0,
  });

  const { data: wpStats, isLoading: isLoadingWp } = useQuery<WorkplanStats>({
    queryKey: ["dashboard-workplan-stats", tumanFilter, selectedViloyat, pFrom, pTo, davrTuri],
    queryFn: () => customFetch<WorkplanStats>(`${BASE}/api/dashboard/workplan-stats${buildParams()}`),
    staleTime: 0,
  });

  const canDownload = !!(user?.viloyat || tumanFilter);

  const handleExportXlsx = () => {
    const regionLabel = tumanFilter && tumanFilter !== ALL_TUMANS
      ? tumanFilter
      : selectedViloyat || user?.viloyat || "Umumiy";

    const summarySheet = summary ? [
      { "Ko'rsatkich": "Jami xodimlar",       "Qiymat": summary.totalEmployees },
      { "Ko'rsatkich": "Bo'limlar soni",       "Qiymat": summary.totalDepartments },
      { "Ko'rsatkich": "KPI ko'rsatkichlari",  "Qiymat": summary.totalKpiIndicators },
      { "Ko'rsatkich": "O'rtacha ball (%)",    "Qiymat": summary.averageScore },
      { "Ko'rsatkich": "Baholashlar soni",     "Qiymat": summary.evaluationsThisMonth },
    ] : [];

    const topSheet = (top10Employees ?? []).map((e: any, i: number) => ({
      "№":               i + 1,
      "F.I.Sh":          e.fullName,
      "Bo'lim":          e.departmentName ?? "—",
      "Lavozim":         e.position ?? "—",
      "O'rtacha ball (%)": e.averageScore,
    }));

    const deptSheet = (deptScores ?? []).map((d: any, i: number) => ({
      "№":                i + 1,
      "Bo'lim nomi":      d.departmentName,
      "O'rtacha ball (%)":d.averageScore,
      "Xodimlar soni":    d.employeeCount,
    }));

    // Ish reja vazifalari holati
    const wpSummaryRows = wpStats ? [
      { "Ko'rsatkich": t("wp_total"),       "Qiymat": wpStats.total },
      { "Ko'rsatkich": t("wp_completed"),   "Qiymat": wpStats.completed },
      { "Ko'rsatkich": t("wp_in_progress"), "Qiymat": wpStats.inProgress },
      { "Ko'rsatkich": t("wp_pending"),     "Qiymat": wpStats.pending },
      { "Ko'rsatkich": t("wp_rate"),        "Qiymat": wpStats.completionRate },
    ] : [];

    const wpBreakdownRows = wpStats
      ? tumanFilter === ALL_TUMANS && wpStats.byTuman?.length > 0
        ? wpStats.byTuman.map((td: any) => ({
            "Tuman":              td.name,
            "Jami":               td.total,
            [t("wp_completed")]:  td.completed,
            "Bajarilish (%)":     td.rate,
          }))
        : (wpStats.byMfy ?? []).map((m: any) => ({
            "MFY":                m.name,
            "Jami":               m.total,
            [t("wp_completed")]:  m.completed,
            "Bajarilish (%)":     m.rate,
          }))
      : [];

    const sheets: { name: string; data: Record<string, any>[] }[] = [
      { name: "Xulosa",           data: summarySheet },
      { name: "Top xodimlar",     data: topSheet },
      { name: "Bo\'limlar",       data: deptSheet },
    ];
    if (wpSummaryRows.length > 0) {
      sheets.push({ name: "Ish reja holati",  data: wpSummaryRows });
    }
    if (wpBreakdownRows.length > 0) {
      sheets.push({
        name: tumanFilter === ALL_TUMANS ? "Tumanlar kesimi" : "MFY kesimi",
        data: wpBreakdownRows,
      });
    }

    exportMultiSheetXlsx(sheets, `KPI-${regionLabel}-${displayPeriod}`);
  };

  return (
    <div className="space-y-6">

      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, #1565C0 0%, #1e88e5 50%, #29b6f6 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-cyan-400/10 translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative px-6 pt-6 pb-5">
          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-cyan-400/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-cyan-300" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{t("dashboard_title")}</h1>
              </div>
              <p className="text-blue-200/80 text-sm">
                {t("welcome_subtitle")}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-blue-200/60 text-xs uppercase tracking-widest">{t("selected_period_label")}</span>
                <span className="text-xl font-bold text-white tabular-nums">{displayPeriod}</span>
                <span className="text-blue-200/60 text-xs">{displayDavrLabel}</span>
              </div>
              {canDownload && (
                <button
                  onClick={handleExportXlsx}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("xlsx_download")}
                </button>
              )}
            </div>
          </div>

          {/* Filter controls row */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Viloyat */}
            {user?.viloyat ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_viloyat")}</label>
                <div className="h-9 text-sm rounded-lg px-3 bg-white/10 border border-white/20 text-white flex items-center gap-1.5 min-w-[200px]">
                  <MapPin className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
                  <span className="font-medium">{getViloyatLabel(user.viloyat, lang)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_viloyat")}</label>
                <select
                  value={selectedViloyat}
                  onChange={(e) => handleViloyatChange(e.target.value)}
                  className="h-9 text-sm rounded-lg px-3 bg-white/10 border border-white/20 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/60 min-w-[200px] backdrop-blur"
                >
                  <option value="" className="text-gray-800">{t("filter_select_viloyat")}</option>
                  {VILOYATLAR.map((v) => (
                    <option key={v.value} value={v.value} className="text-gray-800">
                      {lang === "kril" ? v.labelKril : lang === "rus" ? v.labelRus : v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(user?.viloyat || selectedViloyat) && (
              <ChevronRight className="h-4 w-4 text-white/40 mb-1.5 hidden sm:block" />
            )}

            {/* Tuman */}
            {user?.viloyat && user?.tuman ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_tuman")}</label>
                <div className="h-9 text-sm rounded-lg px-3 bg-white/10 border border-white/20 text-white flex items-center gap-1.5 min-w-[200px]">
                  <MapPin className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
                  <span className="font-medium">{translit(user.tuman)}</span>
                </div>
              </div>
            ) : user?.viloyat && !user?.tuman ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_tuman")}</label>
                <select
                  value={tumanFilter}
                  onChange={(e) => handleTumanChange(e.target.value)}
                  className="h-9 text-sm rounded-lg px-3 bg-white/10 border border-white/20 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/60 min-w-[200px] backdrop-blur"
                >
                  <option value={ALL_TUMANS} className="text-gray-800">{t("filter_all_tumanlar")}</option>
                  {getTumanlarByViloyat(user.viloyat).map((tm) => (
                    <option key={tm} value={tm} className="text-gray-800">{translit(tm)}</option>
                  ))}
                </select>
              </div>
            ) : selectedViloyat ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_tuman")}</label>
                <select
                  value={tumanFilter}
                  onChange={(e) => handleTumanChange(e.target.value)}
                  className="h-9 text-sm rounded-lg px-3 bg-white/10 border border-white/20 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/60 min-w-[200px] backdrop-blur"
                >
                  <option value="" className="text-gray-800">{t("filter_select_tuman")}</option>
                  <option value={ALL_TUMANS} className="text-gray-800">{t("filter_all_tumanlar")}</option>
                  {activeTumanlar.map((tm) => (
                    <option key={tm} value={tm} className="text-gray-800">{translit(tm)}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="hidden sm:block w-px h-9 bg-white/20 self-end" />

            {/* Yil */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_yil")}</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 text-sm rounded-lg px-3 bg-white/10 border border-white/20 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/60 backdrop-blur"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="text-gray-800">{y}</option>
                ))}
              </select>
            </div>

            {/* Oy */}
            {davrTuri === "oylik" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_oy")}</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-9 text-sm rounded-lg px-3 bg-white/10 border border-white/20 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/60 backdrop-blur"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value} className="text-gray-800">{m.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="hidden sm:block w-px h-9 bg-white/20 self-end" />

            {/* Davr */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">{t("filter_davr")}</label>
              <select
                value={davrTuri}
                onChange={(e) => setDavrTuri(e.target.value)}
                className="h-9 text-sm rounded-lg px-3 bg-cyan-400/20 border border-cyan-300/40 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/60 backdrop-blur min-w-[160px]"
              >
                {DAVR_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value} className="text-gray-800">{d.label}</option>
                ))}
              </select>
            </div>

            <div className="hidden sm:block w-px h-9 bg-white/20 self-end" />

            {/* Til almashtirgich */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-widest">Til</label>
              <div className="flex gap-1 h-9 items-center">
                {(["lotin", "kril", "rus"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 h-full rounded-lg text-[11px] font-bold transition-all border ${
                      lang === l
                        ? "bg-white text-[#1565C0] border-white shadow"
                        : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {l === "lotin" ? "Lotin" : l === "kril" ? "Кирил" : "Рус"}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile download */}
            {canDownload && (
              <button
                onClick={handleExportXlsx}
                className="md:hidden flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all self-end"
              >
                <Download className="h-3.5 w-3.5" />
                xlsx
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Super admin uchun global oylar sozlamasi */}
      {user?.username === "5279606" && <GlobalPeriodSettings />}

      {/* Work Plan Stats Panel */}
      {tumanFilter && (
        <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-emerald-300/40" style={{ background: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #0d9488 100%)" }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg bg-black/15 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t("wp_title")}</h3>
            </div>
            {isLoadingWp ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/20" />)}
              </div>
            ) : wpStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: t("wp_total"),       value: wpStats.total,      bg: "bg-white/40" },
                    { label: t("wp_completed"),   value: wpStats.completed,  bg: "bg-white/50" },
                    { label: t("wp_in_progress"), value: wpStats.inProgress, bg: "bg-white/40" },
                    { label: t("wp_pending"),     value: wpStats.pending,    bg: "bg-white/40" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl ${s.bg} backdrop-blur px-4 py-3 text-center`}>
                      <div className="text-3xl font-bold text-gray-900">{s.value}</div>
                      <div className="text-sm font-medium text-gray-800 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-800">
                    <span className="font-medium">{t("wp_rate")}</span>
                    <span className="font-bold text-gray-900">{wpStats.completionRate}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-black/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gray-900 transition-all"
                      style={{ width: `${wpStats.completionRate}%` }}
                    />
                  </div>
                </div>
                {tumanFilter === ALL_TUMANS && (() => {
                  const apiMap = new Map((wpStats.byTuman ?? []).map((row) => [row.name, row]));
                  const displayList = activeTumanlar.length > 0
                    ? activeTumanlar.map((name) => apiMap.get(name) ?? { name, total: 0, completed: 0, inProgress: 0, pending: 0, rate: 0 })
                    : (wpStats.byTuman ?? []);
                  if (displayList.length === 0) return null;
                  return (
                    <div className="overflow-x-auto rounded-xl bg-white/30 backdrop-blur">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-black/10">
                            <th className="text-left py-2 px-3 font-bold text-gray-900">{t("wp_tuman_col")}</th>
                            <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_total_col")}</th>
                            <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_completed")}</th>
                            <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_in_progress")}</th>
                            <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_pending")}</th>
                            <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_holat_col")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayList.map((row, i) => (
                            <tr key={row.name} className={i % 2 === 0 ? "bg-white/20" : ""}>
                              <td className="py-2 px-3 font-semibold text-gray-900 max-w-[160px] truncate">{disp(row.name)}</td>
                              <td className="py-2 px-3 text-center font-medium text-gray-900">{row.total}</td>
                              <td className="py-2 px-3 text-center font-medium text-emerald-800">{row.completed}</td>
                              <td className="py-2 px-3 text-center font-medium text-blue-900">{row.inProgress}</td>
                              <td className="py-2 px-3 text-center font-medium text-gray-700">{row.pending}</td>
                              <td className="py-2 px-3 text-center font-semibold text-gray-900">{row.completed}/{row.total} ({row.rate}%)</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                {tumanFilter !== ALL_TUMANS && wpStats.byDepartment && wpStats.byDepartment.length > 0 && (
                  <div className="overflow-x-auto rounded-xl bg-white/30 backdrop-blur">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-black/10">
                          <th className="text-left py-2 px-3 font-bold text-gray-900">{t("wp_dept_col")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_total_col")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_completed")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_in_progress")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_pending")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_holat_col")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wpStats.byDepartment.map((d, i) => (
                          <tr key={d.name} className={i % 2 === 0 ? "bg-white/20" : ""}>
                            <td className="py-2 px-3 font-semibold text-gray-900 max-w-[160px] truncate">{disp(d.name)}</td>
                            <td className="py-2 px-3 text-center font-medium text-gray-900">{d.total}</td>
                            <td className="py-2 px-3 text-center font-medium text-emerald-800">{d.completed}</td>
                            <td className="py-2 px-3 text-center font-medium text-blue-900">{d.inProgress}</td>
                            <td className="py-2 px-3 text-center font-medium text-gray-700">{d.pending}</td>
                            <td className="py-2 px-3 text-center font-semibold text-gray-900">{d.completed}/{d.total} ({d.rate}%)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Birgalikda bajaradigan ijrochilar KPI */}
                {wpStats.byCoExecutor && wpStats.byCoExecutor.length > 0 && (
                  <div className="overflow-x-auto rounded-xl bg-white/30 backdrop-blur mt-1">
                    <div className="px-3 py-2 border-b border-black/10">
                      <span className="text-xs font-bold text-gray-900">{t("wp_co_executor_title")}</span>
                    </div>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-black/10">
                          <th className="text-left py-2 px-3 font-bold text-gray-900">{t("wp_co_executor_col")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-900">{t("wp_total_col")}</th>
                          <th className="text-center py-2 px-3 font-bold text-emerald-900">{t("wp_completed")}</th>
                          <th className="text-center py-2 px-3 font-bold text-blue-900">{t("wp_in_progress")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-700">{t("wp_pending")}</th>
                          <th className="text-center py-2 px-3 font-bold text-gray-900">KPI %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wpStats.byCoExecutor.map((c, i) => (
                          <tr key={c.name} className={i % 2 === 0 ? "bg-white/20" : ""}>
                            <td className="py-2 px-3 font-semibold text-gray-900 max-w-[160px] truncate">{disp(c.name)}</td>
                            <td className="py-2 px-3 text-center font-medium text-gray-900">{c.total}</td>
                            <td className="py-2 px-3 text-center font-medium text-emerald-800">{c.completed}</td>
                            <td className="py-2 px-3 text-center font-medium text-blue-900">{c.inProgress}</td>
                            <td className="py-2 px-3 text-center font-medium text-gray-700">{c.pending}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`font-bold text-sm ${c.rate >= 80 ? "text-emerald-800" : c.rate >= 50 ? "text-amber-800" : "text-red-800"}`}>
                                {c.rate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {wpStats.total === 0 && (
                  <p className="text-sm font-medium text-gray-800 text-center py-2">{t("wp_not_found")}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          title={t("card_employees")} 
          value={summary?.totalEmployees} 
          icon={Users} 
          loading={isLoadingSummary}
          gradient="linear-gradient(135deg, #2196F3 0%, #1565C0 100%)"
        />
        <SummaryCard 
          title={t("card_departments")} 
          value={summary?.totalDepartments} 
          icon={Building2} 
          loading={isLoadingSummary}
          gradient="linear-gradient(135deg, #9c27b0 0%, #6d28d9 100%)"
        />
        <SummaryCard 
          title={t("card_kpi_indicators")} 
          value={summary?.totalKpiIndicators} 
          icon={Target} 
          loading={isLoadingSummary}
          gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
        />
        <SummaryCard 
          title={t("card_avg_score")} 
          value={summary?.averageScore ? `${Math.round(summary.averageScore)}%` : undefined} 
          icon={TrendingUp} 
          loading={isLoadingSummary}
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
        />
      </div>

      {/* ─── 3 TA DIAGRAMMA YON-YONGA ─── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">

        {/* 1. KPI yillik tendensiyasi */}
        <Card className="border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-3 pt-4 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold leading-tight text-slate-800">{t("chart_trend")}</CardTitle>
                <CardDescription className="text-[11px] text-slate-500">{selectedYear} {t("yil_months_desc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-0 pr-2 pt-3 pb-3">
            {isLoadingTrend ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1565C0" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#1565C0" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12 }}
                      formatter={(value: number | null) => value !== null ? [`${Math.round(value)}%`, "O'rtacha ball"] : ["—", "Ma'lumot yo'q"]}
                    />
                    <Line type="monotone" dataKey="averageScore" stroke="#1565C0" strokeWidth={2.5} dot={{ fill: "#1565C0", r: 3 }} activeDot={{ r: 6 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Bo'limlar reytingi */}
        <Card className="border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-3 pt-4 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold leading-tight text-slate-800">{t("chart_dept_rating")}</CardTitle>
                <CardDescription className="text-[11px] text-slate-500">{selectedPeriod} {t("davr_suffix")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-0 pr-2 pt-3 pb-3">
            {isLoadingDepts ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptScores} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="departmentName" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12 }}
                      formatter={(value: number) => [`${Math.round(value)}%`, "O'rtacha ball"]}
                    />
                    <Bar dataKey="scorePercentage" radius={[5, 5, 0, 0]}>
                      {deptScores?.map((_: any, idx: number) => (
                        <Cell key={idx} fill={["#6d28d9","#1565C0","#059669","#d97706","#dc2626","#0891b2"][idx % 6]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Top xodimlar natijasi (horizontal bar) */}
        <Card className="border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-3 pt-4 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold leading-tight text-slate-800">{t("chart_top_results")}</CardTitle>
                <CardDescription className="text-[11px] text-slate-500">{selectedPeriod} {t("davr_top8")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-1 pr-2 pt-3 pb-3">
            {isLoadingTop10 ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={(top10Employees ?? []).slice(0, 8).map((e: any) => ({
                      name: e.fullName.split(" ").slice(0, 2).join(" "),
                      ball: Math.round(e.scorePercentage),
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={75} />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12 }}
                      formatter={(value: number) => [`${value}%`, "Ball"]}
                    />
                    <Bar dataKey="ball" radius={[0, 4, 4, 0]} barSize={16}>
                      {(top10Employees ?? []).slice(0, 8).map((_: any, idx: number) => (
                        <Cell key={idx} fill={
                          idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#f97316" : "#1565C0"
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* So'nggi baholashlar + Top 10 jadval */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Evaluations */}
        <Card className="border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">{t("recent_evals")}</CardTitle>
                  <CardDescription className="text-xs text-slate-500">{selectedPeriod} {t("davr_suffix")}</CardDescription>
                </div>
              </div>
              <Link href="/evaluations" className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors">
                {t("see_all")} →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoadingRecent ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentEvals?.map((evalItem) => (
                  <div key={evalItem.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Target className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold leading-tight truncate">{evalItem.employeeName}</p>
                      <p className="text-xs text-muted-foreground truncate">{evalItem.indicatorName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-foreground">{evalItem.score}<span className="text-muted-foreground font-normal">/{evalItem.maxScore}</span></div>
                      <div className="text-[10px] text-muted-foreground">{evalItem.period}</div>
                    </div>
                  </div>
                ))}
                {!recentEvals?.length && (
                  <div className="text-center py-8 text-muted-foreground text-sm">{t("no_data_found")}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 xodimlar — jadval ko'rinishida */}
        <Card className="border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">{t("top10_title")}</CardTitle>
                <CardDescription className="text-xs text-slate-500">{selectedPeriod} {t("davr_top10_desc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] bg-[#1565C0] text-white">{t("col_rank")}</TableHead>
                  <TableHead className="bg-[#1565C0] text-white">{t("col_name")}</TableHead>
                  <TableHead className="bg-[#1565C0] text-white">{t("col_position")}</TableHead>
                  <TableHead className="bg-[#1565C0] text-white">{t("col_dept")}</TableHead>
                  <TableHead className="bg-[#1565C0] text-white">{t("col_result")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTop10 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[20px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                    </TableRow>
                  ))
                ) : top10Employees?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {t("no_data_found")}
                    </TableCell>
                  </TableRow>
                ) : (
                  top10Employees?.map((emp, i) => (
                    <TableRow key={emp.employeeId} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{disp(emp.fullName)}</TableCell>
                      <TableCell className="text-muted-foreground">{disp(emp.position)}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.departmentName}</TableCell>
                      <TableCell>
                        <ScoreBadge score={emp.scorePercentage} percentage />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, loading, gradient }: any) {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-xl p-5" style={{ background: gradient, boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.12)" }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.10)", transform: "translate(33%, -33%)" }} />
      <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.10)", transform: "translate(-33%, 50%)" }} />
      <div className="relative">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 shadow-lg" style={{ background: "rgba(255,255,255,0.20)" }}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {loading ? (
          <Skeleton className="h-10 w-24 mb-1 bg-white/30" />
        ) : (
          <div className="text-4xl font-black tracking-tight text-white drop-shadow">{value ?? 0}</div>
        )}
        <p className="text-sm text-white/90 mt-2 font-semibold tracking-wide">{title}</p>
      </div>
    </div>
  );
}
