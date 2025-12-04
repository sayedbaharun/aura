import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, isPast, parseISO, isToday } from "date-fns";
import { Target, Clock, AlertTriangle, Flame, Calendar, CheckCircle2, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTaskDetailModal } from "@/lib/task-detail-modal-store";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  ventureId: string | null;
  estEffort: number | null;
  focusDate: string | null;
  dueDate: string | null;
  focusSlot: string | null;
}

interface Day {
  id: string;
  date: string;
  title: string | null;
  oneThingToShip: string | null;
  top3Outcomes: Array<{ text: string; completed: boolean }> | null;
  mood: string | null;
  primaryVentureFocus: string | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

/**
 * Today's Focus component - aligned with Day record
 * Shows: oneThingToShip from Day, tasks with focusDate=today OR dueDate=today
 */
export default function TodaysFocus() {
  const { openTaskDetail } = useTaskDetailModal();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Fetch today's Day record - this has oneThingToShip
  const { data: dayRecord, isLoading: dayLoading } = useQuery<Day>({
    queryKey: ["/api/days/today"],
    queryFn: async () => {
      const res = await fetch("/api/days/today", { credentials: "include" });
      if (!res.ok) return null;
      return await res.json();
    },
  });

  // Fetch ALL tasks, then filter client-side for focusDate=today OR dueDate=today
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?status=next,in_progress,done", { credentials: "include" });
      return await res.json();
    },
  });

  // Filter tasks: focusDate = today OR dueDate = today
  const todaysTasks = allTasks.filter(task => {
    const hasFocusToday = task.focusDate === todayStr;
    const hasDueToday = task.dueDate && isToday(parseISO(task.dueDate));
    const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== "done";
    return hasFocusToday || hasDueToday || isOverdue;
  });

  // Fetch ventures for context
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const isLoading = dayLoading || tasksLoading;

  // Calculate metrics
  const activeTasks = todaysTasks.filter(t => t.status !== "done");
  const completedTasks = todaysTasks.filter(t => t.status === "done");
  const totalScheduledHours = todaysTasks.reduce((sum, t) => sum + (t.estEffort || 0), 0);

  // Sort by priority for display
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Find overdue tasks (past due date, not done)
  const overdueTasks = allTasks.filter(task => {
    if (!task.dueDate || task.status === "done") return false;
    return isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
  });

  // Find tasks due today
  const dueTodayTasks = todaysTasks.filter(task => {
    if (!task.dueDate) return false;
    return isToday(parseISO(task.dueDate)) && task.status !== "done";
  });

  const getVenture = (ventureId: string | null) => {
    if (!ventureId) return null;
    return ventures.find(v => v.id === ventureId);
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    const daysUntil = differenceInDays(date, new Date());

    if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}d overdue`, color: "text-red-600 bg-red-100 dark:bg-red-900/30" };
    if (daysUntil === 0) return { text: "Due today", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" };
    if (daysUntil === 1) return { text: "Due tomorrow", color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" };
    if (daysUntil <= 3) return { text: `Due in ${daysUntil}d`, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" };
    return { text: format(date, "MMM d"), color: "text-muted-foreground bg-muted" };
  };

  const getFocusDateDisplay = (focusDate: string | null) => {
    if (!focusDate) return null;
    if (focusDate === todayStr) return { text: "Focus: Today", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" };
    return null;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="h-32 animate-pulse bg-white/10 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-amber-400" />
          <span>Today's Focus</span>
          <Badge variant="outline" className="ml-auto border-white/30 text-white/80">
            {format(new Date(), "EEEE, MMM d")}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Urgency Alerts */}
        {(overdueTasks.length > 0 || dueTodayTasks.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {overdueTasks.length > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
                <Flame className="h-3 w-3 mr-1" />
                {overdueTasks.length} overdue
              </Badge>
            )}
            {dueTodayTasks.length > 0 && (
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {dueTodayTasks.length} due today
              </Badge>
            )}
          </div>
        )}

        {/* THE ONE THING TO SHIP - from Day record */}
        {dayRecord?.oneThingToShip ? (
          <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">One Thing to Ship</span>
            </div>
            <h3 className="font-semibold text-lg leading-tight">{dayRecord.oneThingToShip}</h3>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-white/60">No "One Thing to Ship" set for today</p>
            <p className="text-xs text-white/40 mt-1">Set it in your morning ritual or day planning</p>
          </div>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-blue-400">{activeTasks.length}</div>
            <div className="text-xs text-white/60">Active Tasks</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-emerald-400">{totalScheduledHours.toFixed(1)}h</div>
            <div className="text-xs text-white/60">Scheduled</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-amber-400">
              {todaysTasks.length > 0 ? Math.round((completedTasks.length / todaysTasks.length) * 100) : 0}%
            </div>
            <div className="text-xs text-white/60">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        {todaysTasks.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/60">
              <span>{completedTasks.length} of {todaysTasks.length} tasks complete</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {Math.round((completedTasks.length / todaysTasks.length) * 100)}%
              </span>
            </div>
            <Progress
              value={(completedTasks.length / todaysTasks.length) * 100}
              className="h-2 bg-white/10"
              indicatorClassName="bg-gradient-to-r from-emerald-500 to-green-400"
            />
          </div>
        )}

        {/* Tasks for Today - focusDate=today OR dueDate=today */}
        {sortedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/50 uppercase tracking-wider">
              Tasks for Today
              <span className="ml-2 text-white/30">(focus date or due date)</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sortedTasks.map(task => {
                const dueDateInfo = task.dueDate ? getDueDateDisplay(task.dueDate) : null;
                const focusDateInfo = getFocusDateDisplay(task.focusDate);
                const venture = getVenture(task.ventureId);
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-sm",
                      dueDateInfo?.text.includes("overdue") && "ring-1 ring-red-500/50 bg-red-500/10",
                      dueDateInfo?.text === "Due today" && "ring-1 ring-orange-500/50 bg-orange-500/10"
                    )}
                    onClick={() => openTaskDetail(task.id)}
                  >
                    <Badge className="bg-white/10 text-white/70 text-xs shrink-0">
                      {task.priority}
                    </Badge>
                    <span className="flex-1 truncate">{task.title}</span>
                    {task.estEffort && (
                      <span className="text-xs text-white/50">{task.estEffort}h</span>
                    )}
                    {focusDateInfo && !dueDateInfo && (
                      <Badge className={cn("text-xs shrink-0", focusDateInfo.color)}>
                        {focusDateInfo.text}
                      </Badge>
                    )}
                    {dueDateInfo && (
                      <Badge className={cn("text-xs shrink-0", dueDateInfo.color)}>
                        {dueDateInfo.text}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No tasks message */}
        {sortedTasks.length === 0 && !dayRecord?.oneThingToShip && (
          <div className="text-center py-4 text-white/40 text-sm">
            No tasks with focus date or due date for today
          </div>
        )}
      </CardContent>
    </Card>
  );
}
