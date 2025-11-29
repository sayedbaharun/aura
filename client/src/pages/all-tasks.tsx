import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CheckSquare,
  Filter,
  X,
  Calendar,
  Building2,
  Flag,
  Clock,
  MoreHorizontal,
  Circle,
  CheckCircle2,
  Pause,
  Hourglass,
  Trash2,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTaskDetailModal } from "@/lib/task-detail-modal-store";
import { cn } from "@/lib/utils";
import type { Task, Venture } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "idea", label: "Idea", icon: Lightbulb },
  { value: "next", label: "Next", icon: Circle },
  { value: "in_progress", label: "In Progress", icon: Hourglass },
  { value: "waiting", label: "Waiting", icon: Pause },
  { value: "done", label: "Done", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "P0", label: "P0 - Critical", color: "bg-red-500" },
  { value: "P1", label: "P1 - High", color: "bg-orange-500" },
  { value: "P2", label: "P2 - Medium", color: "bg-yellow-500" },
  { value: "P3", label: "P3 - Low", color: "bg-green-500" },
];

const getStatusIcon = (status: string) => {
  const statusOption = STATUS_OPTIONS.find((opt) => opt.value === status);
  if (statusOption?.icon) {
    const Icon = statusOption.icon;
    return <Icon className="h-4 w-4" />;
  }
  return <Circle className="h-4 w-4" />;
};

const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case "P0":
      return "bg-red-500 text-white";
    case "P1":
      return "bg-orange-500 text-white";
    case "P2":
      return "bg-yellow-500 text-white";
    case "P3":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-200 text-gray-700";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "done":
      return "text-green-600";
    case "in_progress":
      return "text-blue-600";
    case "next":
      return "text-purple-600";
    case "waiting":
      return "text-yellow-600";
    case "cancelled":
      return "text-gray-400";
    default:
      return "text-gray-500";
  }
};

export default function AllTasks() {
  const { toast } = useToast();
  const { openModal } = useTaskDetailModal();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ventureFilter, setVentureFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [focusDateFilter, setFocusDateFilter] = useState<Date | undefined>(
    undefined
  );
  const [showFilters, setShowFilters] = useState(false);

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch ventures for filter dropdown
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Task>;
    }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }

    // Venture filter
    if (ventureFilter !== "all" && task.ventureId !== ventureFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      return false;
    }

    // Focus date filter
    if (focusDateFilter) {
      const filterDate = format(focusDateFilter, "yyyy-MM-dd");
      if (task.focusDate !== filterDate) {
        return false;
      }
    }

    return true;
  });

  // Get venture name helper
  const getVentureName = (ventureId: string | null) => {
    if (!ventureId) return null;
    const venture = ventures.find((v) => v.id === ventureId);
    return venture?.name || null;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setVentureFilter("all");
    setPriorityFilter("all");
    setFocusDateFilter(undefined);
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    ventureFilter !== "all" ||
    priorityFilter !== "all" ||
    focusDateFilter;

  const handleToggleStatus = (task: Task) => {
    const newStatus = task.status === "done" ? "next" : "done";
    updateTaskMutation.mutate({
      taskId: task.id,
      updates: {
        status: newStatus,
        completedAt: newStatus === "done" ? new Date() : null,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">All Tasks</h1>
            <Badge variant="secondary" className="ml-2">
              {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Search
                  </label>
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Venture Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Venture
                  </label>
                  <Select
                    value={ventureFilter}
                    onValueChange={setVentureFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select venture" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ventures</SelectItem>
                      {ventures.map((venture) => (
                        <SelectItem key={venture.id} value={venture.id}>
                          {venture.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Focus Date Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Focus Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !focusDateFilter && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {focusDateFilter
                          ? format(focusDateFilter, "MMM d, yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={focusDateFilter}
                        onSelect={setFocusDateFilter}
                        initialFocus
                      />
                      {focusDateFilter && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setFocusDateFilter(undefined)}
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {hasActiveFilters
                  ? "No tasks match your filters"
                  : "No tasks yet"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                      task.status === "done" && "opacity-60"
                    )}
                    onClick={() => openModal(task.id)}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(task);
                      }}
                    >
                      <Checkbox
                        checked={task.status === "done"}
                        className="h-5 w-5"
                      />
                    </div>

                    {/* Status Icon */}
                    <span className={getStatusColor(task.status)}>
                      {getStatusIcon(task.status)}
                    </span>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-medium truncate",
                          task.status === "done" && "line-through"
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {/* Venture */}
                        {task.ventureId && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {getVentureName(task.ventureId)}
                          </span>
                        )}
                        {/* Focus Date */}
                        {task.focusDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(task.focusDate), "MMM d")}
                          </span>
                        )}
                        {/* Estimated Effort */}
                        {task.estEffort && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estEffort}h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Priority Badge */}
                    {task.priority && (
                      <Badge
                        className={cn(
                          "text-xs shrink-0",
                          getPriorityColor(task.priority)
                        )}
                      >
                        {task.priority}
                      </Badge>
                    )}

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(task.id);
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              updates: { status: "next" },
                            });
                          }}
                        >
                          Mark as Next
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              updates: { status: "in_progress" },
                            });
                          }}
                        >
                          Mark In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              updates: {
                                status: "done",
                                completedAt: new Date(),
                              },
                            });
                          }}
                        >
                          Mark Done
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "Are you sure you want to delete this task?"
                              )
                            ) {
                              deleteTaskMutation.mutate(task.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
