import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Rocket, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Task, Day, Venture } from "@shared/schema";

interface DayReviewSummaryProps {
  day: Day | null;
}

export default function DayReviewSummary({ day }: DayReviewSummaryProps) {
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const taskList = Array.isArray(tasks) ? tasks : [];
  const completedTasks = taskList.filter((t) => t.status === "completed");
  const totalTasks = taskList.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  const primaryVenture = Array.isArray(ventures)
    ? ventures.find((v) => v.id === day?.primaryVentureFocus)
    : null;

  const oneThingShipped = day?.oneThingToShip
    ? taskList.some(
        (t) =>
          t.status === "completed" &&
          t.title.toLowerCase().includes(day.oneThingToShip?.toLowerCase().slice(0, 20) || "")
      )
    : false;

  // Calculate hours worked (sum of actual effort)
  const hoursWorked = completedTasks.reduce((sum, t) => sum + (t.actualEffort || t.estEffort || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4" />
          Day Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted stroke-current"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={cn(
                  "stroke-current transition-all duration-500",
                  completionRate >= 80 ? "text-green-500" : completionRate >= 50 ? "text-yellow-500" : "text-blue-500"
                )}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${completionRate}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{Math.round(completionRate)}%</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Tasks Completed</span>
              <span className="text-sm text-muted-foreground">
                {completedTasks.length}/{totalTasks}
              </span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
        </div>

        {/* One Thing to Ship Status */}
        {day?.oneThingToShip && (
          <div
            className={cn(
              "p-3 rounded-lg flex items-center gap-3",
              oneThingShipped
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-muted/50"
            )}
          >
            {oneThingShipped ? (
              <Rocket className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">One Thing to Ship</div>
              <div className={cn("font-medium", oneThingShipped && "text-green-600 dark:text-green-400")}>
                {day.oneThingToShip}
              </div>
            </div>
            {oneThingShipped && (
              <span className="text-xs font-bold text-green-500 bg-green-500/20 px-2 py-1 rounded">
                SHIPPED!
              </span>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Hours Worked</span>
            </div>
            <span className="text-lg font-bold">{hoursWorked.toFixed(1)}h</span>
          </div>
          {primaryVenture && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Focus Venture</div>
              <div className="flex items-center gap-2">
                {primaryVenture.icon && <span>{primaryVenture.icon}</span>}
                <span className="font-medium truncate">{primaryVenture.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Priority Tasks Summary */}
        <div className="text-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span>High Priority (P0/P1)</span>
            <span>
              {taskList.filter((t) => (t.priority === "P0" || t.priority === "P1") && t.status === "completed").length}/
              {taskList.filter((t) => t.priority === "P0" || t.priority === "P1").length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
