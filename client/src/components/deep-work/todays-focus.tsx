import { useQuery } from "@tanstack/react-query";
import { format, isToday, differenceInDays, isPast, parseISO } from "date-fns";
import { Target, Clock, AlertTriangle, Flame, Calendar, CheckCircle2 } from "lucide-react";
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

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

/**
 * Tim Ferriss-inspired Today's Focus component
 * Shows: ONE THING, total scheduled hours, urgency indicators
 */
export default function TodaysFocus() {
  const { openTaskDetail } = useTaskDetailModal();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Fetch today's tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "today-focus", todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?focusDate=${todayStr}&status=next,in_progress`, {
        credentials: "include",
      });
      return await res.json();
    },
  });

  // Fetch ventures for context
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Calculate metrics
  const totalScheduledHours = tasks.reduce((sum, t) => sum + (t.estEffort || 0), 0);
  const completedTasks = tasks.filter(t => t.status === "done").length;

  // Find the ONE THING - highest priority task for today
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  const oneThing = sortedTasks.find(t => t.status !== "done");

  // Find tasks with approaching due dates (urgency)
  const urgentTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const daysUntilDue = differenceInDays(parseISO(task.dueDate), new Date());
    return daysUntilDue <= 2 && daysUntilDue >= 0;
  });

  // Find overdue tasks
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    return isPast(parseISO(task.dueDate)) && task.status !== "done";
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
          <span>Today's Deep Work Focus</span>
          <Badge variant="outline" className="ml-auto border-white/30 text-white/80">
            {format(new Date(), "EEEE, MMM d")}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Urgency Alerts */}
        {(overdueTasks.length > 0 || urgentTasks.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {overdueTasks.length > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
                <Flame className="h-3 w-3 mr-1" />
                {overdueTasks.length} overdue
              </Badge>
            )}
            {urgentTasks.length > 0 && (
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {urgentTasks.length} due soon
              </Badge>
            )}
          </div>
        )}

        {/* THE ONE THING */}
        {oneThing ? (
          <div
            className="p-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 cursor-pointer hover:border-amber-400/50 transition-colors"
            onClick={() => openTaskDetail(oneThing.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">The ONE Thing</span>
              <Badge className="bg-amber-500/30 text-amber-200 text-xs">
                {oneThing.priority}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg leading-tight mb-2">{oneThing.title}</h3>
            <div className="flex items-center gap-3 text-sm text-white/70">
              {getVenture(oneThing.ventureId) && (
                <span className="flex items-center gap-1">
                  <span>{getVenture(oneThing.ventureId)?.icon}</span>
                  {getVenture(oneThing.ventureId)?.name}
                </span>
              )}
              {oneThing.estEffort && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {oneThing.estEffort}h
                </span>
              )}
              {oneThing.dueDate && (() => {
                const dueDateInfo = getDueDateDisplay(oneThing.dueDate);
                return dueDateInfo ? (
                  <Badge className={cn("text-xs", dueDateInfo.color)}>
                    <Calendar className="h-3 w-3 mr-1" />
                    {dueDateInfo.text}
                  </Badge>
                ) : null;
              })()}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-white/60">No tasks scheduled for today</p>
            <p className="text-xs text-white/40 mt-1">Drag tasks from the queue to schedule them</p>
          </div>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-blue-400">{tasks.length}</div>
            <div className="text-xs text-white/60">Tasks Today</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-emerald-400">{totalScheduledHours.toFixed(1)}h</div>
            <div className="text-xs text-white/60">Scheduled</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-amber-400">
              {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
            </div>
            <div className="text-xs text-white/60">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        {tasks.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/60">
              <span>{completedTasks} of {tasks.length} tasks complete</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {Math.round((completedTasks / tasks.length) * 100)}%
              </span>
            </div>
            <Progress
              value={(completedTasks / tasks.length) * 100}
              className="h-2 bg-white/10"
              indicatorClassName="bg-gradient-to-r from-emerald-500 to-green-400"
            />
          </div>
        )}

        {/* Other High Priority Tasks for Today */}
        {sortedTasks.filter(t => t.id !== oneThing?.id && t.status !== "done").length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/50 uppercase tracking-wider">Also scheduled today</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sortedTasks
                .filter(t => t.id !== oneThing?.id && t.status !== "done")
                .slice(0, 4)
                .map(task => {
                  const dueDateInfo = task.dueDate ? getDueDateDisplay(task.dueDate) : null;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-sm"
                      onClick={() => openTaskDetail(task.id)}
                    >
                      <Badge className="bg-white/10 text-white/70 text-xs shrink-0">
                        {task.priority}
                      </Badge>
                      <span className="flex-1 truncate">{task.title}</span>
                      {task.estEffort && (
                        <span className="text-xs text-white/50">{task.estEffort}h</span>
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
      </CardContent>
    </Card>
  );
}
