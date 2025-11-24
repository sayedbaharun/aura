import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CaptureModalProvider } from "@/lib/capture-modal-store";
import CaptureModal from "@/components/capture-modal";
import CaptureButton from "@/components/capture-button";
import Layout from "@/components/layout";
import CommandCenter from "@/pages/command-center";
import VentureHQ from "@/pages/venture-hq";
import HealthHub from "@/pages/health-hub";
import NutritionDashboard from "@/pages/nutrition-dashboard";
import KnowledgeHub from "@/pages/knowledge-hub";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={CommandCenter} />
        <Route path="/ventures" component={VentureHQ} />
        <Route path="/health" component={HealthHub} />
        <Route path="/nutrition" component={NutritionDashboard} />
        <Route path="/knowledge" component={KnowledgeHub} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CaptureModalProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <CaptureButton />
          <CaptureModal />
        </TooltipProvider>
      </CaptureModalProvider>
    </QueryClientProvider>
  );
}

export default App;
