import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListKpiCategories,
  getListKpiCategoriesQueryKey,
  useCreateKpiCategory,
  useUpdateKpiCategory,
  useDeleteKpiCategory,
  useGetMe,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const categorySchema = z.object({
  name: z.string().min(1, "Kategoriya nomi kiritilishi shart"),
  weight: z.coerce.number().min(1, "Vazn 0 dan katta bo'lishi kerak"),
  color: z.string().optional(),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function KpiCategories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const queryClient = useQueryClient();
  const { t, d } = useLang();
  const { toast } = useToast();
  const { data: currentUser } = useGetMe();
  const canEdit = currentUser?.role !== "employee";

  const { data: categories, isLoading } = useListKpiCategories(undefined, {
    query: { queryKey: getListKpiCategoriesQueryKey() }
  });

  const createMutation = useCreateKpiCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKpiCategoriesQueryKey() });
        setIsDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_cat_added") });
      },
    },
  });

  const updateMutation = useUpdateKpiCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKpiCategoriesQueryKey() });
        setIsDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_cat_updated") });
      },
    },
  });

  const deleteMutation = useDeleteKpiCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKpiCategoriesQueryKey() });
        setIsDeleteDialogOpen(false);
        toast({ title: t("toast_success"), description: t("toast_cat_deleted") });
      },
    },
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      weight: 10,
      color: "#0284c7",
      description: "",
    },
  });

  const openCreateDialog = () => {
    setSelectedCategory(null);
    form.reset({
      name: "",
      weight: 10,
      color: "#0284c7",
      description: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: any) => {
    setSelectedCategory(category);
    form.reset({
      name: category.name,
      weight: category.weight,
      color: category.color || "#0284c7",
      description: category.description || "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (category: any) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: CategoryFormValues) => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const onDelete = () => {
    if (selectedCategory) {
      deleteMutation.mutate({ id: selectedCategory.id });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("pg_kpi_categories")} description={t("pg_kpi_categories_desc")}>
        {canEdit && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("lbl_new_category")}
          </Button>
        )}
      </PageHeader>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("th_name")}</TableHead>
              <TableHead>{t("th_weight")}</TableHead>
              <TableHead>{t("th_indicator_count")}</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t("lbl_category_not_found")}
                </TableCell>
              </TableRow>
            ) : (
              categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color || "#ccc" }} 
                      />
                      {d(category.name)}
                    </div>
                  </TableCell>
                  <TableCell>{category.weight}</TableCell>
                  <TableCell>{category.indicatorCount}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEditDialog(category)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("btn_edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(category)}
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? t("dlg_edit_category") : t("dlg_new_category")}</DialogTitle>
            <DialogDescription>
              KPI toifasi ma'lumotlarini kiriting.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomi</FormLabel>
                    <FormControl>
                      <Input placeholder="Intizom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rang</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" {...field} className="w-12 p-1 h-10" />
                          <Input type="text" {...field} className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
            <DialogTitle>{t("btn_delete")} — {t("pg_kpi_categories")}</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>{d(selectedCategory?.name)}</strong> toifasini o'chirmoqchimisiz? Unga tegishli ko'rsatkichlar ham o'chib ketishi mumkin yoki ruxsat etilmaydi.
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
