import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, BarChart3, Users, CheckCircle2, TrendingUp } from "lucide-react";
import logoImg from "@assets/logo_new_transparent.png";
import { useLogin } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  username: z.string().min(1, "Foydalanuvchi nomi kiritilishi shart"),
  password: z.string().min(1, "Parol kiritilishi shart"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const FEATURES = [
  { icon: BarChart3, label: "KPI ko'rsatkichlari tahlili" },
  { icon: Users, label: "Xodimlar samaradorligi" },
  { icon: TrendingUp, label: "Oylik hisobotlar va tendensiya" },
  { icon: CheckCircle2, label: "Ish reja monitoring" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => setLocation("/dashboard"),
      onError: (err: any) => {
        const msg = err?.data?.error || err?.message?.replace(/^HTTP \d+ \w+:\s*/i, "") || "Tizimga kirishda xatolik yuz berdi";
        setError(msg);
      },
    },
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(data: LoginFormValues) {
    setError(null);
    loginMutation.mutate({ data });
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col items-center justify-center"
        style={{ background: "linear-gradient(145deg, #071a3a 0%, #0d3b80 50%, #1565C0 100%)" }}>

        {/* Decorative blobs */}
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-[-80px] left-[-80px] w-80 h-80 rounded-full bg-cyan-400/[0.08]" />
        <div className="absolute top-[15%] left-[-50px] w-40 h-40 rounded-full bg-blue-300/[0.07]" />
        <div className="absolute bottom-[20%] right-8 w-28 h-28 rounded-full bg-white/[0.04]" />

        {/* Outer ring glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[520px] h-[520px] rounded-full border border-white/[0.05]" />
          <div className="absolute w-[380px] h-[380px] rounded-full border border-white/[0.06]" />
        </div>

        {/* Wave bottom */}
        <svg className="absolute bottom-0 left-0 w-full opacity-[0.08]" viewBox="0 0 1440 100" fill="none">
          <path d="M0,50 C360,100 1080,0 1440,50 L1440,100 L0,100 Z" fill="white"/>
        </svg>

        {/* ── CENTERED CONTENT ── */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 py-10 w-full">

          {/* Emblem */}
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute w-[38rem] h-[38rem] rounded-full border-2 border-dashed border-white/20 animate-[spin_30s_linear_infinite]" />
            <div className="absolute w-[37rem] h-[37rem] rounded-full border border-cyan-400/20" />
            <div className="relative w-[36rem] h-[36rem] flex items-center justify-center">
              <img src={logoImg} alt="Logo" className="w-[36rem] h-[36rem] object-contain drop-shadow-2xl" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-5xl xl:text-[3.25rem] font-extrabold text-white leading-[1.1] tracking-tight mb-5">
            Suv yetkazib<br />
            berish xizmati{" "}
            <span className="text-cyan-300">DM</span>
          </h2>

          <p className="text-blue-200/75 text-lg leading-relaxed mb-10 max-w-sm">
            Xodimlar samaradorligini baholash va monitoring qilish tizimi
          </p>

          {/* Features list */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-10">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/[0.08] rounded-xl px-3.5 py-2.5 backdrop-blur">
                <Icon className="h-4 w-4 text-cyan-300 flex-shrink-0" />
                <span className="text-blue-100/90 text-sm font-medium leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center">
            {[
              { value: "100+", label: "Xodimlar" },
              { value: "12", label: "Bo'limlar" },
              { value: "24/7", label: "Monitoring" },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <div className="w-px h-8 bg-white/15 mx-8" />}
                <div className="text-center">
                  <div className="text-2xl font-extrabold text-white">{s.value}</div>
                  <div className="text-blue-200/55 text-xs mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <p className="absolute bottom-5 text-blue-200/30 text-xs z-10">
          &copy; {new Date().getFullYear()} Barcha huquqlar himoyalangan.
        </p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e8eef5] p-6 lg:p-12">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="h-16 w-16 flex items-center justify-center">
            <img src={logoImg} alt="Logo" className="h-16 w-16 object-contain" />
          </div>
          <div>
            <span className="font-bold text-lg leading-none block text-gray-900">Suv yetkazib berish</span>
            <span className="text-gray-400 text-xs">xizmati DM — KPI tizimi</span>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[420px]">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-gray-100 overflow-hidden">

            {/* Card top accent */}
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #1565C0 0%, #0ea5e9 100%)" }} />

            <div className="p-8 lg:p-9">

              {/* Header */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-40 h-40 flex items-center justify-center mb-4">
                  <img src={logoImg} alt="Logo" className="w-40 h-40 object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Tizimga kirish</h2>
                <p className="text-gray-400 text-sm">Login va parolingizni kiriting</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="8" r="4" stroke="#94a3b8" strokeWidth="1.8"/>
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <Input
                              placeholder="Foydalanuvchi nomi"
                              className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/70 focus:bg-white transition-all text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              type="password"
                              placeholder="Parol"
                              className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/70 focus:bg-white transition-all text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full h-12 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    style={{ background: "linear-gradient(135deg, #1565C0 0%, #0ea5e9 100%)" }}
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Kirilmoqda...
                      </span>
                    ) : "Kirish"}
                  </Button>
                </form>
              </Form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
