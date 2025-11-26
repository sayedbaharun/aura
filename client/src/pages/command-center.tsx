import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Plus } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
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
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Venture Focus + Habits Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <VentureFocusPicker day={day} />
        <MorningHabitsMini day={day} />
      </div>

      {/* One Thing to Ship + Top 3 */}
      <TodayHeader />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Tasks Preview */}
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

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          <HealthSnapshot />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXECUTION MODE - Focus on Tasks
// ============================================================================
function ExecutionMode({ day }: { day: Day | null }) {
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Tasks - Hero Section */}
        <div className="lg:col-span-2">
          <TasksForToday />
        </div>

        {/* Sidebar - Collapsed by Default on Mobile */}
        <div className="space-y-4">
          <Collapsible defaultOpen={false} className="lg:hidden">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Health & Nutrition
                <span className="text-xs text-muted-foreground">Tap to expand</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <HealthSnapshot />
              <NutritionSnapshot />
            </CollapsibleContent>
          </Collapsible>

          {/* Desktop - Always Visible */}
          <div className="hidden lg:block space-y-4">
            <HealthSnapshot />
            <NutritionSnapshot />
          </div>
        </div>
      </div>

    </div>
  );
}

// ============================================================================
// EVENING MODE - Review & Reflection
// ============================================================================
function EveningMode({ day }: { day: Day | null }) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Day Summary */}
      <DayReviewSummary day={day} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Trading Journal */}
        <TradingJournalEntry day={day} />

        {/* Incomplete Tasks */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-4">Incomplete Tasks</h3>
            <TasksForToday showOnlyIncomplete />
          </CardContent>
        </Card>
      </div>

      {/* Evening Reflection */}
      <TodayHeader showReflection />

      {/* Week Preview */}
      <ThisWeekPreview />
    </div>
  );
}
