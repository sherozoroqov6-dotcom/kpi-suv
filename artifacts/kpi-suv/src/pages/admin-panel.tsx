import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Pencil, ShieldCheck, UserCog, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, useListEmployees, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { VILOYATLAR, getTumanlarByViloyat, getViloyatLabel } from "@/lib/viloyatlar";
import { useLang } from "@/lib/lang-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const selectClass =
  "w-full border border-input rounded-md h-9 px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

type TFn = (k: string) => string;
function getRoleLabels(t: TFn): Record<string, { label: string; color: string }> {
  return {
    admin:    { label: t("role_admin"),    color: "bg-red-100 text-red-700 border-red-200" },
    manager:  { label: t("role_manager"),  color: "bg-blue-100 text-blue-700 border-blue-200" },
    employee: { label: t("role_employee"), color: "bg-green-100 text-green-700 border-green-200" },
    viewer:   { label: t("role_viewer"),   color: "bg-gray-100 text-gray-700 border-gray-200" },
  };
}

/* ─────────── Schemalar ─────────── */
const createSchema = z.object({
  username: z.string().min(3, "Login kamida 3 ta belgi"),
  password: z.string().min(4, "Parol kamida 4 ta belgi"),
  fullName: z.string().optional(),
  role: z.enum(["admin", "manager", "employee", "viewer"]),
  viloyat: z.string().optional(),
  tuman: z.string().optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  password: z.string().min(4, "Parol kamida 4 ta belgi").optional().or(z.literal("")),
  fullName: z.string().optional(),
  role: z.enum(["admin", "manager", "employee", "viewer"]),
  viloyat: z.string().optional(),
  tuman: z.string().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

/* ─────────── ViloyatTumanSelect ─────────── */
function ViloyatTumanSelect({
  viloyatValue,
  tumanValue,
  onViloyatChange,
  onTumanChange,
  viloyatError,
}: {
  viloyatValue: string;
  tumanValue: string;
  onViloyatChange: (v: string) => void;
  onTumanChange: (v: string) => void;
  viloyatError?: string;
}) {
  const { t, d } = useLang();
  const tumanlar = viloyatValue ? getTumanlarByViloyat(viloyatValue) : [];

  useEffect(() => {
    onTumanChange("");
  }, [viloyatValue]);

  return (
    <div className="space-y-4">
      {/* Viloyat */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium leading-none">
          {t("lbl_viloyat")} <span className="text-muted-foreground font-normal text-xs">{t("lbl_optional")}</span>
        </label>
        <select
          value={viloyatValue}
          onChange={(e) => onViloyatChange(e.target.value)}
          className={selectClass}
        >
          <option value="">{t("admin_all_regions")}</option>
          {VILOYATLAR.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
        {!viloyatValue && (
          <p className="text-xs text-muted-foreground">
            {t("admin_region_hint")}
          </p>
        )}
        {viloyatError && (
          <p className="text-xs text-destructive">{viloyatError}</p>
        )}
      </div>

      {/* Tuman (ixtiyoriy) */}
      {viloyatValue && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none">
            {t("lbl_tuman_optional")} <span className="text-muted-foreground font-normal">{t("lbl_optional")}</span>
          </label>
          <select
            value={tumanValue}
            onChange={(e) => onTumanChange(e.target.value)}
            className={selectClass}
          >
            <option value="">{t("admin_all_districts")}</option>
            {tumanlar.map((tm) => (
              <option key={tm} value={tm}>{tm}</option>
            ))}
          </select>
          {!tumanValue && (
            <p className="text-xs text-muted-foreground">
              {t("admin_district_hint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── Ma'lumot ko'rsatish yorlig'i ─────────── */
function LocationBadge({ viloyat, tuman }: { viloyat?: string | null; tuman?: string | null }) {
  const { t, d } = useLang();
  const label = viloyat ? getViloyatLabel(viloyat) : null;
  return (
    <div className="flex items-center gap-1">
      <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
      <span className="text-sm">
        {!viloyat ? (
          <span className="font-medium text-blue-700">{t("admin_lbl_all_regions")}</span>
        ) : tuman ? (
          <><span className="text-blue-400 text-xs">{label} /</span> <span className="font-medium text-blue-700">{tuman}</span></>
        ) : (
          <span className="font-medium text-blue-700">{label}</span>
        )}
      </span>
    </div>
  );
}

/* ─────────── Asosiy sahifa ─────────── */
export default function AdminPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, d } = useLang();
  const roleLabels = getRoleLabels(t as TFn);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filterViloyat, setFilterViloyat] = useState("");
  const [createEmpId, setCreateEmpId] = useState("");
  const [editEmpId, setEditEmpId] = useState("");

  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: () => customFetch<any[]>(`${BASE}/api/admin/users`),
    staleTime: 0,
  });

  const { data: allEmployees } = useListEmployees(undefined, {
    query: { queryKey: getListEmployeesQueryKey() },
  });

  /* Form hooks */
  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { username: "", password: "", fullName: "", role: "employee", viloyat: "", tuman: "" },
  });
  const createViloyat = createForm.watch("viloyat");
  const createTuman   = createForm.watch("tuman");

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { password: "", fullName: "", role: "employee", viloyat: "", tuman: "" },
  });
  const editViloyat = editForm.watch("viloyat");
  const editTuman   = editForm.watch("tuman");

  /* Mutations */
  const createMutation = useMutation({
    mutationFn: (data: CreateFormValues) =>
      customFetch(`${BASE}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, employeeId: createEmpId ? Number(createEmpId) : null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateOpen(false);
      toast({ title: t("toast_success"), description: t("toast_user_added") });
    },
    onError: (err: any) => {
      toast({ title: t("toast_error"), description: err?.message || t("toast_error"), variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditFormValues }) =>
      customFetch(`${BASE}/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, employeeId: editEmpId ? Number(editEmpId) : null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditOpen(false);
      toast({ title: t("toast_success"), description: t("toast_user_updated") });
    },
    onError: (err: any) => {
      toast({ title: t("toast_error"), description: err?.message || t("toast_error"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`${BASE}/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteOpen(false);
      toast({ title: t("toast_success"), description: t("toast_user_deleted") });
    },
    onError: (err: any) => {
      toast({ title: t("toast_error"), description: err?.message || t("toast_error"), variant: "destructive" });
    },
  });

  const openCreate = () => {
    createForm.reset({ username: "", password: "", fullName: "", role: "employee", viloyat: "", tuman: "" });
    setCreateEmpId("");
    setCreateOpen(true);
  };

  const openEdit = (u: any) => {
    setSelected(u);
    editForm.reset({
      password: "",
      fullName: u.fullName || "",
      role: u.role || "employee",
      viloyat: u.viloyat || "",
      tuman: u.tuman || "",
    });
    setEditEmpId(u.employeeId ? String(u.employeeId) : "");
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <UserCog className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("admin_page_title")}</h1>
            <p className="text-xs text-gray-400">{t("admin_page_desc")}</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("admin_new_user")}
        </Button>
      </div>

      {/* Viloyat filtri */}
      <div className="flex items-center gap-3">
        <select
          value={filterViloyat}
          onChange={(e) => setFilterViloyat(e.target.value)}
          className="border border-input rounded-lg h-9 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring min-w-[220px]"
        >
          <option value="">{t("admin_all_regions")}</option>
          {VILOYATLAR.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
        {filterViloyat && (
          <button
            onClick={() => setFilterViloyat("")}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t("admin_filter_clear")}
          </button>
        )}
      </div>

      {/* Jadval */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/70">
              <TableHead className="w-10">#</TableHead>
              <TableHead>{t("admin_th_login")}</TableHead>
              <TableHead>{t("admin_th_fullname")}</TableHead>
              <TableHead>{t("admin_th_role")}</TableHead>
              <TableHead>{t("admin_th_region")}</TableHead>
              <TableHead>{t("admin_th_joined")}</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : (() => {
              const filtered = filterViloyat ? users?.filter((u) => u.viloyat === filterViloyat) : users;
              if (!filtered?.length) return (
                <TableRow>
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground text-sm">
                    {filterViloyat ? t("admin_not_found_region") : t("admin_not_found")}
                  </TableCell>
                </TableRow>
              );
              return filtered.map((u, idx) => {
                const roleInfo = roleLabels[u.role] || { label: u.role, color: "bg-gray-100 text-gray-700 border-gray-200" };
                return (
                  <TableRow key={u.id}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-mono font-medium text-sm">{u.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{u.fullName || "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <LocationBadge viloyat={u.viloyat} tuman={u.tuman} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("uz-UZ") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => { setSelected(u); setDeleteOpen(true); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              });
            })()}
          </TableBody>
        </Table>
      </div>

      {/* ─── Qo'shish dialogi ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin_create_title")}</DialogTitle>
            <DialogDescription>{t("admin_create_desc")}</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">

              <FormField control={createForm.control} name="username" render={({ field }) => (
                <FormItem><FormLabel>{t("lbl_login_field")}</FormLabel>
                  <FormControl><Input placeholder="eshmatov_t" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={createForm.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>{t("lbl_password")}</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={createForm.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lbl_fullname")} <span className="text-muted-foreground font-normal">{t("lbl_optional")}</span></FormLabel>
                  <FormControl><Input placeholder="Eshmatov Toshmat" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={createForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>{t("lbl_role")}</FormLabel>
                  <FormControl>
                    <select {...field} className={selectClass}>
                      <option value="employee">{t("role_employee")}</option>
                      <option value="manager">{t("role_manager")}</option>
                      <option value="admin">{t("role_admin")}</option>
                      <option value="viewer">{t("role_viewer")}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Viloyat / Tuman */}
              <ViloyatTumanSelect
                viloyatValue={createViloyat}
                tumanValue={createTuman || ""}
                onViloyatChange={(v) => createForm.setValue("viloyat", v, { shouldValidate: true })}
                onTumanChange={(v) => createForm.setValue("tuman", v)}
                viloyatError={createForm.formState.errors.viloyat?.message}
              />

              {/* Xodim birkitish */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">
                  Briktirilgan xodim <span className="text-muted-foreground font-normal text-xs">(ixtiyoriy)</span>
                </label>
                <select
                  value={createEmpId}
                  onChange={(e) => setCreateEmpId(e.target.value)}
                  className="w-full border border-input rounded-md h-9 px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Xodim tanlanmagan —</option>
                  {(Array.isArray(allEmployees) ? allEmployees : []).filter((e: any) => e.status === "active").map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t("btn_cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("admin_adding") : t("btn_add")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Tahrirlash dialogi ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin_edit_title")}</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold">{selected?.username}</span> {t("admin_update_info")}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((d) => editMutation.mutate({ id: selected.id, data: d }))} className="space-y-4">

              <FormField control={editForm.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>{t("lbl_fullname")}</FormLabel>
                  <FormControl><Input placeholder="Eshmatov Toshmat" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={editForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lbl_new_password")} <span className="text-gray-400 font-normal">{t("lbl_to_change")}</span></FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={editForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>{t("lbl_role")}</FormLabel>
                  <FormControl>
                    <select {...field} className={selectClass}>
                      <option value="employee">{t("role_employee")}</option>
                      <option value="manager">{t("role_manager")}</option>
                      <option value="admin">{t("role_admin")}</option>
                      <option value="viewer">{t("role_viewer")}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <ViloyatTumanSelect
                viloyatValue={editViloyat}
                tumanValue={editTuman || ""}
                onViloyatChange={(v) => editForm.setValue("viloyat", v, { shouldValidate: true })}
                onTumanChange={(v) => editForm.setValue("tuman", v)}
                viloyatError={editForm.formState.errors.viloyat?.message}
              />

              {/* Xodim birkitish */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">
                  Briktirilgan xodim <span className="text-muted-foreground font-normal text-xs">(ixtiyoriy)</span>
                </label>
                <select
                  value={editEmpId}
                  onChange={(e) => setEditEmpId(e.target.value)}
                  className="w-full border border-input rounded-md h-9 px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Xodim tanlanmagan —</option>
                  {(Array.isArray(allEmployees) ? allEmployees : []).filter((e: any) => e.status === "active").map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t("btn_cancel")}</Button>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? t("btn_saving") : t("btn_save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── O'chirish dialogi ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("admin_delete_title")}</DialogTitle>
            <DialogDescription>
              {t("admin_delete_confirm_pre")} <strong>{selected?.username}</strong> {t("admin_delete_confirm_post")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t("btn_cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("btn_deleting") : t("btn_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
