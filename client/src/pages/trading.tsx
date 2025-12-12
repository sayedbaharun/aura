import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { TrendingUp, Settings, History, Target, Bot } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TradingJournalEntry from "@/components/command-center/trading-journal-entry";
import TradingStrategyDashboard from "@/components/trading/trading-strategy-dashboard";
import TradingStrategiesManager from "@/components/trading/trading-strategies-manager";
import TradingSessionIndicator from "@/components/trading/trading-session-indicator";
import TradingAiChat from "@/components/trading/trading-ai-chat";
import type { Day } from "@shared/schema";

export default function TradingPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: day, isLoading } = useQuery<Day>({
    queryKey: ["/api/days/today"],
  });

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Trading</h1>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
          </div>
          <TradingSessionIndicator />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="strategies" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Strategies
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Journal
            </TabsTrigger>
            <TabsTrigger value="ai-agent" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Agent
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <TradingStrategyDashboard />
          </TabsContent>

          <TabsContent value="strategies" className="mt-6">
            <TradingStrategiesManager />
          </TabsContent>

          <TabsContent value="journal" className="mt-6">
            {isLoading ? (
              <div className="h-48 bg-muted animate-pulse rounded-lg" />
            ) : (
              <TradingJournalEntry day={day || null} />
            )}
          </TabsContent>

          <TabsContent value="ai-agent" className="mt-6">
            <TradingAiChat />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Historical Analysis</p>
              <p className="text-sm">Coming in Phase 2</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
