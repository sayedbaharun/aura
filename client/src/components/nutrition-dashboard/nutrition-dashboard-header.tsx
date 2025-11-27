import { useState } from "react";
import { Apple, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddMealModal from "./add-meal-modal";
import SetGoalsModal from "./set-goals-modal";

interface NutritionDashboardHeaderProps {
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  onGoalsUpdated: () => void;
}

export default function NutritionDashboardHeader({
  dateFilter,
  onDateFilterChange,
  onGoalsUpdated,
}: NutritionDashboardHeaderProps) {
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showSetGoals, setShowSetGoals] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Apple className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nutrition Dashboard</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Track meals, analyze macros, and maintain your dietary goals</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Select value={dateFilter} onValueChange={onDateFilterChange}>
            <SelectTrigger className="w-28 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setShowSetGoals(true)}>
            <Target className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Set Goals</span>
          </Button>

          <Button size="sm" onClick={() => setShowAddMeal(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Log Meal</span>
          </Button>
        </div>
      </div>

      <AddMealModal open={showAddMeal} onOpenChange={setShowAddMeal} />
      <SetGoalsModal open={showSetGoals} onOpenChange={setShowSetGoals} onGoalsUpdated={onGoalsUpdated} />
    </>
  );
}
