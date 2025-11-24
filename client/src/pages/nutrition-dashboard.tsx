import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth } from "date-fns";
import NutritionDashboardHeader from "@/components/nutrition-dashboard/nutrition-dashboard-header";
import TodaysMeals from "@/components/nutrition-dashboard/todays-meals";
import NutritionGoals from "@/components/nutrition-dashboard/nutrition-goals";
import WeeklySummary from "@/components/nutrition-dashboard/weekly-summary";
import MealHistory from "@/components/nutrition-dashboard/meal-history";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface NutritionEntry {
  id: string;
  dayId: string;
  datetime: string;
  mealType: string;
  description: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  context: string | null;
  tags: string[] | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function NutritionDashboard() {
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month">("today");
  const [goalsUpdateTrigger, setGoalsUpdateTrigger] = useState(0);

  // Fetch all nutrition entries
  const { data: allMeals = [], isLoading } = useQuery<NutritionEntry[]>({
    queryKey: ["/api/nutrition"],
  });

  // Filter meals based on date filter
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const filteredMeals = allMeals.filter((meal) => {
    const mealDate = format(new Date(meal.datetime), "yyyy-MM-dd");

    switch (dateFilter) {
      case "today":
        return mealDate === today;
      case "week":
        return mealDate >= weekAgo && mealDate <= today;
      case "month":
        return mealDate >= monthStart && mealDate <= today;
      default:
        return true;
    }
  });

  const todaysMeals = allMeals.filter((meal) => {
    const mealDate = format(new Date(meal.datetime), "yyyy-MM-dd");
    return mealDate === today;
  });

  const weekMeals = allMeals.filter((meal) => {
    const mealDate = format(new Date(meal.datetime), "yyyy-MM-dd");
    return mealDate >= weekAgo && mealDate <= today;
  });

  const todaysTotals = {
    calories: todaysMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
    protein: todaysMeals.reduce((sum, m) => sum + (m.proteinG || 0), 0),
    carbs: todaysMeals.reduce((sum, m) => sum + (m.carbsG || 0), 0),
    fats: todaysMeals.reduce((sum, m) => sum + (m.fatsG || 0), 0),
  };

  const handleGoalsUpdated = () => {
    setGoalsUpdateTrigger((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <NutritionDashboardHeader
        dateFilter={dateFilter}
        onDateFilterChange={(value) => setDateFilter(value as typeof dateFilter)}
        onGoalsUpdated={handleGoalsUpdated}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Meals - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <TodaysMeals meals={todaysMeals} key={goalsUpdateTrigger} />
        </div>

        {/* Nutrition Goals - Takes up 1 column */}
        <div>
          <NutritionGoals totals={todaysTotals} onGoalsUpdated={handleGoalsUpdated} key={goalsUpdateTrigger} />
        </div>
      </div>

      {/* Weekly Summary */}
      <WeeklySummary meals={weekMeals} />

      {/* Meal History */}
      <MealHistory meals={allMeals} />
    </div>
  );
}
