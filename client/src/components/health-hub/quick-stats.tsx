import { Moon, Zap, Dumbbell, Footprints, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HealthEntry {
  id: string;
  date: string;
  sleepHours: number | null;
  energyLevel: number | null;
  workoutDone: boolean;
  steps: number | null;
  weightKg: number | null;
}

interface QuickStatsProps {
  healthEntries: HealthEntry[];
}

interface Stat {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
  colorClass: string;
}

export default function QuickStats({ healthEntries }: QuickStatsProps) {
  // Ensure healthEntries is an array
  const entries = Array.isArray(healthEntries) ? healthEntries : [];

  // Calculate stats
  const entriesWithSleep = entries.filter((e) => e.sleepHours !== null);
  const avgSleep = entriesWithSleep.length > 0
    ? (entriesWithSleep.reduce((sum, e) => sum + (e.sleepHours || 0), 0) / entriesWithSleep.length).toFixed(1)
    : "—";

  const entriesWithEnergy = entries.filter((e) => e.energyLevel !== null);
  const avgEnergy = entriesWithEnergy.length > 0
    ? (entriesWithEnergy.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / entriesWithEnergy.length).toFixed(1)
    : "—";

  const workoutDays = entries.filter((e) => e.workoutDone).length;
  const workoutFrequency = entries.length > 0
    ? Math.round((workoutDays / entries.length) * 100)
    : 0;

  const entriesWithSteps = entries.filter((e) => e.steps !== null);
  const totalSteps = entriesWithSteps.reduce((sum, e) => sum + (e.steps || 0), 0);
  const avgSteps = entriesWithSteps.length > 0
    ? Math.round(totalSteps / entriesWithSteps.length)
    : 0;

  const entriesWithWeight = entries.filter((e) => e.weightKg !== null);
  const weightTrend = entriesWithWeight.length >= 2
    ? entriesWithWeight[entriesWithWeight.length - 1].weightKg! - entriesWithWeight[0].weightKg!
    : 0;
  const latestWeight = entriesWithWeight.length > 0
    ? entriesWithWeight[entriesWithWeight.length - 1].weightKg!.toFixed(1)
    : "—";

  const stats: Stat[] = [
    {
      icon: <Moon className="h-5 w-5" />,
      label: "Average Sleep",
      value: avgSleep !== "—" ? `${avgSleep} hrs` : "—",
      trend: avgSleep !== "—" && parseFloat(avgSleep) >= 7 ? "up" : avgSleep !== "—" ? "down" : "neutral",
      colorClass: avgSleep !== "—" && parseFloat(avgSleep) >= 7 ? "text-emerald-600" : avgSleep !== "—" ? "text-amber-600" : "text-muted-foreground",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      label: "Average Energy",
      value: avgEnergy !== "—" ? `${avgEnergy}/5` : "—",
      trend: avgEnergy !== "—" && parseFloat(avgEnergy) >= 4 ? "up" : avgEnergy !== "—" && parseFloat(avgEnergy) >= 3 ? "neutral" : avgEnergy !== "—" ? "down" : "neutral",
      colorClass: avgEnergy !== "—" && parseFloat(avgEnergy) >= 4 ? "text-emerald-600" : avgEnergy !== "—" && parseFloat(avgEnergy) >= 3 ? "text-amber-600" : avgEnergy !== "—" ? "text-rose-600" : "text-muted-foreground",
    },
    {
      icon: <Dumbbell className="h-5 w-5" />,
      label: "Workout Frequency",
      value: `${workoutDays} days (${workoutFrequency}%)`,
      trend: workoutFrequency >= 70 ? "up" : workoutFrequency >= 40 ? "neutral" : "down",
      colorClass: workoutFrequency >= 70 ? "text-emerald-600" : workoutFrequency >= 40 ? "text-amber-600" : "text-rose-600",
    },
    {
      icon: <Footprints className="h-5 w-5" />,
      label: "Average Steps",
      value: avgSteps > 0 ? avgSteps.toLocaleString() : "—",
      trend: avgSteps >= 10000 ? "up" : avgSteps >= 7000 ? "neutral" : avgSteps > 0 ? "down" : "neutral",
      colorClass: avgSteps >= 10000 ? "text-emerald-600" : avgSteps >= 7000 ? "text-amber-600" : avgSteps > 0 ? "text-rose-600" : "text-muted-foreground",
    },
    {
      icon: <Scale className="h-5 w-5" />,
      label: "Weight",
      value: latestWeight !== "—" ? `${latestWeight} kg` : "—",
      trend: weightTrend < -0.5 ? "down" : weightTrend > 0.5 ? "up" : "neutral",
      colorClass: "text-muted-foreground",
    },
  ];

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-rose-600" />;
      default:
        return <Minus className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center justify-center", stat.colorClass)}>
                {stat.icon}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className={cn("text-lg font-bold", stat.colorClass)}>
                  {stat.value}
                </div>
              </div>
            </div>
            <div>{getTrendIcon(stat.trend)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
