import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Moon, Dumbbell } from "lucide-react";

export default function HealthHub() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Health Hub</h1>
          </div>
          <p className="text-muted-foreground">
            Track your physical and mental wellness, workouts, and sleep
          </p>
        </div>
        <Badge variant="secondary">Phase 3</Badge>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 3</CardTitle>
          <CardDescription>
            Comprehensive health tracking features are currently in development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 py-6">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Workout Logging</h3>
                <p className="text-sm text-muted-foreground">
                  Track exercise sessions, sets, reps, and personal records
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Moon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Sleep Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor sleep quality, duration, and patterns for better rest
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Meditation & Mindfulness</h3>
                <p className="text-sm text-muted-foreground">
                  Log meditation sessions and track mental wellness habits
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Health Metrics</h3>
                <p className="text-sm text-muted-foreground">
                  Track vitals, body composition, and overall health scores
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          This module will be available soon. Check back in Phase 3!
        </p>
      </div>
    </div>
  );
}
