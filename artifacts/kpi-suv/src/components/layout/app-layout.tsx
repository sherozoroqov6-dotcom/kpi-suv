import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useRegion } from "@/lib/region-context";
import { 
  LayoutDashboard, 
  Users,
  Layers, 
  Gauge, 
  Star,
  CalendarCheck,
  Settings2,
  LogOut,
  MapPinned,
  UserCog,
  BadgeCheck,
} from "lucide-react";
import logoImg from "@assets/logo_new_transparent.png";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLang, TranslationKey } from "@/lib/lang-context";

function NavItem({ href, icon: Icon, labelKey, location }: { href: string; icon: any; labelKey: TranslationKey; location: string }) {
  const isActive = location === href || (location.startsWith(href) && href !== "/dashboard");
  const { t } = useLang();
  const title = t(labelKey);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={title}
        className="rounded-lg h-9 text-sm font-medium"
      >
        <Link href={href}>
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span>{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}


export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();
  const { t } = useLang();
  const { setSelectedViloyat, setSelectedTuman } = useRegion();

  useEffect(() => {
    if (user?.viloyat) {
      setSelectedViloyat(user.viloyat);
      setSelectedTuman(user.tuman ?? "");
    }
  }, [user?.viloyat, user?.tuman]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      }
    });
  };

  const roleLabels: Record<string, string> = {
    admin: t("role_admin"),
    manager: t("role_manager"),
    employee: t("role_employee"),
  };

  const topItems = [
    { labelKey: "nav_dashboard" as TranslationKey, href: "/dashboard", icon: LayoutDashboard },
    { labelKey: "nav_staff"     as TranslationKey, href: "/staff",     icon: Users },
  ];

  const kpiItems = [
    { labelKey: "nav_kpi_categories" as TranslationKey, href: "/kpi-categories", icon: Layers },
    { labelKey: "nav_kpi_indicators" as TranslationKey, href: "/kpi-indicators", icon: Gauge },
    { labelKey: "nav_evaluations"    as TranslationKey, href: "/evaluations",    icon: Star },
    { labelKey: "nav_work_plans"     as TranslationKey, href: "/work-plans",     icon: CalendarCheck },
  ];

  const bottomItems = [
    { labelKey: "nav_mfylar"   as TranslationKey, href: "/mfylar",   icon: MapPinned },
    { labelKey: "nav_settings" as TranslationKey, href: "/settings", icon: Settings2 },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f0f5fb] dark:bg-background">
        <Sidebar variant="sidebar" className="border-r border-sidebar-border">
          {/* Logo */}
          <SidebarHeader className="px-3 pt-3 pb-3 border-b border-sidebar-border/50 flex-shrink-0">
            <div className="flex flex-col items-center gap-0 text-center">
              <img src={logoImg} alt="Logo" className="h-24 w-24 object-contain" />
              <span className="text-sm font-bold leading-tight text-sidebar-foreground tracking-wide -mt-1">
                {t("nav_suv")}
              </span>
              <span className="text-[11px] text-sidebar-foreground/50 leading-tight mt-0.5">
                {t("nav_kpi_system")}
              </span>
            </div>
          </SidebarHeader>

          {/* Logged-in user profile */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-sidebar-border/30 flex-shrink-0">
            <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-cyan-400/60 shadow-md">
              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                {user?.fullName
                  ? user.fullName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
                  : "A"}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-bold text-sidebar-foreground uppercase tracking-wide leading-snug truncate">
              {user?.fullName || t("nav_user")}
            </p>
          </div>

          <SidebarContent className="px-2 py-2 overflow-y-auto">
            <SidebarMenu>
              {topItems.map((item) => (
                <NavItem key={item.href} {...item} location={location} />
              ))}
            </SidebarMenu>

            <SidebarGroup className="mt-1 p-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  {kpiItems.map((item) => (
                    <NavItem key={item.href} {...item} location={location} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-1 p-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  {bottomItems.map((item) => (
                    <NavItem key={item.href} {...item} location={location} />
                  ))}
                  {user?.role === "admin" && (
                    <NavItem
                      href="/approve"
                      icon={BadgeCheck}
                      labelKey="nav_approve"
                      location={location}
                    />
                  )}
                  {user?.username === "5279606" && (
                    <NavItem
                      href="/admin-panel"
                      icon={UserCog}
                      labelKey="nav_admin"
                      location={location}
                    />
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="px-3 py-3 border-t border-sidebar-border/50">
            <div className="flex items-center justify-between w-full rounded-xl bg-sidebar-accent/60 px-3 py-2.5">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-semibold">
                    {user?.fullName?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="text-sm font-semibold truncate text-sidebar-foreground leading-tight">
                    {user?.fullName || t("nav_user")}
                  </span>
                  <span className="text-[11px] text-sidebar-foreground/50 truncate capitalize leading-tight mt-0.5">
                    {roleLabels[user?.role || ""] || user?.role}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-7 w-7 flex-shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                title={t("nav_logout")}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 flex items-center gap-3 px-4 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 lg:hidden shadow-sm">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="Logo" className="h-9 w-9 object-contain" />
              <span className="font-semibold text-sm">{t("nav_suv")} KPI</span>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
