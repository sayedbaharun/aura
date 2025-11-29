import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CaptureModalProvider } from "@/lib/capture-modal-store";
import { TaskDetailModalProvider } from "@/lib/task-detail-modal-store";
import CaptureModal from "@/components/capture-modal";
import TaskDetailModal from "@/components/task-detail-modal";
import Layout from "@/components/layout";
import Landing from "@/pages/landing";
import CommandCenter from "@/pages/command-center";
import VentureHQ from "@/pages/venture-hq";
import VentureDetail from "@/pages/venture-detail";
import HealthHub from "@/pages/health-hub";
import NutritionDashboard from "@/pages/nutrition-dashboard";
import KnowledgeHub from "@/pages/knowledge-hub";
import DocDetail from "@/pages/doc-detail";
import DeepWork from "@/pages/deep-work";
import NotificationsPage from "@/pages/notifications";
import SettingsPage from "@/pages/settings";
import MorningRitual from "@/pages/morning-ritual";
import EveningReview from "@/pages/evening-review";
import Shopping from "@/pages/shopping";
import Books from "@/pages/books";
import CapturePage from "@/pages/capture";
import TradingPage from "@/pages/trading";
import AiChat from "@/pages/ai-chat";
import AllTasks from "@/pages/all-tasks";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { dailyRemindersService } from "@/lib/daily-reminders";

function Router() {
  // Initialize daily reminders service on app load
  useEffect(() => {
    dailyRemindersService.init();
  }, []);

  return (
    <Switch>
      {/* Landing page without layout */}
      <Route path="/" component={Landing} />

      {/* Main app with layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/dashboard" component={CommandCenter} />
            <Route path="/ventures" component={VentureHQ} />
            <Route path="/ventures/:id" component={VentureDetail} />
            <Route path="/health" component={HealthHub} />
            <Route path="/nutrition" component={NutritionDashboard} />
            <Route path="/knowledge" component={KnowledgeHub} />
            <Route path="/knowledge/:id" component={DocDetail} />
            <Route path="/deep-work" component={DeepWork} />
            <Route path="/notifications" component={NotificationsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/morning" component={MorningRitual} />
            <Route path="/evening" component={EveningReview} />
            <Route path="/shopping" component={Shopping} />
            <Route path="/books" component={Books} />
            <Route path="/capture" component={CapturePage} />
            <Route path="/trading" component={TradingPage} />
            <Route path="/ai-chat" component={AiChat} />
            <Route path="/tasks" component={AllTasks} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
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
            <CaptureModal />
            <TaskDetailModal />
          </TooltipProvider>
        </TaskDetailModalProvider>
      </CaptureModalProvider>
    </QueryClientProvider>
  );
}

export default App;
