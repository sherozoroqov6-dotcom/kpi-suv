import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, FileText } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useRegion } from "@/lib/region-context";
import {
  customFetch,
  useListEmployees,
  getListEmployeesQueryKey,
  useListDepartments,
  getListDepartmentsQueryKey,
  useUpdateWorkPlan,
  useDeleteWorkPlan,
  useGetMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const editSchema = z.object({
  employeeId: z.coerce.number().min(1, "Xodimni tanlang"),
  period: z.string().min(1, "Davrni kiriting"),
  title: z.string().min(1, "Sarlavhani kiriting"),
  description: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

const currentMonth = new Date().toISOString().slice(0, 7);

const getStatusBadge = (status: string, tFn: (k: string) => string) => {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">{tFn("status_draft")}</Badge>;
    case "submitted":
      return <Badge className="bg-blue-500 hover:bg-blue-600">{tFn("status_submitted")}</Badge>;
    case "approved":
      return <Badge className="bg-green-500 hover:bg-green-600">{tFn("status_approved")}</Badge>;
    case "completed":
      return <Badge className="bg-teal-500 hover:bg-teal-600">{tFn("status_completed")}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function WorkPlans() {
  const [, setLocation] = useLocation();
  const { globalPeriod, selectedTuman, showAllTumans, viloyatTumanlar } = useRegion();
  const { t, d } = useLang();
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>(globalPeriod);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const { data: currentUser } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isAdmin = currentUser?.role === "admin";
  const isSuperAdmin = (currentUser as any)?.username === "5279606";
  // Super admin har doim ish reja yarata oladi. Oddiy admin — faqat ruxsat berilgan bo'lsa.
  // Boshqa rollar (manager/employee) — avvalgi xulq saqlanadi (yarata oladi).
  const canCreatePlan = isSuperAdmin
    || (isAdmin && (currentUser as any)?.canCreateWorkPlans)
    || (currentUser && currentUser.role !== "admin");

  const canModify = (plan: any) =>
    isAdmin || (plan.status !== "approved" && plan.status !== "completed");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<any[]>({
    queryKey: ["work-plans", selectedTuman, showAllTumans, viloyatTumanlar.join(","), departmentId, periodFilter, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (showAllTumans && viloyatTumanlar.length > 0) {
        p.set("tumans", viloyatTumanlar.join(","));
      } else if (selectedTuman) {
        p.set("tuman", selectedTuman);
      }
      if (departmentId !== "all") p.set("departmentId", departmentId);
      if (periodFilter) p.set("period", periodFilter);
      if (statusFilter !== "all") p.set("status", statusFilter);
      const qs = p.toString();
      return customFetch<any[]>(`${BASE}/api/work-plans${qs ? `?${qs}` : ""}`);
    },
    staleTime: 0,
  });

  const { data: departments } = useListDepartments(undefined, {
    query: { queryKey: getListDepartmentsQueryKey() },
  });

  const { data: employees } = useListEmployees(undefined, {
    query: { queryKey: getListEmployeesQueryKey() },
  });

  const updateMutation = useUpdateWorkPlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["work-plans"] });
        setIsEditDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_plan_updated") });
      },
    },
  });

  const deleteMutation = useDeleteWorkPlan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["work-plans"] });
        setIsDeleteDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_plan_deleted") });
      },
    },
  });

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { employeeId: 0, period: currentMonth, title: "", description: "" },
  });

  const openEditDialog = (plan: any) => {
    setSelectedPlan(plan);
    form.reset({
      employeeId: plan.employeeId,
      period: plan.period,
      title: plan.title,
      description: plan.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (plan: any) => {
    setSelectedPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  const onEdit = (data: EditFormValues) => {
    if (selectedPlan) updateMutation.mutate({ id: selectedPlan.id, data });
  };

  const onDelete = () => {
    if (selectedPlan) deleteMutation.mutate({ id: selectedPlan.id });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("pg_work_plans")} description={t("pg_work_plans_desc")}>
        {canCreatePlan && (
          <Button onClick={() => setLocation("/work-plans/new")}>
            <Plus className="h-4 w-4 mr-2" />
            {t("lbl_new_plan")}
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("filter_all_depts")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all_depts")}</SelectItem>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id.toString()}>
                {d(dept.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter_all_statuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all_statuses")}</SelectItem>
            <SelectItem value="draft">{t("status_draft")}</SelectItem>
            <SelectItem value="submitted">{t("status_submitted")}</SelectItem>
            <SelectItem value="approved">{t("status_approved")}</SelectItem>
            <SelectItem value="completed">{t("status_completed")}</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="month"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="w-[170px]"
        />

        <Button
          variant="outline"
          onClick={() => {
            setDepartmentId("all");
            setPeriodFilter("");
            setStatusFilter("all");
          }}
        >
          {t("btn_clear")}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col_employee")}</TableHead>
              <TableHead>{t("col_period")}</TableHead>
              <TableHead>{t("th_title")}</TableHead>
              <TableHead>{t("th_status")}</TableHead>
              <TableHead>{t("th_tasks")}</TableHead>
              <TableHead>{t("th_progress")}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : plans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t("lbl_plan_not_found")}
                </TableCell>
              </TableRow>
            ) : (
              plans?.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/work-plans/${plan.id}`)}
                >
                  <TableCell className="font-medium">
                    <div>{plan.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{plan.departmentName}</div>
                  </TableCell>
                  <TableCell>{plan.period}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{d(plan.title)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(plan.status, t as (k: string) => string)}
                      {plan.hasPdf && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit">
                          <FileText className="h-3 w-3" />PDF yuklangan
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.completedTaskCount} / {plan.taskCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={plan.overallProgress} className="h-2 w-[80px]" />
                      <span className="text-xs font-medium">{Math.round(plan.overallProgress ?? 0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {isAdmin && plan.hasPdf && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                          onClick={(e) => { e.stopPropagation(); setLocation(`/work-plans/${plan.id}`); }}
                        >
                          <FileText className="h-3 w-3 mr-1" />Ko'rish
                        </Button>
                      )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/work-plans/${plan.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t("btn_view")}
                        </DropdownMenuItem>
                        {canModify(plan) && (
                          <DropdownMenuItem onClick={() => openEditDialog(plan)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("btn_edit")}
                          </DropdownMenuItem>
                        )}
                        {canModify(plan) && (
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(plan)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("btn_delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t("dlg_edit_plan")}</DialogTitle>
            <DialogDescription>Asosiy ma'lumotlarni yangilang</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xodim</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.filter((e) => e.status === "active").map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {d(emp.fullName)} ({d(emp.departmentName)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Davr</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sarlavha</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Izoh</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t("btn_cancel")}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t("btn_saving") : t("btn_save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("btn_delete")} — {t("pg_work_plans")}</DialogTitle>
            <DialogDescription>
              Haqiqatan ham bu ish rejani o'chirmoqchimisiz? Barcha vazifalar ham o'chiriladi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t("btn_cancel")}
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t("btn_deleting") : t("btn_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
