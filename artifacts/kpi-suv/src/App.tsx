import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

import { AppLayout } from "@/components/layout/app-layout";
import { RegionProvider } from "@/lib/region-context";
import { LangProvider } from "@/lib/lang-context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Staff from "@/pages/staff";
import EmployeeDetail from "@/pages/employee-detail";
import KpiCategories from "@/pages/kpi-categories";
import KpiIndicators from "@/pages/kpi-indicators";
import Evaluations from "@/pages/evaluations";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import WorkPlans from "@/pages/work-plans";
import WorkPlanCreate from "@/pages/work-plan-create";
import WorkPlanDetail from "@/pages/work-plan-detail";
import Mfylar from "@/pages/mfylar";
import AdminPanel from "@/pages/admin-panel";
import ApprovePage from "@/pages/approve";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: any }) {
  const { data: user, error, isLoading } = useGetMe({ 
    query: { queryKey: getGetMeQueryKey(), retry: 0 } 
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (error) {
      setLocation("/login");
    }
  }, [error, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Redirect root to dashboard */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/staff">
        <ProtectedRoute component={Staff} />
      </Route>
      <Route path="/employees">
        <Redirect to="/staff" />
      </Route>
      <Route path="/employees/:id">
        <ProtectedRoute component={EmployeeDetail} />
      </Route>
      <Route path="/departments">
        <Redirect to="/staff" />
      </Route>
      <Route path="/kpi-categories">
        <ProtectedRoute component={KpiCategories} />
      </Route>
      <Route path="/kpi-indicators">
        <ProtectedRoute component={KpiIndicators} />
      </Route>
      <Route path="/evaluations">
        <ProtectedRoute component={Evaluations} />
      </Route>
      <Route path="/work-plans">
        <ProtectedRoute component={WorkPlans} />
      </Route>
      <Route path="/work-plans/new">
        <ProtectedRoute component={WorkPlanCreate} />
      </Route>
      <Route path="/work-plans/:id">
        <ProtectedRoute component={WorkPlanDetail} />
      </Route>
      <Route path="/mfylar">
        <ProtectedRoute component={Mfylar} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/admin-panel">
        <ProtectedRoute component={AdminPanel} />
      </Route>
      <Route path="/approve">
        <ProtectedRoute component={ApprovePage} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <RegionProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </RegionProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
