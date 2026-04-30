import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { useLang } from "@/lib/lang-context";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2,
  KeyRound, ShieldCheck, ShieldOff, Landmark, Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListDepartments,
  getListDepartmentsQueryKey,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  customFetch,
  useGetMe,
} from "@workspace/api-client-react";
import { useRegion } from "@/lib/region-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/score-badge";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Bo'limlar sxemasi ─── */
const departmentSchema = z.object({
  name: z.string().min(1, "Bo'lim nomi kiritilishi shart"),
  code: z.string().min(1, "Bo'lim kodi kiritilishi shart"),
  headName: z.string().optional(),
  description: z.string().optional(),
  tuman: z.string().optional(),
});
type DepartmentFormValues = z.infer<typeof departmentSchema>;

/* ─── Xodimlar sxemasi ─── */
const employeeSchema = z.object({
  fullName: z.string().min(1, "F.I.SH. kiritilishi shart"),
  position: z.string().min(1, "Lavozim kiritilishi shart"),
  departmentId: z.coerce.number().min(1, "Bo'limni tanlang"),
  status: z.enum(["active", "inactive"]),
  phone: z.string().optional(),
  email: z.string().email("Noto'g'ri email format").optional().or(z.literal("")),
  hireDate: z.string().optional(),
  tuman: z.string().optional(),
  passportSeries: z.string().max(4).optional(),
  passportNumber: z.string().max(10).optional(),
  pinfl: z.string().max(14).optional(),
  isIjroResponsible: z.boolean().optional(),
  isMehnatResponsible: z.boolean().optional(),
  username: z.string().min(3, "Login kamida 3 ta belgi").optional().or(z.literal("")),
  password: z.string().min(4, "Parol kamida 4 ta belgi").optional().or(z.literal("")),
});
type EmployeeFormValues = z.infer<typeof employeeSchema>;

