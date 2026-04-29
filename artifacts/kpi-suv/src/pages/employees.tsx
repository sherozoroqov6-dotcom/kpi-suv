import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListDepartments,
  getListDepartmentsQueryKey,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/score-badge";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/lang-context";

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
  username: z.string().min(3, "Login kamida 3 ta belgi").optional().or(z.literal("")),
  password: z.string().min(4, "Parol kamida 4 ta belgi").optional().or(z.literal("")),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Employees() {
  const { t, d } = useLang();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedTuman, showAllTumans, viloyatTumanlar } = useRegion();
  const { data: currentUser } = useGetMe();
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "manager";

  const { data: employees, isLoading } = useQuery<any[]>({
    queryKey: ["employees", selectedTuman, showAllTumans, viloyatTumanlar.join(","), search, departmentId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (showAllTumans && viloyatTumanlar.length > 0) {
        p.set("tumans", viloyatTumanlar.join(","));
      } else if (selectedTuman) {
        p.set("tuman", selectedTuman);
      }
      if (search) p.set("search", search);
      if (departmentId !== "all") p.set("departmentId", departmentId);
      const qs = p.toString();
      return customFetch<any[]>(`${BASE}/api/employees${qs ? `?${qs}` : ""}`);
    },
    staleTime: 0,
  });

  const { data: departments } = useListDepartments(undefined, {
    query: { queryKey: getListDepartmentsQueryKey() }
  });

  const createMutation = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        setIsDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Xodim qo'shildi" });
      },
    },
  });

  const updateMutation = useUpdateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        setIsDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Xodim ma'lumotlari yangilandi" });
      },
    },
  });

  const deleteMutation = useDeleteEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        setIsDeleteDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Xodim o'chirildi" });
      },
    },
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "",
      position: "",
      departmentId: 0,
      status: "active",
      phone: "",
      email: "",
      hireDate: new Date().toISOString().split("T")[0],
    },
  });

  const openCreateDialog = () => {
    setSelectedEmployee(null);
    form.reset({
      fullName: "",
      position: "",
      departmentId: 0,
      status: "active",
      phone: "",
      email: "",
      hireDate: new Date().toISOString().split("T")[0],
      tuman: selectedTuman || "",
      passportSeries: "",
      passportNumber: "",
      pinfl: "",
      username: "",
      password: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (employee: any) => {
    setSelectedEmployee(employee);
    form.reset({
      fullName: employee.fullName,
      position: employee.position,
      departmentId: employee.departmentId,
      status: employee.status,
      phone: employee.phone || "",
      email: employee.email || "",
      hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : "",
      tuman: employee.tuman || "",
      passportSeries: employee.passportSeries || "",
      passportNumber: employee.passportNumber || "",
      pinfl: employee.pinfl || "",
      username: employee.username || "",
      password: "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: EmployeeFormValues) => {
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: data as any });
    } else {
      createMutation.mutate({ data: data as any });
    }
  };

  const onDelete = () => {
    if (selectedEmployee) {
      deleteMutation.mutate({ id: selectedEmployee.id });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Xodimlar" description="Barcha xodimlar ro'yxati va ularning KPI natijalari">
        {canEdit && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Yangi xodim
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="F.I.SH. bo'yicha izlash..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Barcha bo'limlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha bo'limlar</SelectItem>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id.toString()}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>F.I.SH.</TableHead>
              <TableHead>Lavozim</TableHead>
              <TableHead>Bo'lim</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>O'rtacha ball</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : employees?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Xodimlar topilmadi
                </TableCell>
              </TableRow>
            ) : (
              employees?.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    <Link href={`/employees/${employee.id}`} className="hover:underline text-primary">
                      {employee.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.departmentName}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                      {employee.status === "active" ? t("status_active") : t("status_inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.username ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md w-fit">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span className="font-mono font-medium">{employee.username}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <ShieldOff className="h-3.5 w-3.5" />
                        <span>Yo'q</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {employee.averageScore != null ? (
                      <ScoreBadge score={employee.averageScore} percentage />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
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
                          <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(employee)}
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
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}</DialogTitle>
            <DialogDescription>
              Xodim ma'lumotlarini kiriting va saqlash tugmasini bosing.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* ── Asosiy ma'lumotlar ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asosiy ma'lumotlar</span>
                </div>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>F.I.SH.</FormLabel>
                      <FormControl>
                        <Input placeholder="Eshmatov Toshmat Baxtiyorovich" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lavozim</FormLabel>
                        <FormControl>
                          <Input placeholder="Muhandis" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bo'lim</FormLabel>
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
                            {departments?.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Holati</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Tanlang..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">{t("status_active")}</SelectItem>
                            <SelectItem value="inactive">{t("status_inactive")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ishga kirgan sana</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon (ixtiyoriy)</FormLabel>
                        <FormControl>
                          <Input placeholder="+998 90 123 45 67" {...field} />
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
                </div>
              </div>

              {/* ── Pasport ma'lumotlari ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pasport ma'lumotlari</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="passportSeries"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seriya</FormLabel>
                        <FormControl>
                          <Input placeholder="AA" maxLength={2} className="uppercase" {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="passportNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raqami</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567" maxLength={7} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pinfl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PINFL (JSHIR)</FormLabel>
                        <FormControl>
                          <Input placeholder="12345678901234" maxLength={14} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Tizimga kirish ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-blue-100">
                  <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Tizimga kirish ma'lumotlari</span>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  Xodim shu login va parol orqali tizimga kiradi. Agar login berilmasa, xodim tizimga kira olmaydi.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login <span className="text-gray-400 font-normal">(ixtiyoriy)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="eshmatov_t" {...field} />
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
                        <FormLabel>
                          Parol{" "}
                          {selectedEmployee?.username && (
                            <span className="text-gray-400 font-normal">(o'zgartirish uchun kiriting)</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
            <DialogTitle>Xodimni o'chirish</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>{selectedEmployee?.fullName}</strong> ismli xodimni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
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
