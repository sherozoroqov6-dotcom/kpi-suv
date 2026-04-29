import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useLang } from "@/lib/lang-context";
import { LogOut, User as UserIcon, Mail, Shield } from "lucide-react";
import { format } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { data: user } = useGetMe();
  const { t, d } = useLang();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={t("pg_settings")} description={t("pg_settings_desc")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings_profile_title")}</CardTitle>
          <CardDescription>{t("settings_profile_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-3xl">
                {user?.fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{d(user?.fullName)}</h2>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                <Badge variant="outline" className="capitalize flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {user?.role}
                </Badge>
                {user?.departmentId && (
                  <Badge variant="secondary">{t("settings_dept_badge")} {user.departmentId}</Badge>
                )}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid gap-6 md:grid-cols-2 pt-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                <UserIcon className="w-4 h-4" /> {t("settings_username_label")}
              </div>
              <div className="p-3 bg-muted rounded-md font-mono text-sm">
                {user?.username}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-muted-foreground gap-2">
                <Shield className="w-4 h-4" /> {t("settings_joined_label")}
              </div>
              <div className="p-3 bg-muted rounded-md text-sm">
                {user?.createdAt ? format(new Date(user.createdAt), "dd.MM.yyyy HH:mm") : "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">{t("settings_security_title")}</CardTitle>
          <CardDescription>{t("settings_security_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings_logout_notice")}
          </p>
          <Button variant="destructive" onClick={handleLogout} disabled={logout.isPending}>
            <LogOut className="w-4 h-4 mr-2" />
            {logout.isPending ? t("btn_logout_pending") : t("btn_logout")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
