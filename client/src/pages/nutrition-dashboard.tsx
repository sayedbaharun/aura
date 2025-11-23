import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Apple, UtensilsCrossed, TrendingUp, Target } from "lucide-react";

export default function NutritionDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Apple className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Nutrition Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Track meals, analyze macros, and maintain your dietary goals
          </p>
        </div>
        <Badge variant="secondary">Phase 4</Badge>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 4</CardTitle>
          <CardDescription>
            Advanced nutrition tracking features are currently in development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 py-6">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Meal Logging</h3>
                <p className="text-sm text-muted-foreground">
                  Quick meal entry with photo recognition and database search
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Macro Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Track protein, carbs, fats, and calories with visual charts
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Nutrition Goals</h3>
                <p className="text-sm text-muted-foreground">
                  Set daily targets and track progress towards your goals
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Apple className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Food Database</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive database with nutritional information
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          This module will be available soon. Check back in Phase 4!
        </p>
      </div>
    </div>
  );
}
