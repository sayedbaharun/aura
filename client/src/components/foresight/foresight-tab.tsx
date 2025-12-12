/**
 * Foresight Tab - Main foresight module component with sub-tabs
 */
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForesightDashboard } from "./foresight-dashboard";
import { ScenarioManager } from "./scenario-manager";
import { IndicatorList } from "./indicator-list";
import { LayoutDashboard, Target, AlertTriangle, TrendingUp, HelpCircle, Bot } from "lucide-react";

interface ForesightTabProps {
  ventureId: string;
}

export function ForesightTab({ ventureId }: ForesightTabProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="scenarios" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Scenarios
        </TabsTrigger>
        <TabsTrigger value="indicators" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Indicators
        </TabsTrigger>
        <TabsTrigger value="signals" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Signals
        </TabsTrigger>
        <TabsTrigger value="whatifs" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          What-Ifs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ForesightDashboard
          ventureId={ventureId}
          onNavigateToScenarios={() => setActiveTab("scenarios")}
          onNavigateToIndicators={() => setActiveTab("indicators")}
          onNavigateToSignals={() => setActiveTab("signals")}
          onNavigateToWhatIfs={() => setActiveTab("whatifs")}
        />
      </TabsContent>

      <TabsContent value="scenarios">
        <ScenarioManager ventureId={ventureId} />
      </TabsContent>

      <TabsContent value="indicators">
        <IndicatorList ventureId={ventureId} />
      </TabsContent>

      <TabsContent value="signals">
        <SignalsPlaceholder ventureId={ventureId} />
      </TabsContent>

      <TabsContent value="whatifs">
        <WhatIfsPlaceholder ventureId={ventureId} />
      </TabsContent>
    </Tabs>
  );
}

// Placeholder components - to be fully implemented
function SignalsPlaceholder({ ventureId }: { ventureId: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
      <h3 className="text-lg font-medium mb-2">Trend Signals</h3>
      <p className="text-sm">Coming soon - Track emerging trends and weak signals</p>
    </div>
  );
}

function WhatIfsPlaceholder({ ventureId }: { ventureId: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <HelpCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
      <h3 className="text-lg font-medium mb-2">What-If Questions</h3>
      <p className="text-sm">Coming soon - Generate and explore strategic questions</p>
    </div>
  );
}
