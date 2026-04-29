import { useParams } from "wouter";
import { 
  useGetEmployee, 
  getGetEmployeeQueryKey,
  useListEvaluations,
  getListEvaluationsQueryKey
} from "@workspace/api-client-react";
import { Mail, Phone, Calendar, Building2, Briefcase } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

import { useLang } from "@/lib/lang-context";

export default function EmployeeDetail() {
  const { t, d } = useLang();
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);

  const { data: employee, isLoading: isLoadingEmployee } = useGetEmployee(
    employeeId,
    { query: { queryKey: getGetEmployeeQueryKey(employeeId), enabled: !!employeeId } }
  );

  const { data: evaluations, isLoading: isLoadingEvaluations } = useListEvaluations(
    { employeeId },
    { query: { queryKey: getListEvaluationsQueryKey({ employeeId }), enabled: !!employeeId } }
  );

  // Group evaluations by period for the chart
  const evaluationsByPeriod = evaluations?.reduce((acc: any, curr) => {
    if (!acc[curr.period]) {
      acc[curr.period] = {
        period: curr.period,
        totalScore: 0,
        count: 0
      };
    }
    const percentage = (curr.score / curr.maxScore) * 100;
    acc[curr.period].totalScore += percentage;
    acc[curr.period].count += 1;
    return acc;
  }, {});

  const chartData = Object.values(evaluationsByPeriod || {}).map((item: any) => ({
    period: item.period,
    averageScore: Math.round(item.totalScore / item.count)
  })).sort((a: any, b: any) => a.period.localeCompare(b.period));

  if (isLoadingEmployee) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-[300px] md:col-span-1" />
          <Skeleton className="h-[300px] md:col-span-2" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!employee) {
    return <div>Xodim topilmadi</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={d(employee.fullName)} 
        description="Xodimning batafsil ma'lumotlari va baholash tarixi"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Employee Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Shaxsiy Ma'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">{employee.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-bold text-lg">{d(employee.fullName)}</h3>
                <p className="text-sm text-muted-foreground">{d(employee.position)}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                  {employee.status === "active" ? t("status_active") : t("status_inactive")}
                </Badge>
                {employee.averageScore != null && (
                  <ScoreBadge score={employee.averageScore} percentage />
                )}
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{d(employee.departmentName)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{d(employee.position)}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.email}</span>
                </div>
              )}
              {employee.hireDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(employee.hireDate), "dd.MM.yyyy")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>O'rtacha Ballar Tarixi</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, "O'rtacha ball"]}
                    />
                    <Bar dataKey="averageScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Baholash tarixi mavjud emas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Barcha Baholashlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Davr</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead>Ko'rsatkich</TableHead>
                <TableHead>Ball</TableHead>
                <TableHead>Natija</TableHead>
                <TableHead>Izoh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEvaluations ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Yuklanmoqda...</TableCell>
                </TableRow>
              ) : evaluations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Baholashlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                evaluations?.map((evaluation) => {
                  const percentage = (evaluation.score / evaluation.maxScore) * 100;
                  return (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.period}</TableCell>
                      <TableCell>{evaluation.categoryName}</TableCell>
                      <TableCell>{evaluation.indicatorName}</TableCell>
                      <TableCell>{evaluation.score} / {evaluation.maxScore}</TableCell>
                      <TableCell><ScoreBadge score={percentage} percentage /></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {evaluation.comment || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
