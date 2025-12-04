import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, parseISO, format } from "date-fns";
import { Calendar, Filter, AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

interface NeedsSchedulingQueueProps {
  onScheduleTask: (taskId: string) => void;
}

/**
 * "Needs Scheduling" Queue - Tim Ferriss style
 * Shows tasks with dueDate but NO focusDate - committed but not planned
 * These are "ticking bombs" that need time blocked
 */
export default function DeepWorkQueue({ onScheduleTask }: NeedsSchedulingQueueProps) {
  const [filterVenture, setFilterVenture] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"urgency" | "priority">("urgency");

  // Fetch ALL tasks, then filter for those with dueDate but no focusDate
  const { data: allTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?status=next,in_progress", {
        credentials: "include",
      });
      return await res.json();
    },
  });

  // Filter: has dueDate but NO focusDate (committed but not scheduled)
  const needsSchedulingTasks = allTasks.filter(
    (task) => task.dueDate && !task.focusDate
  );

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Get days until due for sorting
  const getDaysUntilDue = (dueDate: string | null): number => {
    if (!dueDate) return 999;
    return differenceInDays(parseISO(dueDate), new Date());
  };

  // Filter and sort tasks
  const filteredTasks = needsSchedulingTasks
    .filter((task) => {
      if (filterVenture === "all") return true;
      return task.ventureId === filterVenture;
    })
    .sort((a, b) => {
      if (sortBy === "urgency") {
        // Sort by due date (most urgent first)
        return getDaysUntilDue(a.dueDate) - getDaysUntilDue(b.dueDate);
      } else {
        // Sort by priority
        const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return (
          priorityOrder[a.priority || "P3"] -
          priorityOrder[b.priority || "P3"]
        );
      }
    });

  // Count urgent items (due within 3 days or overdue)
  const urgentCount = filteredTasks.filter((task) => {
    const days = getDaysUntilDue(task.dueDate);
    return days <= 3;
  }).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P0":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "P1":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "P2":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "P3":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getVentureInfo = (ventureId: string | null) => {
    if (!ventureId) return null;
    return ventures.find((v) => v.id === ventureId);
  };

  // Get due date urgency display
  const getDueDateUrgency = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    const daysUntil = differenceInDays(date, new Date());

    if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}d overdue`, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", urgent: true };
    if (daysUntil === 0) return { text: "Due today", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", urgent: true };
    if (daysUntil === 1) return { text: "Due tomorrow", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", urgent: true };
    if (daysUntil <= 3) return { text: `Due in ${daysUntil}d`, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", urgent: true };
    if (daysUntil <= 7) return { text: `Due in ${daysUntil}d`, color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", urgent: false };
    return { text: format(date, "MMM d"), color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", urgent: false };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Needs Scheduling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Needs Scheduling</span>
          </div>
          <Badge variant={urgentCount > 0 ? "destructive" : "secondary"}>
            {filteredTasks.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tasks with due dates but no focus date set
        </p>
        {urgentCount > 0 && (
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            {urgentCount} urgent (due within 3 days)
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-2">
          <Select value={filterVenture} onValueChange={setFilterVenture}>
            <SelectTrigger className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by venture" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ventures</SelectItem>
              {ventures.map((venture) => (
                <SelectItem key={venture.id} value={venture.id}>
                  {venture.icon} {venture.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as "urgency" | "priority")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgency">Sort by Urgency (Due Date)</SelectItem>
              <SelectItem value="priority">Sort by Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">All clear!</p>
              <p className="text-xs mt-1">Every task with a due date has been scheduled</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const venture = getVentureInfo(task.ventureId);
              const dueDateInfo = getDueDateUrgency(task.dueDate);
              return (
                <div
                  key={task.id}
                  className={cn(
                    "p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
                    dueDateInfo?.urgent && "ring-1 ring-orange-400/50 bg-orange-50/50 dark:bg-orange-950/20"
                  )}
                  style={{
                    borderLeftColor: venture?.color || "#6b7280",
                    borderLeftWidth: "3px",
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge
                        className={cn("shrink-0", getPriorityColor(task.priority))}
                        variant="secondary"
                      >
                        {task.priority}
                      </Badge>
                      <h4 className="text-sm font-medium flex-1 leading-tight">
                        {task.title}
                      </h4>
                      {dueDateInfo?.urgent && (
                        <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                      )}
                    </div>

                    {/* Due Date Badge */}
                    {dueDateInfo && (
                      <div className="flex items-center gap-1">
                        <Badge className={cn("text-xs", dueDateInfo.color)}>
                          <Clock className="h-3 w-3 mr-1" />
                          {dueDateInfo.text}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {venture && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{venture.icon}</span>
                          <span className="truncate">{venture.name}</span>
                        </div>
                      )}
                      {task.estEffort && (
                        <div className="text-xs text-muted-foreground">
                          {task.estEffort}h
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={dueDateInfo?.urgent ? "default" : "outline"}
                      className={cn(
                        "w-full",
                        dueDateInfo?.urgent && "bg-orange-600 hover:bg-orange-700"
                      )}
                      onClick={() => onScheduleTask(task.id)}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {dueDateInfo?.urgent ? "Schedule Now" : "Schedule"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
