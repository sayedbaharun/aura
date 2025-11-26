import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModeController, {
  useModeController,
} from "@/components/command-center/mode-controller";
import VentureFocusPicker from "@/components/command-center/venture-focus-picker";
import MorningHabitsMini from "@/components/command-center/morning-habits-mini";
import TradingJournalEntry from "@/components/command-center/trading-journal-entry";
import DayReviewSummary from "@/components/command-center/day-review-summary";
import TodayHeader from "@/components/command-center/today-header";
import TasksForToday from "@/components/command-center/tasks-for-today";
import HealthSnapshot from "@/components/command-center/health-snapshot";
import NutritionSnapshot from "@/components/command-center/nutrition-snapshot";
import ThisWeekPreview from "@/components/command-center/this-week-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Day } from "@shared/schema";

export default function CommandCenter() {
  const { mode, changeMode } = useModeController();

  const { data: day } = useQuery<Day>({
    queryKey: ["/api/days/today"],
  });

  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground hidden sm:block" />
            <h1 className="text-lg md:text-xl font-semibold">{today}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ModeController currentMode={mode} onModeChange={changeMode} />
          </div>
        </div>

        {/* Mode-Specific Content */}
        {mode === "morning" && <MorningMode day={day || null} />}
        {mode === "execution" && <ExecutionMode day={day || null} />}
        {mode === "evening" && <EveningMode day={day || null} />}
      </div>

      {/* Floating Capture Button (Mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MORNING MODE - Planning & Intention Setting
// ============================================================================
function MorningMode({ day }: { day: Day | null }) {
  const [morningTab, setMorningTab] = useState("overview");

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Venture Focus + Habits Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <VentureFocusPicker day={day} />
        <MorningHabitsMini day={day} />
      </div>

      <Tabs value={morningTab} onValueChange={setMorningTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ritual">Morning Ritual</TabsTrigger>
          <TabsTrigger value="workout">Workout</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <TodayHeader />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Today's Tasks (Preview)
                  </h3>
                  <TasksForToday />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4 md:space-y-6">
              <HealthSnapshot />
            </div>
          </div>
        </TabsContent>

        {/* Morning Ritual Tab */}
        <TabsContent value="ritual">
          <iframe
            src="/morning-ritual"
            className="w-full h-[calc(100vh-250px)] border-0 rounded-lg"
            title="Morning Ritual"
          />
        </TabsContent>

        {/* Workout Tab */}
        <TabsContent value="workout">
          <Card>
            <CardHeader>
              <CardTitle>Workout Tracker</CardTitle>
              <CardDescription>Log today's workout session</CardDescription>
            </CardHeader>
            <CardContent>
              <HealthSnapshot />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// EXECUTION MODE - Focus on Tasks
// ============================================================================
function ExecutionMode({ day }: { day: Day | null }) {
  const [executionTab, setExecutionTab] = useState("tasks");

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Sticky Focus Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <VentureFocusPicker day={day} compact />
          {day?.oneThingToShip && (
            <div className="hidden sm:block">
              <span className="text-xs text-muted-foreground mr-2">Ship:</span>
              <span className="font-medium">{day.oneThingToShip}</span>
            </div>
          )}
        </div>
        {day?.oneThingToShip && (
          <div className="sm:hidden">
            <span className="text-xs text-muted-foreground mr-2">Ship:</span>
            <span className="font-medium text-sm">{day.oneThingToShip}</span>
          </div>
        )}
      </div>

      <Tabs value={executionTab} onValueChange={setExecutionTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="focus">Focus Session</TabsTrigger>
          <TabsTrigger value="health">Health & Nutrition</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <TasksForToday />
            </div>
            <div className="hidden lg:block space-y-4">
              <HealthSnapshot />
              <NutritionSnapshot />
            </div>
          </div>
        </TabsContent>

        {/* Focus Session Tab */}
        <TabsContent value="focus">
          <Card>
            <CardHeader>
              <CardTitle>Focus Session</CardTitle>
              <CardDescription>Deep work timer and current task</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">Focus session timer coming soon</p>
                <p className="text-sm">Track deep work sessions with Pomodoro timer</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health & Nutrition Tab */}
        <TabsContent value="health">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <HealthSnapshot />
            <NutritionSnapshot />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// EVENING MODE - Review & Reflection
// ============================================================================
function EveningMode({ day }: { day: Day | null }) {
  const [eveningTab, setEveningTab] = useState("review");

  return (
    <div className="space-y-4 md:space-y-6">
      <Tabs value={eveningTab} onValueChange={setEveningTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
        </TabsList>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4 md:space-y-6">
          <DayReviewSummary day={day} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium mb-4">Incomplete Tasks</h3>
                <TasksForToday showOnlyIncomplete />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today's Highlights</CardTitle>
                <CardDescription>What went well today?</CardDescription>
              </CardHeader>
              <CardContent>
                <TodayHeader showReflection />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trading Tab */}
        <TabsContent value="trading">
          <TradingJournalEntry day={day} />
        </TabsContent>

        {/* Tomorrow Tab */}
        <TabsContent value="tomorrow" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan Tomorrow</CardTitle>
              <CardDescription>Set your priorities for the next day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">Tomorrow planning interface coming soon</p>
                <p className="text-sm">Set top 3 priorities and schedule deep work blocks</p>
              </div>
            </CardContent>
          </Card>

          <ThisWeekPreview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
