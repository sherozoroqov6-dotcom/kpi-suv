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
    <div className="rounded-2xl shadow-xl ring-1 ring-indigo-300/40 overflow-hidden" style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)" }}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Global ruxsat oylari (super admin)</h3>
            <p className="text-indigo-100/80 text-xs">
              Barcha xodimlar uchun amal qiladi. Bo'sh qoldirilsa — chegara bo'lmaydi (istalgan oy).
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-white/80 text-sm mt-3">Yuklanmoqda...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
              <label className="block text-[11px] font-bold text-indigo-100 uppercase tracking-wider mb-1.5">
                Oylik ish reja yaratish oyi
              </label>
              <input
                type="month"
                value={createPeriod}
                onChange={(e) => setCreatePeriod(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-indigo-100">
                {createPeriod ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span>{createPeriod ? `Faqat ${createPeriod} oyiga reja yaratish mumkin` : "Chegara yo'q"}</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
              <label className="block text-[11px] font-bold text-indigo-100 uppercase tracking-wider mb-1.5">
                Natijalarni kiritish oyi
              </label>
              <input
                type="month"
                value={resultsPeriod}
                onChange={(e) => setResultsPeriod(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-indigo-100">
                {resultsPeriod ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span>{resultsPeriod ? `Faqat ${resultsPeriod} oyi natijalari kiritiladi` : "Chegara yo'q"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 font-semibold text-sm transition-all"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          {savedFlash && (
            <span className="text-emerald-200 text-sm font-semibold">Saqlandi</span>
          )}
          {mutation.isError && (
            <span className="text-red-200 text-sm">Xato: {(mutation.error as Error).message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
