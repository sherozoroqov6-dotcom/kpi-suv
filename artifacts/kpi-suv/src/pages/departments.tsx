import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  customFetch,
  useGetMe,
} from "@workspace/api-client-react";
import { useRegion } from "@/lib/region-context";

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
import { useLang } from "@/lib/lang-context";

const departmentSchema = z.object({
  name: z.string().min(1, "Bo'lim nomi kiritilishi shart"),
  code: z.string().min(1, "Bo'lim kodi kiritilishi shart"),
  headName: z.string().optional(),
  description: z.string().optional(),
  tuman: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Departments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, d } = useLang();
  const { selectedTuman, showAllTumans, viloyatTumanlar } = useRegion();
  const { data: currentUser } = useGetMe();
  const canEdit = currentUser?.role === "admin";

  const { data: departments, isLoading } = useQuery<any[]>({
    queryKey: ["departments", selectedTuman, showAllTumans, viloyatTumanlar.join(",")],
    queryFn: () => {
      const p = new URLSearchParams();
      if (showAllTumans && viloyatTumanlar.length > 0) {
        p.set("tumans", viloyatTumanlar.join(","));
      } else if (selectedTuman) {
        p.set("tuman", selectedTuman);
      }
      const qs = p.toString();
      return customFetch<any[]>(`${BASE}/api/departments${qs ? `?${qs}` : ""}`);
    },
    staleTime: 0,
  });

  const createMutation = useCreateDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        setIsDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Bo'lim qo'shildi" });
      },
    },
  });

  const updateMutation = useUpdateDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        setIsDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Bo'lim yangilandi" });
      },
    },
  });

  const deleteMutation = useDeleteDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        setIsDeleteDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Bo'lim o'chirildi" });
      },
    },
  });

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      code: "",
      headName: "",
      description: "",
    },
  });

  const openCreateDialog = () => {
    setSelectedDepartment(null);
    form.reset({
      name: "",
      code: "",
      headName: "",
      description: "",
      tuman: selectedTuman || "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (department: any) => {
    setSelectedDepartment(department);
    form.reset({
      name: department.name,
      code: department.code,
      headName: department.headName || "",
      description: department.description || "",
      tuman: department.tuman || "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (department: any) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: DepartmentFormValues) => {
    if (selectedDepartment) {
      updateMutation.mutate({ id: selectedDepartment.id, data: data as any });
    } else {
      createMutation.mutate({ data: data as any });
    }
  };

  const onDelete = () => {
    if (selectedDepartment) {
      deleteMutation.mutate({ id: selectedDepartment.id });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bo'limlar" description="Tashkilot tarkibidagi barcha bo'limlar">
        {canEdit && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Yangi bo'lim
          </Button>
        )}
      </PageHeader>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomi</TableHead>
              <TableHead>Kodi</TableHead>
              <TableHead>Rahbar</TableHead>
              <TableHead>Xodimlar soni</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : departments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Bo'limlar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              departments?.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>{department.code}</TableCell>
                  <TableCell>{department.headName || "-"}</TableCell>
                  <TableCell>{department.employeeCount}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEditDialog(department)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(department)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            O'chirish
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
            <DialogTitle>{selectedDepartment ? "Bo'limni tahrirlash" : "Yangi bo'lim qo'shish"}</DialogTitle>
            <DialogDescription>
              Bo'lim ma'lumotlarini kiriting.
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
                      <Input placeholder="Kadrlar bo'limi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kodi</FormLabel>
                    <FormControl>
                      <Input placeholder="HR-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="headName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rahbar F.I.SH. (ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input placeholder="Eshmatov Toshmat" {...field} />
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
                    <FormLabel>Tavsif (ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input placeholder="..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tuman"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tuman (ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input placeholder="Kattaqo'rg'on tumani" {...field} />
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
            <DialogTitle>Bo'limni o'chirish</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>{selectedDepartment?.name}</strong>ni o'chirmoqchimisiz? Agar bo'limda xodimlar bo'lsa, o'chirib bo'lmaydi.
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
