import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

interface HealthEntry {
  id: string;
  date: string;
  sleepHours: number | null;
  energyLevel: number | null;
  workoutDone: boolean;
  steps: number | null;
}

interface PerformanceInsightsProps {
  healthEntries: HealthEntry[];
}

export default function PerformanceInsights({ healthEntries }: PerformanceInsightsProps) {
  // Prepare data for charts - sort by date
  const sortedEntries = [...healthEntries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Energy level over time
  const energyData = sortedEntries
    .filter((e) => e.energyLevel !== null)
    .map((e) => ({
      date: format(parseISO(e.date), "MMM d"),
      energy: e.energyLevel,
    }));

  // Sleep hours over time
  const sleepData = sortedEntries
    .filter((e) => e.sleepHours !== null)
    .map((e) => ({
      date: format(parseISO(e.date), "MMM d"),
      sleep: e.sleepHours,
    }));

  // Calculate insights
  const workoutDays = sortedEntries.filter((e) => e.workoutDone);
  const nonWorkoutDays = sortedEntries.filter((e) => !e.workoutDone);

  const avgEnergyWorkout = workoutDays.length > 0
    ? (workoutDays.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / workoutDays.length).toFixed(1)
    : "0";

  const avgEnergyNoWorkout = nonWorkoutDays.length > 0
    ? (nonWorkoutDays.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / nonWorkoutDays.length).toFixed(1)
    : "0";

  const goodSleepDays = sortedEntries.filter((e) => e.sleepHours && e.sleepHours >= 7);
  const poorSleepDays = sortedEntries.filter((e) => e.sleepHours && e.sleepHours < 7);

  const avgEnergyGoodSleep = goodSleepDays.length > 0
    ? (goodSleepDays.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / goodSleepDays.length).toFixed(1)
    : "0";

  const avgEnergyPoorSleep = poorSleepDays.length > 0
    ? (poorSleepDays.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / poorSleepDays.length).toFixed(1)
    : "0";

  const sleepImpact = goodSleepDays.length > 0 && poorSleepDays.length > 0
    ? Math.round(((parseFloat(avgEnergyGoodSleep) - parseFloat(avgEnergyPoorSleep)) / parseFloat(avgEnergyPoorSleep)) * 100)
    : 0;

  // High energy days (4+)
  const highEnergyDays = sortedEntries.filter((e) => e.energyLevel && e.energyLevel >= 4);
  const highEnergyWorkouts = highEnergyDays.filter((e) => e.workoutDone).length;
  const highEnergyWorkoutRate = highEnergyDays.length > 0
    ? Math.round((highEnergyWorkouts / highEnergyDays.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Energy Level Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Energy Level Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {energyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[1, 5]} className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="energy" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No energy data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sleep Hours Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sleep Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          {sleepData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sleepData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="sleep" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No sleep data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workout Impact */}
          {workoutDays.length > 0 && nonWorkoutDays.length > 0 && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                Workout Impact on Energy
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Your average energy on workout days is <strong>{avgEnergyWorkout}/5</strong> compared to{" "}
                <strong>{avgEnergyNoWorkout}/5</strong> on non-workout days.
                {parseFloat(avgEnergyWorkout) > parseFloat(avgEnergyNoWorkout) && (
                  <> That's a {((parseFloat(avgEnergyWorkout) - parseFloat(avgEnergyNoWorkout)) / parseFloat(avgEnergyNoWorkout) * 100).toFixed(0)}% boost!</>
                )}
              </p>
            </div>
          )}

          {/* Sleep Impact */}
          {goodSleepDays.length > 0 && poorSleepDays.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Sleep Quality Effect
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                With 7+ hours of sleep, your energy averages <strong>{avgEnergyGoodSleep}/5</strong>.
                With less than 7 hours, it drops to <strong>{avgEnergyPoorSleep}/5</strong>.
                {sleepImpact > 0 && (
                  <> You have <strong>{sleepImpact}% higher energy</strong> with adequate sleep.</>
                )}
              </p>
            </div>
          )}

          {/* High Energy Days */}
          {highEnergyDays.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                High Energy Days Pattern
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You had <strong>{highEnergyDays.length} high-energy days</strong> (4+ energy level).
                On <strong>{highEnergyWorkoutRate}%</strong> of those days, you completed a workout.
                {highEnergyWorkoutRate > 50 && (
                  <> Exercise seems to be a key factor in your best days!</>
                )}
              </p>
            </div>
          )}

          {/* No data state */}
          {sortedEntries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Log more health data to see insights and correlations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
