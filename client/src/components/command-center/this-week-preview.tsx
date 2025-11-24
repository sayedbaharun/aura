import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  ventureId: string | null;
  projectId: string | null;
  focusDate: string | null;
  dueDate: string | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export default function ThisWeekPreview() {
  const today = format(new Date(), "yyyy-MM-dd");
  const sevenDaysFromNow = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", `focus_date_gte=${today}`, `focus_date_lte=${sevenDaysFromNow}`],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?focus_date_gte=${today}&focus_date_lte=${sevenDaysFromNow}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await res.json();
    },
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Group tasks by day
  const tasksByDay: Record<string, Task[]> = {};
  for (let i = 0; i < 7; i++) {
    const date = format(addDays(new Date(), i), "yyyy-MM-dd");
    tasksByDay[date] = tasks.filter(
      (task) =>
        (task.focusDate === date || task.dueDate === date) &&
        task.status !== "done" &&
        task.status !== "cancelled"
    );
  }

  const getVentureName = (ventureId: string | null) => {
    if (!ventureId) return null;
    const venture = ventures.find((v) => v.id === ventureId);
    return venture ? `${venture.icon || ""} ${venture.name}` : null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P0":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "P1":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "P2":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            This Week Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          This Week Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(tasksByDay).map(([date, dayTasks]) => {
            const isToday = date === today;
            const dayDate = new Date(date);
            const dayName = format(dayDate, "EEE");
            const dayNumber = format(dayDate, "MMM d");

            // Group by venture
            const tasksByVenture: Record<string, Task[]> = {};
            dayTasks.forEach((task) => {
              const ventureKey = task.ventureId || "no-venture";
              if (!tasksByVenture[ventureKey]) {
                tasksByVenture[ventureKey] = [];
              }
              tasksByVenture[ventureKey].push(task);
            });

            return (
              <div
                key={date}
                className={`p-3 rounded-lg border ${
                  isToday ? "bg-primary/5 border-primary/20" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {dayName}, {dayNumber}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                  </Badge>
                </div>

                {dayTasks.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {Object.entries(tasksByVenture).map(([ventureId, vTasks]) => {
                      const ventureName = getVentureName(ventureId !== "no-venture" ? ventureId : null);
                      const p0Count = vTasks.filter((t) => t.priority === "P0").length;
                      const p1Count = vTasks.filter((t) => t.priority === "P1").length;

                      return (
                        <div key={ventureId} className="text-xs">
                          <span className="text-muted-foreground">
                            {ventureName || "No Venture"}:
                          </span>{" "}
                          <span className="font-medium">{vTasks.length}</span>
                          {p0Count > 0 && (
                            <Badge className={`${getPriorityColor("P0")} ml-2`} variant="secondary">
                              {p0Count} P0
                            </Badge>
                          )}
                          {p1Count > 0 && (
                            <Badge className={`${getPriorityColor("P1")} ml-2`} variant="secondary">
                              {p1Count} P1
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
