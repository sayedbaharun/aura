import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Filter } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  ventureId: string | null;
  estEffort: number | null;
  focusDate: string | null;
  focusSlot: string | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface DeepWorkQueueProps {
  onScheduleTask: (taskId: string) => void;
}

export default function DeepWorkQueue({ onScheduleTask }: DeepWorkQueueProps) {
  const [filterVenture, setFilterVenture] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "effort">("priority");

  // Fetch unscheduled deep work tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "deep-work", "unscheduled"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/tasks?type=deep_work&status=next,in_progress`
      );
      const allTasks = await res.json();
      // Filter out tasks that already have focus_date
      return allTasks.filter((task: Task) => !task.focusDate);
    },
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      if (filterVenture === "all") return true;
      return task.ventureId === filterVenture;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return (
          priorityOrder[a.priority || "P3"] -
          priorityOrder[b.priority || "P3"]
        );
      } else {
        return (b.estEffort || 0) - (a.estEffort || 0);
      }
    });

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deep Work Queue</CardTitle>
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
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Deep Work Queue</span>
          <Badge variant="secondary">{filteredTasks.length}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Unscheduled deep work tasks
        </p>
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
            onValueChange={(value) => setSortBy(value as "priority" | "effort")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Sort by Priority</SelectItem>
              <SelectItem value="effort">Sort by Effort</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No unscheduled deep work tasks</p>
              <p className="text-xs mt-1">All tasks are scheduled!</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const venture = getVentureInfo(task.ventureId);
              return (
                <div
                  key={task.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
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
                    </div>

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
                      variant="outline"
                      className="w-full"
                      onClick={() => onScheduleTask(task.id)}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Schedule
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
