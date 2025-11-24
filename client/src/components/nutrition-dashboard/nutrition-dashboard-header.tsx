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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Apple className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Nutrition Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Track meals, analyze macros, and maintain your dietary goals</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={onDateFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setShowSetGoals(true)}>
            <Target className="h-4 w-4 mr-2" />
            Set Goals
          </Button>

          <Button onClick={() => setShowAddMeal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Meal
          </Button>
        </div>
      </div>

      <AddMealModal open={showAddMeal} onOpenChange={setShowAddMeal} />
      <SetGoalsModal open={showSetGoals} onOpenChange={setShowSetGoals} onGoalsUpdated={onGoalsUpdated} />
    </>
  );
}