/* ══════════════════════════════════════════════════════ */
export default function Staff() {
  const queryClient = useQueryClient();
  const { t, d: disp } = useLang();
  const { toast } = useToast();
  const { selectedTuman, showAllTumans, viloyatTumanlar } = useRegion();
  const { data: currentUser } = useGetMe();
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "manager";
  const currentEmpId = (currentUser as any)?.employeeId ?? null;

  /* ── Bo'limlar state ── */
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptDeleteOpen, setDeptDeleteOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);

  /* ── Xodimlar state ── */
  const [search, setSearch] = useState("");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [empDeleteOpen, setEmpDeleteOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  /* ── Queries ── */
  const tumanParams = () => {
    const p = new URLSearchParams();
    if (showAllTumans && viloyatTumanlar.length > 0) p.set("tumans", viloyatTumanlar.join(","));
    else if (selectedTuman) p.set("tuman", selectedTuman);
    return p;
  };

  const { data: departments, isLoading: deptsLoading } = useQuery<any[]>({
    queryKey: ["departments", selectedTuman, showAllTumans, viloyatTumanlar.join(",")],
    queryFn: () => {
      const qs = tumanParams().toString();
      return customFetch<any[]>(`${BASE}/api/departments${qs ? `?${qs}` : ""}`);
    },
    staleTime: 0,
  });

  const { data: employees, isLoading: empsLoading } = useQuery<any[]>({
    queryKey: ["employees", selectedTuman, showAllTumans, viloyatTumanlar.join(","), search, filterDeptId],
    queryFn: () => {
      const p = tumanParams();
      if (search) p.set("search", search);
      if (filterDeptId !== "all") p.set("departmentId", filterDeptId);
      const qs = p.toString();
      return customFetch<any[]>(`${BASE}/api/employees${qs ? `?${qs}` : ""}`);
    },
    staleTime: 0,
  });

  // Joriy foydalanuvchi Ijro mas'ulimi? — /auth/me.isIjroResponsible orqali (filtrdan mustaqil)
  const isCurrentUserIjroResp = !!(currentUser as any)?.isIjroResponsible;
  const canToggleIjro = canEdit || isCurrentUserIjroResp;

  /* ── Bo'limlar mutations ── */
  const createDept = useCreateDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        setDeptDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_dept_added") });
      },
    },
  });
  const updateDept = useUpdateDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        setDeptDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_dept_updated") });
      },
    },
  });
  const deleteDept = useDeleteDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        setDeptDeleteOpen(false);
        toast({ title: t("toast_success"), description: t("toast_dept_deleted") });
      },
    },
  });

  /* ── Xodimlar mutations ── */
  const createEmp = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        setEmpDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_emp_added") });
      },
    },
  });
  const updateEmp = useUpdateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        setEmpDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_emp_updated") });
      },
    },
  });
  const deleteEmp = useDeleteEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        setEmpDeleteOpen(false);
        toast({ title: t("toast_success"), description: t("toast_emp_deleted") });
      },
    },
  });

  /* ── Ijro mas'uli toggle: faqat admin/manager yoki Ijro mas'ul bossa ── */
  const toggleIjroMutation = useUpdateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        toast({ title: "Saqlandi", description: "Ijro vazifasi yangilandi" });
      },
      onError: () => {
        toast({ title: "Xato", description: "Yangilab bo'lmadi", variant: "destructive" });
      },
    },
  });
  const toggleIjroAssign = (e: any) => {
    toggleIjroMutation.mutate({
      id: e.id,
      data: {
        fullName: e.fullName, position: e.position, departmentId: e.departmentId, status: e.status,
        phone: e.phone ?? "", email: e.email ?? "", hireDate: e.hireDate ?? "",
        tuman: e.tuman ?? "", passportSeries: e.passportSeries ?? "", passportNumber: e.passportNumber ?? "",
        pinfl: e.pinfl ?? "", isIjroResponsible: !!e.isIjroResponsible,
        isMehnatResponsible: !!e.isMehnatResponsible,
        isIjroAssigned: !e.isIjroAssigned,
        username: e.username ?? "",
      } as any,
    });
  };

  /* ── Forms ── */
  const deptForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", code: "", headName: "", description: "", tuman: "" },
  });

  const empForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "", position: "", departmentId: 0, status: "active",
      phone: "", email: "", hireDate: new Date().toISOString().split("T")[0],
      tuman: "", passportSeries: "", passportNumber: "", pinfl: "", isIjroResponsible: false, isMehnatResponsible: false, username: "", password: "",
    },
  });

  /* ── Dept dialog handlers ── */
  const openCreateDept = () => {
    setSelectedDept(null);
    deptForm.reset({ name: "", code: "", headName: "", description: "", tuman: selectedTuman || "" });
    setDeptDialogOpen(true);
  };
  const openEditDept = (d: any) => {
    setSelectedDept(d);
    deptForm.reset({ name: d.name, code: d.code, headName: d.headName || "", description: d.description || "", tuman: d.tuman || "" });
    setDeptDialogOpen(true);
  };
  const onDeptSubmit = (data: DepartmentFormValues) => {
    if (selectedDept) updateDept.mutate({ id: selectedDept.id, data: data as any });
    else createDept.mutate({ data: data as any });
  };

  /* ── Emp dialog handlers ── */
  const openCreateEmp = () => {
    setSelectedEmp(null);
    empForm.reset({
      fullName: "", position: "", departmentId: 0, status: "active",
      phone: "", email: "", hireDate: new Date().toISOString().split("T")[0],
      tuman: selectedTuman || "", passportSeries: "", passportNumber: "", pinfl: "", isIjroResponsible: false, isMehnatResponsible: false, username: "", password: "",
    });
    setEmpDialogOpen(true);
  };
  const openEditEmp = (e: any) => {
    setSelectedEmp(e);
    empForm.reset({
      fullName: e.fullName, position: e.position, departmentId: e.departmentId, status: e.status,
      phone: e.phone || "", email: e.email || "", hireDate: e.hireDate ? e.hireDate.split("T")[0] : "",
      tuman: e.tuman || "", passportSeries: e.passportSeries || "", passportNumber: e.passportNumber || "",
      pinfl: e.pinfl || "", isIjroResponsible: !!e.isIjroResponsible, isMehnatResponsible: !!e.isMehnatResponsible, username: e.username || "", password: "",
    });
    setEmpDialogOpen(true);
  };
  const onEmpSubmit = (data: EmployeeFormValues) => {
    if (selectedEmp) updateEmp.mutate({ id: selectedEmp.id, data: data as any });
    else createEmp.mutate({ data: data as any });
  };

  /* ════════════════════════════ RENDER ════════════════════════════ */
  return (
    <div className="space-y-8">

      {/* ══ BO'LIMLAR BLOKI ══ */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{t("lbl_departments")}</h2>
              <p className="text-xs text-gray-400">{t("lbl_dept_org_desc")}</p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openCreateDept}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("lbl_new_dept")}
            </Button>
          )}
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70">
                <TableHead>{t("th_name")}</TableHead>
                <TableHead>{t("th_code")}</TableHead>
                <TableHead>{t("th_head")}</TableHead>
                <TableHead>{t("th_emp_count")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deptsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : departments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground text-sm">
                    {t("lbl_dept_not_found")}
                  </TableCell>
                </TableRow>
              ) : (
                departments?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{disp(d.name)}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{d.code}</TableCell>
                    <TableCell>{d.headName || <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{d.employeeCount} kishi</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDept(d)}>
                            <Pencil className="mr-2 h-4 w-4" />{t("btn_edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setSelectedDept(d); setDeptDeleteOpen(true); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />{t("btn_delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ══ XODIMLAR BLOKI ══ */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{t("lbl_employees")}</h2>
              <p className="text-xs text-gray-400">{t("lbl_emp_in_dept")}</p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openCreateEmp}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("lbl_new_emp")}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("filter_search_ph")}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterDeptId} onValueChange={setFilterDeptId}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder={t("filter_all_depts")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_all_depts")}</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id.toString()}>{disp(d.name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70">
                <TableHead>{t("col_name")}</TableHead>
                <TableHead>{t("col_position")}</TableHead>
                <TableHead>{t("col_dept")}</TableHead>
                <TableHead>{t("th_status")}</TableHead>
                <TableHead className="text-center">Ijro</TableHead>
                <TableHead>{t("form_login")}</TableHead>
                <TableHead>{t("card_avg_score")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {empsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : employees?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground text-sm">
                    {t("lbl_emp_not_found")}
                  </TableCell>
                </TableRow>
              ) : (
                employees?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <Link href={`/employees/${e.id}`} className="hover:underline text-primary">
                        {disp(e.fullName)}
                      </Link>
                    </TableCell>
                    <TableCell>{disp(e.position)}</TableCell>
                    <TableCell>{disp(e.departmentName)}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "active" ? "default" : "secondary"}>
                        {e.status === "active" ? t("status_active") : t("status_inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {e.isIjroResponsible ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">Mas'ul</Badge>
                      ) : canToggleIjro ? (
                        <button
                          type="button"
                          onClick={() => toggleIjroAssign(e)}
                          disabled={toggleIjroMutation.isPending}
                          className={
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition " +
                            (e.isIjroAssigned
                              ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100")
                          }
                          title={e.isIjroAssigned ? "Ijro vazifasidan olib tashlash" : "Ijro vazifasiga belgilash"}
                        >
                          {e.isIjroAssigned ? "✓ Belgilangan" : "Belgilash"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">{e.isIjroAssigned ? "✓" : "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.username ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md w-fit">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span className="font-mono font-medium">{e.username}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <ShieldOff className="h-3.5 w-3.5" />
                          <span>Yo'q</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.averageScore != null ? (
                        <ScoreBadge score={e.averageScore} percentage />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditEmp(e)}>
                            <Pencil className="mr-2 h-4 w-4" />{t("btn_edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setSelectedEmp(e); setEmpDeleteOpen(true); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />{t("btn_delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ════ Bo'lim dialog ════ */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedDept ? t("dlg_edit_dept") : t("dlg_new_dept")}</DialogTitle>
            <DialogDescription>{t("form_description")}</DialogDescription>
          </DialogHeader>
          <Form {...deptForm}>
            <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-4">

              {[
                { name: "name" as const, label: "Nomi", placeholder: "Kadrlar bo'limi" },
                { name: "code" as const, label: "Kodi", placeholder: "HR-01" },
                { name: "headName" as const, label: "Rahbar F.I.SH. (ixtiyoriy)", placeholder: "Eshmatov Toshmat" },
                { name: "description" as const, label: "Tavsif (ixtiyoriy)", placeholder: "..." },
                { name: "tuman" as const, label: "Tuman", placeholder: "Kattaqo'rg'on tumani" },
              ].map(({ name, label, placeholder }) => (
                <FormField key={name} control={deptForm.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl><Input placeholder={placeholder} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDeptDialogOpen(false)}>{t("btn_cancel")}</Button>
                <Button type="submit" disabled={createDept.isPending || updateDept.isPending}>
                  {createDept.isPending || updateDept.isPending ? t("btn_saving") : t("btn_save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bo'lim o'chirish */}
      <Dialog open={deptDeleteOpen} onOpenChange={setDeptDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("btn_delete")} — {t("lbl_departments")}</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>{disp(selectedDept?.name)}</strong>ni o'chirmoqchimisiz?
              Agar bo'limda xodimlar bo'lsa, o'chirib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDeleteOpen(false)}>{t("btn_cancel")}</Button>
            <Button variant="destructive" onClick={() => selectedDept && deleteDept.mutate({ id: selectedDept.id })} disabled={deleteDept.isPending}>
              {deleteDept.isPending ? t("btn_deleting") : t("btn_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Xodim dialog ════ */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmp ? t("dlg_edit_emp") : t("dlg_new_emp")}</DialogTitle>
            <DialogDescription>Xodim ma'lumotlarini kiriting va saqlash tugmasini bosing.</DialogDescription>
          </DialogHeader>
          <Form {...empForm}>
            <form onSubmit={empForm.handleSubmit(onEmpSubmit)} className="space-y-5">

              {/* Asosiy ma'lumotlar */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asosiy ma'lumotlar</span>
                </div>
                <FormField control={empForm.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>F.I.SH.</FormLabel>
                    <FormControl><Input placeholder="Eshmatov Toshmat Baxtiyorovich" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={empForm.control} name="position" render={({ field }) => (
                    <FormItem><FormLabel>Lavozim</FormLabel>
                      <FormControl><Input placeholder="Muhandis" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={empForm.control} name="departmentId" render={({ field }) => (
                    <FormItem><FormLabel>Bo'lim</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()}>{disp(d.name)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={empForm.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Holati</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Faol</SelectItem>
                          <SelectItem value="inactive">Nofaol</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={empForm.control} name="hireDate" render={({ field }) => (
                    <FormItem><FormLabel>Ishga kirgan sana</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={empForm.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Telefon (ixtiyoriy)</FormLabel>
                      <FormControl><Input placeholder="+998 90 123 45 67" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={empForm.control} name="tuman" render={({ field }) => (
                    <FormItem><FormLabel>Tuman (ixtiyoriy)</FormLabel>
                      <FormControl><Input placeholder="Kattaqo'rg'on tumani" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Pasport */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pasport ma'lumotlari</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={empForm.control} name="passportSeries" render={({ field }) => (
                    <FormItem><FormLabel>Seriya</FormLabel>
                      <FormControl>
                        <Input placeholder="AA" maxLength={2} className="uppercase" {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={empForm.control} name="passportNumber" render={({ field }) => (
                    <FormItem><FormLabel>Raqami</FormLabel>
                      <FormControl><Input placeholder="1234567" maxLength={7} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={empForm.control} name="pinfl" render={({ field }) => (
                    <FormItem><FormLabel>PINFL</FormLabel>
                      <FormControl><Input placeholder="12345678901234" maxLength={14} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Ijro intizomi mas'uli */}
              <div className="space-y-3">
                <FormField control={empForm.control} name="isIjroResponsible" render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-amber-900 font-medium">
                        Ijro.gov bo'yicha mas'ul
                      </FormLabel>
                      <p className="text-xs text-amber-700">
                        Belgilansa, qolgan barcha xodimlarning ish rejasiga "Ijro intizomi" bo'yicha avto-vazifa qo'shiladi.
                      </p>
                    </div>
                  </FormItem>
                )} />

                <FormField control={empForm.control} name="isMehnatResponsible" render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-emerald-900 font-medium">
                        Mehnat intizomi bo'yicha mas'ul
                      </FormLabel>
                      <p className="text-xs text-emerald-700">
                        Belgilansa, qolgan barcha xodimlarning ish rejasiga "Mehnat intizomi" bo'yicha avto-vazifa qo'shiladi.
                      </p>
                    </div>
                  </FormItem>
                )} />
              </div>

              {/* Login */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-blue-100">
                  <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Tizimga kirish</span>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  Xodim shu login va parol orqali tizimga kiradi. Agar login berilmasa, xodim tizimga kira olmaydi.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={empForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login <span className="text-gray-400 font-normal">(ixtiyoriy)</span></FormLabel>
                      <FormControl><Input placeholder="eshmatov_t" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={empForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parol {selectedEmp?.username && <span className="text-gray-400 font-normal">(o'zgartirish uchun)</span>}</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEmpDialogOpen(false)}>{t("btn_cancel")}</Button>
                <Button type="submit" disabled={createEmp.isPending || updateEmp.isPending}>
                  {createEmp.isPending || updateEmp.isPending ? t("btn_saving") : t("btn_save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Xodim o'chirish */}
      <Dialog open={empDeleteOpen} onOpenChange={setEmpDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("btn_delete")} — {t("lbl_employees")}</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>{disp(selectedEmp?.fullName)}</strong> ismli xodimni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDeleteOpen(false)}>{t("btn_cancel")}</Button>
            <Button variant="destructive" onClick={() => selectedEmp && deleteEmp.mutate({ id: selectedEmp.id })} disabled={deleteEmp.isPending}>
              {deleteEmp.isPending ? t("btn_deleting") : t("btn_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
