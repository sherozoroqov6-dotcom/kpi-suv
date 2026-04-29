import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Check, X, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListKpiIndicators,
  getListKpiIndicatorsQueryKey,
  useListKpiCategories,
  getListKpiCategoriesQueryKey,
  useCreateKpiIndicator,
  useUpdateKpiIndicator,
  useDeleteKpiIndicator,
  useGetMe,
  useListEmployees,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const indicatorSchema = z.object({
  name: z.string().min(1, "Ko'rsatkich nomi kiritilishi shart"),
  categoryId: z.coerce.number().min(1, "Toifani tanlang"),
  weight: z.coerce.number().min(1, "Vazn 0 dan katta bo'lishi kerak"),
  unit: z.string().optional(),
  targetValue: z.coerce.number().optional(),
  description: z.string().optional(),
});

type IndicatorFormValues = z.infer<typeof indicatorSchema>;

// ── Ichki ko'p-tanlash komponenti ──────────────────────────────────────────
function EmployeeMultiPicker({
  selected,
  onChange,
  options,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
  options: { id: number; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (id: number) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Badge uchun faqat ism (departament nomini olib tashlaydi)
  const shortName = (label: string) => label.split("(")[0].trim();

  const selectedOptions = selected
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean) as { id: number; label: string }[];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full min-h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm text-left flex items-start gap-2 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div className="flex-1 flex flex-wrap gap-1.5">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground text-sm">Xodimlarni tanlang...</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs rounded-full px-2.5 py-0.5 font-medium max-w-[200px]"
              >
                <span className="truncate">{shortName(opt.label)}</span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(opt.id);
                  }}
                  className="shrink-0 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpen(false); setSearch(""); }}
          />
          <div className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Qidirish..."
                className="w-full text-sm px-3 py-1.5 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">Xodim topilmadi</p>
              ) : (
                filtered.map((o) => {
                  const checked = selected.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(o.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${checked ? "bg-primary/5" : ""}`}
                    >
                      <span
                        className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-muted-foreground"}`}
                      >
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="truncate">{o.label}</span>
                    </button>
                  );
                })
              )}
            </div>
            {selected.length > 0 && (
              <div className="border-t p-2">
                <button
                  type="button"
                  onClick={() => { onChange([]); setOpen(false); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Barchasini olib tashlash
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export default function KpiIndicators() {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  // Ko'p-tanlash uchun alohida state (react-hook-form'dan tashqari)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

  const queryClient = useQueryClient();
  const { t, d } = useLang();
  const { toast } = useToast();
  const { data: currentUser } = useGetMe();
  const canEdit = currentUser?.role !== "employee";

  const { data: indicators, isLoading } = useListKpiIndicators(
    { categoryId: categoryId !== "all" ? Number(categoryId) : undefined },
    {
      query: {
        queryKey: getListKpiIndicatorsQueryKey({ categoryId: categoryId !== "all" ? Number(categoryId) : undefined })
      }
    }
  );

  const { data: categories } = useListKpiCategories(undefined, {
    query: { queryKey: getListKpiCategoriesQueryKey() }
  });

  const { data: employeesRaw } = useListEmployees(undefined, {
    query: { queryKey: getListEmployeesQueryKey() },
  });
  const employeeList: any[] = Array.isArray(employeesRaw)
    ? employeesRaw
    : (employeesRaw as any)?.employees ?? [];
  const activeEmployees = employeeList.filter((e) => e.status === "active");

  const employeePickerOptions = activeEmployees.map((emp: any) => ({
    id: emp.id as number,
    label: emp.fullName + (emp.departmentName ? ` (${emp.departmentName})` : ""),
  }));

  const createMutation = useCreateKpiIndicator({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKpiIndicatorsQueryKey() });
        setIsDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_ind_added") });
      },
    },
  });

  const updateMutation = useUpdateKpiIndicator({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKpiIndicatorsQueryKey() });
        setIsDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_ind_updated") });
      },
    },
  });

  const deleteMutation = useDeleteKpiIndicator({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKpiIndicatorsQueryKey() });
        setIsDeleteDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_ind_deleted") });
      },
    },
  });

  const form = useForm<IndicatorFormValues>({
    resolver: zodResolver(indicatorSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      weight: 10,
      unit: "",
      targetValue: 100,
      description: "",
    },
  });

  const openCreateDialog = () => {
    setSelectedIndicator(null);
    setSelectedEmployeeIds([]);
    form.reset({
      name: "",
      categoryId: categoryId !== "all" ? Number(categoryId) : 0,
      weight: 10,
      unit: "",
      targetValue: 100,
      description: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (indicator: any) => {
    setSelectedIndicator(indicator);
    const empIds: number[] = Array.isArray(indicator.employeeIds) ? indicator.employeeIds : [];
    setSelectedEmployeeIds(empIds);
    form.reset({
      name: indicator.name,
      categoryId: indicator.categoryId,
      weight: indicator.weight,
      unit: indicator.unit || "",
      targetValue: indicator.targetValue || 0,
      description: indicator.description || "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (indicator: any) => {
    setSelectedIndicator(indicator);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: IndicatorFormValues) => {
    const payload = {
      ...data,
      employeeIds: selectedEmployeeIds,
    };
    if (selectedIndicator) {
      updateMutation.mutate({ id: selectedIndicator.id, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  };

  const onDelete = () => {
    if (selectedIndicator) {
      deleteMutation.mutate({ id: selectedIndicator.id });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("pg_kpi_indicators")} description={t("pg_kpi_indicators_desc")}>
        {canEdit && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("lbl_new_indicator")}
          </Button>
        )}
      </PageHeader>

      <div className="flex md:w-1/3">
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder={t("filter_all_categories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all_categories")}</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {d(cat.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("th_indicator")}</TableHead>
              <TableHead>{t("th_category")}</TableHead>
              <TableHead>{t("col_unit")}</TableHead>
              <TableHead>{t("col_target")}</TableHead>
              <TableHead>{t("th_weight")}</TableHead>
              <TableHead>Bog'langan xodimlar</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : indicators?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t("lbl_indicator_not_found")}
                </TableCell>
              </TableRow>
            ) : (
              indicators?.map((indicator: any) => (
                <TableRow key={indicator.id}>
                  <TableCell className="font-medium">{d(indicator.name)}</TableCell>
                  <TableCell>{indicator.categoryName}</TableCell>
                  <TableCell>{indicator.unit || "-"}</TableCell>
                  <TableCell>{indicator.targetValue || "-"}</TableCell>
                  <TableCell>{indicator.weight}</TableCell>
                  <TableCell>
                    {Array.isArray(indicator.employeeNames) && indicator.employeeNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {indicator.employeeNames.map((name: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5"
                          >
                            <Users className="h-3 w-3" />
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Menyuni ochish</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(indicator)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("btn_edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(indicator)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("btn_delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{selectedIndicator ? t("dlg_edit_indicator") : t("dlg_new_indicator")}</DialogTitle>
            <DialogDescription>
              KPI ko'rsatkichi ma'lumotlarini kiriting.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomi</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ko'rsatkich nomini kiriting..."
                          className="resize-none min-h-[72px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Toifa</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tanlang..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-64 overflow-y-auto">
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {d(cat.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vazn</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>O'lchov (ixtiyoriy)</FormLabel>
                        <FormControl>
                          <Input placeholder="%, dona" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maqsad (ixtiyoriy)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Bog'langan xodimlar (ixtiyoriy)
                  </label>
                  <EmployeeMultiPicker
                    selected={selectedEmployeeIds}
                    onChange={setSelectedEmployeeIds}
                    options={employeePickerOptions}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tavsif (ixtiyoriy)</FormLabel>
                      <FormControl>
                        <Input placeholder="..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-2">
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
            <DialogTitle>{t("btn_delete")} — {t("pg_kpi_indicators")}</DialogTitle>
            <DialogDescription>
              Haqiqatan ham ushbu ko'rsatkichni o'chirmoqchimisiz? Bunga ulangan barcha baholashlar ham ta'sir qilishi mumkin.
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
