import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CaptureModalProvider } from "@/lib/capture-modal-store";
import { TaskDetailModalProvider } from "@/lib/task-detail-modal-store";
import CaptureModal from "@/components/capture-modal";
import CaptureButton from "@/components/capture-button";
import TaskDetailModal from "@/components/task-detail-modal";
import Layout from "@/components/layout";
import CommandCenter from "@/pages/command-center";
import VentureHQ from "@/pages/venture-hq";
import VentureDetail from "@/pages/venture-detail";
import HealthHub from "@/pages/health-hub";
import NutritionDashboard from "@/pages/nutrition-dashboard";
import KnowledgeHub from "@/pages/knowledge-hub";
import DocDetail from "@/pages/doc-detail";
import DeepWork from "@/pages/deep-work";
import NotificationsPage from "@/pages/notifications";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { dailyRemindersService } from "@/lib/daily-reminders";

function Router() {
  // Initialize daily reminders service on app load
  useEffect(() => {
    dailyRemindersService.init();
  }, []);

  return (
    <Layout>
      <Switch>
        <Route path="/" component={CommandCenter} />
        <Route path="/ventures" component={VentureHQ} />
        <Route path="/ventures/:id" component={VentureDetail} />
        <Route path="/health" component={HealthHub} />
        <Route path="/nutrition" component={NutritionDashboard} />
        <Route path="/knowledge" component={KnowledgeHub} />
        <Route path="/knowledge/:id" component={DocDetail} />
        <Route path="/deep-work" component={DeepWork} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CaptureModalProvider>
        <TaskDetailModalProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <CaptureButton />
            <CaptureModal />
            <TaskDetailModal />
          </TooltipProvider>
        </TaskDetailModalProvider>
      </CaptureModalProvider>
    </QueryClientProvider>
  );
}

export default App;
