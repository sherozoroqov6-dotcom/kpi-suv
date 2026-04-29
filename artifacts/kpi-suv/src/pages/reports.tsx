import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  useGetDepartmentScores, 
  getGetDepartmentScoresQueryKey,
  useGetMonthlyTrend,
  getGetMonthlyTrendQueryKey,
  useGetTopEmployees,
  getGetTopEmployeesQueryKey
} from "@workspace/api-client-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreBadge } from "@/components/score-badge";

export default function Reports() {
  const { data: deptScores, isLoading: isLoadingDepts } = useGetDepartmentScores(
    {},
    { query: { queryKey: getGetDepartmentScoresQueryKey({}) } }
  );
  
  const { data: monthlyTrend, isLoading: isLoadingTrend } = useGetMonthlyTrend({
    query: { queryKey: getGetMonthlyTrendQueryKey() }
  });

  const { data: topEmployees, isLoading: isLoadingTop } = useGetTopEmployees(
    { limit: 10 },
    { query: { queryKey: getGetTopEmployeesQueryKey({ limit: 10 }) } }
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Hisobotlar va tahlil" description="Tashkilot bo'yicha umumiy reytinglar va tendensiyalar" />

      <Card>
        <CardHeader>
          <CardTitle>Yillik KPI tendensiyasi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTrend ? (
            <Skeleton className="h-[350px] w-full" />
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${Math.round(value)}%`, "O'rtacha ball"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="averageScore" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bo'limlar reytingi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDepts ? (
            <Skeleton className="h-[350px] w-full" />
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptScores} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="departmentName" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${Math.round(value)}%`, "O'rtacha ball"]}
                  />
                  <Bar dataKey="scorePercentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eng yaxshi xodimlar (joriy davr)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">O'rin</TableHead>
                <TableHead>F.I.SH.</TableHead>
                <TableHead>Lavozim</TableHead>
                <TableHead>Bo'lim</TableHead>
                <TableHead>Natija</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTop ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[20px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                  </TableRow>
                ))
              ) : topEmployees?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Ma'lumot topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                topEmployees?.map((emp, i) => (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{emp.fullName}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>{emp.departmentName}</TableCell>
                    <TableCell>
                      <ScoreBadge score={emp.scorePercentage} percentage />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
