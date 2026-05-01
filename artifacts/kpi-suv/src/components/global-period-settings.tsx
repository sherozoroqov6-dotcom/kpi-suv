import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Calendar, Save, Lock, Unlock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AppSettings {
  workPlanCreatePeriod: string | null;
  resultsEnterPeriod: string | null;
  updatedAt: string;
}

export function GlobalPeriodSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<AppSettings>({
    queryKey: ["app-settings"],
    queryFn: () => customFetch<AppSettings>(`${BASE}/api/app-settings`),
    staleTime: 0,
  });

  const [createPeriod, setCreatePeriod] = useState("");
  const [resultsPeriod, setResultsPeriod] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (data) {
      setCreatePeriod(data.workPlanCreatePeriod ?? "");
      setResultsPeriod(data.resultsEnterPeriod ?? "");
    }
  }, [data?.workPlanCreatePeriod, data?.resultsEnterPeriod]);

  const mutation = useMutation({
    mutationFn: (body: { workPlanCreatePeriod: string | null; resultsEnterPeriod: string | null }) =>
      customFetch<AppSettings>(`${BASE}/api/app-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    },
  });

  const handleSave = () => {
    mutation.mutate({
      workPlanCreatePeriod: createPeriod || null,
      resultsEnterPeriod: resultsPeriod || null,
    });
  };

  return (
    <div className="rounded-xl shadow-lg ring-1 ring-indigo-300/40 overflow-hidden" style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)" }}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-md bg-white/20 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-white">Global ruxsat oylari (super admin)</h3>
          <span className="text-indigo-100/70 text-[11px] hidden sm:inline">— bo'sh = chegara yo'q</span>
        </div>

        {isLoading ? (
          <div className="text-white/80 text-xs">Yuklanmoqda...</div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-semibold text-indigo-100 uppercase tracking-wide mb-1">
                Oylik ish reja yaratish oyi
              </label>
              <input
                type="month"
                value={createPeriod}
                onChange={(e) => setCreatePeriod(e.target.value)}
                className="w-full h-8 px-2 rounded-md bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-100/90">
                {createPeriod ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                <span className="truncate">{createPeriod ? `Faqat ${createPeriod}` : "Chegara yo'q"}</span>
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-semibold text-indigo-100 uppercase tracking-wide mb-1">
                Natijalarni kiritish oyi
              </label>
              <input
                type="month"
                value={resultsPeriod}
                onChange={(e) => setResultsPeriod(e.target.value)}
                className="w-full h-8 px-2 rounded-md bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-100/90">
                {resultsPeriod ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                <span className="truncate">{resultsPeriod ? `Faqat ${resultsPeriod}` : "Chegara yo'q"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-4">
              <button
                onClick={handleSave}
                disabled={mutation.isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 font-semibold text-xs transition-all whitespace-nowrap"
              >
                <Save className="h-3.5 w-3.5" />
                {mutation.isPending ? "..." : "Saqlash"}
              </button>
              {savedFlash && (
                <span className="text-emerald-200 text-xs font-semibold">✓</span>
              )}
            </div>
          </div>
        )}
        {mutation.isError && (
          <div className="text-red-200 text-xs mt-2">Xato: {(mutation.error as Error).message}</div>
        )}
      </div>
    </div>
  );
}
