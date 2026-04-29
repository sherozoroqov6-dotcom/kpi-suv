import { useState, useMemo } from "react";
import { useRegion } from "@/lib/region-context";
import { useLang } from "@/lib/lang-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  customFetch,
  useListEmployees,
  getListEmployeesQueryKey,
  useListKpiIndicators,
  getListKpiIndicatorsQueryKey,
  useListDepartments,
  getListDepartmentsQueryKey,
  useCreateEvaluation,
  useUpdateEvaluation,
  useDeleteEvaluation,
  useGetMe,
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
import { ScoreBadge } from "@/components/score-badge";
import { useToast } from "@/hooks/use-toast";

const evaluationSchema = z.object({
  employeeId: z.coerce.number().min(1, "Xodimni tanlang"),
  indicatorId: z.coerce.number().min(1, "Ko'rsatkichni tanlang"),
  period: z.string().min(1, "Davrni kiriting"),
  score: z.coerce.number().min(0, "Ball 0 dan kam bo'lmasligi kerak"),
  comment: z.string().optional(),
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

// Current year-month (YYYY-MM)
const currentMonth = new Date().toISOString().slice(0, 7);

export default function Evaluations() {
  const { globalPeriod, selectedTuman, showAllTumans, viloyatTumanlar } = useRegion();
  const { t, d } = useLang();
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>(globalPeriod);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: evaluations, isLoading } = useQuery<any[]>({
    queryKey: ["evaluations", selectedTuman, showAllTumans, viloyatTumanlar.join(","), departmentId, periodFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (showAllTumans && viloyatTumanlar.length > 0) {
        p.set("tumans", viloyatTumanlar.join(","));
      } else if (selectedTuman) {
        p.set("tuman", selectedTuman);
      }
      if (departmentId !== "all") p.set("departmentId", departmentId);
      if (periodFilter) p.set("period", periodFilter);
      const qs = p.toString();
      return customFetch<any[]>(`${BASE}/api/evaluations${qs ? `?${qs}` : ""}`);
    },
    staleTime: 0,
  });

  const { data: currentUser } = useGetMe();
  const isEmployee = currentUser?.role === "employee";

  const { data: departments } = useListDepartments(undefined, {
    query: { queryKey: getListDepartmentsQueryKey() }
  });

  const { data: employees } = useListEmployees(undefined, {
    query: { queryKey: getListEmployeesQueryKey() }
  });

  const { data: indicators } = useListKpiIndicators(undefined, {
    query: { queryKey: getListKpiIndicatorsQueryKey() }
  });

  const createMutation = useCreateEvaluation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["evaluations"] });
        setIsDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Baholash natijasi saqlandi" });
      },
    },
  });

  const updateMutation = useUpdateEvaluation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["evaluations"] });
        setIsDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Baholash natijasi yangilandi" });
      },
    },
  });

  const deleteMutation = useDeleteEvaluation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["evaluations"] });
        setIsDeleteDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Baholash natijasi o'chirildi" });
      },
    },
  });

  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      employeeId: 0,
      indicatorId: 0,
      period: currentMonth,
      score: 0,
      comment: "",
    },
  });

  const selectedIndicatorId = form.watch("indicatorId");
  
  const maxScore = useMemo(() => {
    if (!selectedIndicatorId || !indicators) return 100;
    const indicator = indicators.find(i => i.id === Number(selectedIndicatorId));
    return indicator?.weight || 100;
  }, [selectedIndicatorId, indicators]);

  const openCreateDialog = () => {
    setSelectedEvaluation(null);
    form.reset({
      employeeId: 0,
      indicatorId: 0,
      period: currentMonth,
      score: 0,
      comment: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (evaluation: any) => {
    setSelectedEvaluation(evaluation);
    form.reset({
      employeeId: evaluation.employeeId,
      indicatorId: evaluation.indicatorId,
      period: evaluation.period,
      score: evaluation.score,
      comment: evaluation.comment || "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (evaluation: any) => {
    setSelectedEvaluation(evaluation);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: EvaluationFormValues) => {
    const payload = {
      ...data,
      maxScore // Automatically set maxScore based on indicator weight
    };
    
    if (selectedEvaluation) {
      updateMutation.mutate({ id: selectedEvaluation.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const onDelete = () => {
    if (selectedEvaluation) {
      deleteMutation.mutate({ id: selectedEvaluation.id });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("pg_evaluations")} description={t("pg_evaluations_desc")}>
        {!isEmployee && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("lbl_new_eval")}
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:w-auto flex-1">
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
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
        </div>
        <div className="w-full md:w-auto">
          <Input
            type="month"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="w-full md:w-[200px]"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => { setDepartmentId("all"); setPeriodFilter(""); }}
          className="w-full md:w-auto"
        >
          {t("btn_clear")}
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col_employee")}</TableHead>
              <TableHead>{t("th_category")} / {t("th_indicator")}</TableHead>
              <TableHead>{t("col_period")}</TableHead>
              <TableHead>{t("col_score")}</TableHead>
              <TableHead>{t("col_result")}</TableHead>
              {!isEmployee && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : evaluations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t("lbl_eval_not_found")}
                </TableCell>
              </TableRow>
            ) : (
              evaluations?.map((evalItem) => {
                const percentage = (evalItem.score / evalItem.maxScore) * 100;
                return (
                  <TableRow key={evalItem.id}>
                    <TableCell className="font-medium">
                      <div>{evalItem.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{evalItem.departmentName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">{evalItem.categoryName}</div>
                      <div>{evalItem.indicatorName}</div>
                    </TableCell>
                    <TableCell>{evalItem.period}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {evalItem.score} / {evalItem.maxScore}
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={percentage} percentage />
                    </TableCell>
                    {!isEmployee && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Menyuni ochish</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(evalItem)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("btn_edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(evalItem)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("btn_delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedEvaluation ? t("dlg_edit_eval") : t("dlg_new_eval")}</DialogTitle>
            <DialogDescription>
              Xodim natijasini qayd etish.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xodim</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.filter(e => e.status === 'active').map((emp) => (
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
                name="indicatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ko'rsatkich</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {indicators?.map((ind) => (
                          <SelectItem key={ind.id} value={ind.id.toString()}>
                            {d(ind.categoryName)} - {d(ind.name)} (Vazn: {ind.weight})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Davr (Oy)</FormLabel>
                      <FormControl>
                        <Input type="month" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ball (Maks: {maxScore})</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" max={maxScore} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Izoh (ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ajoyib natija..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("btn_cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? t("btn_saving") : t("btn_save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("btn_delete")} — {t("pg_evaluations")}</DialogTitle>
            <DialogDescription>
              Haqiqatan ham ushbu baholash natijasini o'chirmoqchimisiz?
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
