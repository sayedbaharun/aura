import { useQuery } from "@tanstack/react-query";
import { format, addDays, isSameDay } from "date-fns";
import { CalendarDays, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  focusDate: string | null;
  dueDate: string | null;
}

interface Day {
  date: string;
  oneThingToShip: string | null;
}

export default function ThisWeekPreview() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const sevenDaysFromNow = format(addDays(today, 6), "yyyy-MM-dd");

  // Fetch tasks for the week
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "week-preview"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?focus_date_gte=${todayStr}&focus_date_lte=${sevenDaysFromNow}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch days for the week (for oneThingToShip)
  const { data: days = [] } = useQuery<Day[]>({
    queryKey: ["/api/days", "week-preview"],
    queryFn: async () => {
      const res = await fetch(`/api/days?date_gte=${todayStr}&date_lte=${sevenDaysFromNow}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Build week data
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayData = days.find(d => d.date === dateStr);

    const dayTasks = tasks.filter(
      t => (t.focusDate === dateStr || t.dueDate === dateStr) &&
           t.status !== "completed" && t.status !== "on_hold"
    );
    const doneTasks = tasks.filter(
      t => (t.focusDate === dateStr || t.dueDate === dateStr) &&
           t.status === "completed"
    );

    const isToday = isSameDay(date, today);
    const hasP0 = dayTasks.some(t => t.priority === "P0");
    const hasDeadline = dayTasks.some(t => t.dueDate === dateStr);
    const isHeavy = dayTasks.length >= 6;
    const totalTasks = dayTasks.length + doneTasks.length;
    const completedPercent = totalTasks > 0 ? (doneTasks.length / totalTasks) * 100 : 0;

    return {
      date,
      dateStr,
      dayName: format(date, "EEE"),
      dayNumber: format(date, "d"),
      taskCount: dayTasks.length,
      completedCount: doneTasks.length,
      completedPercent,
      isToday,
      hasP0,
      hasDeadline,
      isHeavy,
      oneThingToShip: dayData?.oneThingToShip,
    };
  });

  // Find upcoming deadlines/important items
  const upcomingDeadlines = tasks
    .filter(t => t.dueDate && t.dueDate > todayStr && t.status !== "completed")
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Horizontal scrollable days */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                "flex-shrink-0 w-16 p-2 rounded-lg border text-center transition-all",
                day.isToday
                  ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                  : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
              )}
            >
              <div className="text-xs text-muted-foreground font-medium">
                {day.dayName}
              </div>
              <div className={cn(
                "text-lg font-bold",
                day.isToday && "text-primary"
              )}>
                {day.dayNumber}
              </div>

              {/* Task count or status */}
              {day.taskCount > 0 ? (
                <div className="mt-1">
                  <span className={cn(
                    "text-xs font-medium",
                    day.hasP0 ? "text-red-500" : day.isHeavy ? "text-orange-500" : "text-muted-foreground"
                  )}>
                    {day.taskCount}
                  </span>
                  {(day.hasP0 || day.hasDeadline) && (
                    <AlertTriangle className="inline h-3 w-3 ml-0.5 text-orange-500" />
                  )}
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground/50">—</div>
              )}

              {/* Progress bar for today */}
              {day.isToday && day.taskCount + day.completedCount > 0 && (
                <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${day.completedPercent}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Today's focus */}
        {weekDays[0]?.oneThingToShip && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="text-xs text-muted-foreground mb-1">Today's Ship</div>
            <div className="text-sm font-medium">{weekDays[0].oneThingToShip}</div>
          </div>
        )}

        {/* Upcoming deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Upcoming</div>
            {upcomingDeadlines.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  task.priority === "P0" ? "bg-red-500" :
                  task.priority === "P1" ? "bg-orange-500" : "bg-muted-foreground"
                )} />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(task.dueDate!), "EEE")}
                </span>
                <span className="truncate">{task.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Week looks clear</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
