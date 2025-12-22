import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CheckSquare,
  X,
  Calendar,
  CalendarDays,
  Building2,
  Clock,
  MoreHorizontal,
  Circle,
  CheckCircle2,
  Pause,
  Hourglass,
  Trash2,
  Lightbulb,
  XCircle,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  FolderKanban,
  Layers,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTaskDetailModal } from "@/lib/task-detail-modal-store";
import { cn } from "@/lib/utils";
import CreateTaskModal from "@/components/create-task-modal";
import type { Task, Venture, Project, Phase } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "todo", label: "To Do", icon: Circle },
  { value: "in_progress", label: "In Progress", icon: Hourglass },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "on_hold", label: "On Hold", icon: Pause },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "P0", label: "P0 - Critical", color: "bg-red-500" },
  { value: "P1", label: "P1 - High", color: "bg-orange-500" },
  { value: "P2", label: "P2 - Medium", color: "bg-yellow-500" },
  { value: "P3", label: "P3 - Low", color: "bg-green-500" },
];

type SortField = "title" | "venture" | "project" | "phase" | "focusDate" | "dueDate" | "effort" | "priority" | "status";
type SortDirection = "asc" | "desc";

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
    case "completed":
      return "text-green-600";
    case "in_progress":
      return "text-blue-600";
    case "todo":
      return "text-gray-600";
    case "on_hold":
      return "text-yellow-600";
    default:
      return "text-gray-500";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" };
    case "in_progress":
      return { label: "In Progress", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    case "todo":
      return { label: "To Do", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    case "on_hold":
      return { label: "On Hold", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    default:
      return { label: status, className: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
  }
};

const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const statusOrder: Record<string, number> = {
  in_progress: 0,
  todo: 1,
  on_hold: 2,
  completed: 3,
};

export default function AllTasks() {
  const { toast } = useToast();
  const { openTaskDetail } = useTaskDetailModal();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ventureFilter, setVentureFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [focusDateFilter, setFocusDateFilter] = useState<Date | undefined>(undefined);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Selection state for bulk operations
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Sort state
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Fetch ventures for filter dropdown
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch phases for filter dropdown
  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: ["/api/phases"],
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

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      // Delete tasks sequentially to avoid overwhelming the server
      for (const taskId of taskIds) {
        await apiRequest("DELETE", `/api/tasks/${taskId}`);
      }
    },
    onSuccess: (_, taskIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTasks(new Set());
      toast({ title: `${taskIds.length} task${taskIds.length > 1 ? "s" : ""} deleted` });
    },
    onError: () => {
      toast({ title: "Failed to delete some tasks", variant: "destructive" });
    },
  });

  // Push tasks to TickTick mutation
  const pushToTickTickMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ticktick/push-tasks");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (data.pushed > 0) {
        toast({
          title: "Pushed to TickTick!",
          description: `${data.pushed} task${data.pushed > 1 ? "s" : ""} synced to TickTick.`,
        });
      } else {
        toast({
          title: "No tasks to push",
          description: "All dated tasks are already synced or completed.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Push failed",
        description: error.message || "Could not push tasks to TickTick",
        variant: "destructive",
      });
    },
  });

  // Get venture name helper
  const getVentureName = (ventureId: string | null) => {
    if (!ventureId) return null;
    const venture = ventures.find((v) => v.id === ventureId);
    return venture?.name || null;
  };

  // Get venture color helper
  const getVentureColor = (ventureId: string | null) => {
    if (!ventureId) return null;
    const venture = ventures.find((v) => v.id === ventureId);
    return venture?.color || null;
  };

  // Get project name helper
  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.name || null;
  };

  // Get phase name helper
  const getPhaseName = (phaseId: string | null) => {
    if (!phaseId) return null;
    const phase = phases.find((p) => p.id === phaseId);
    return phase?.name || null;
  };

  // Filter projects by venture
  const filteredProjects = useMemo(() => {
    if (ventureFilter === "all") return projects;
    return projects.filter((p) => p.ventureId === ventureFilter);
  }, [projects, ventureFilter]);

  // Filter phases by project
  const filteredPhases = useMemo(() => {
    if (projectFilter === "all") return phases;
    return phases.filter((p) => p.projectId === projectFilter);
  }, [phases, projectFilter]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter((task) => {
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

      // Project filter
      if (projectFilter !== "all" && task.projectId !== projectFilter) {
        return false;
      }

      // Phase filter
      if (phaseFilter !== "all" && task.phaseId !== phaseFilter) {
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

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "venture":
          const ventureA = getVentureName(a.ventureId) || "";
          const ventureB = getVentureName(b.ventureId) || "";
          comparison = ventureA.localeCompare(ventureB);
          break;
        case "project":
          const projectA = getProjectName(a.projectId) || "";
          const projectB = getProjectName(b.projectId) || "";
          comparison = projectA.localeCompare(projectB);
          break;
        case "phase":
          const phaseA = getPhaseName(a.phaseId) || "";
          const phaseB = getPhaseName(b.phaseId) || "";
          comparison = phaseA.localeCompare(phaseB);
          break;
        case "focusDate":
          const focusDateA = a.focusDate || "9999-12-31";
          const focusDateB = b.focusDate || "9999-12-31";
          comparison = focusDateA.localeCompare(focusDateB);
          break;
        case "dueDate":
          const dueDateA = a.dueDate || "9999-12-31";
          const dueDateB = b.dueDate || "9999-12-31";
          comparison = dueDateA.localeCompare(dueDateB);
          break;
        case "effort":
          const effortA = a.estEffort || 0;
          const effortB = b.estEffort || 0;
          comparison = effortA - effortB;
          break;
        case "priority":
          const priorityA = priorityOrder[a.priority || "P3"] ?? 4;
          const priorityB = priorityOrder[b.priority || "P3"] ?? 4;
          comparison = priorityA - priorityB;
          break;
        case "status":
          const statusA = statusOrder[a.status] ?? 5;
          const statusB = statusOrder[b.status] ?? 5;
          comparison = statusA - statusB;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, statusFilter, ventureFilter, projectFilter, phaseFilter, priorityFilter, focusDateFilter, sortField, sortDirection, ventures, projects, phases]);

  // Calculate stats
  const stats = useMemo(() => {
    const outstanding = tasks.filter((t) => t.status !== "completed");
    const inProgress = tasks.filter((t) => t.status === "in_progress");
    const completed = tasks.filter((t) => t.status === "completed");
    return { total: tasks.length, outstanding: outstanding.length, inProgress: inProgress.length, completed: completed.length };
  }, [tasks]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setVentureFilter("all");
    setProjectFilter("all");
    setPhaseFilter("all");
    setPriorityFilter("all");
    setFocusDateFilter(undefined);
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    ventureFilter !== "all" ||
    projectFilter !== "all" ||
    phaseFilter !== "all" ||
    priorityFilter !== "all" ||
    focusDateFilter;

  const handleToggleStatus = (task: Task) => {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    updateTaskMutation.mutate({
      taskId: task.id,
      updates: {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date() : null,
      },
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Selection handlers
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedTasks.size === filteredAndSortedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredAndSortedTasks.map((t) => t.id)));
    }
  }, [filteredAndSortedTasks, selectedTasks.size]);

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedTasks.size === 0) return;
    const count = selectedTasks.size;
    if (confirm(`Are you sure you want to delete ${count} task${count > 1 ? "s" : ""}? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedTasks));
    }
  }, [selectedTasks, bulkDeleteMutation]);

  const isAllSelected = filteredAndSortedTasks.length > 0 && selectedTasks.size === filteredAndSortedTasks.length;
  const isSomeSelected = selectedTasks.size > 0 && selectedTasks.size < filteredAndSortedTasks.length;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <h1 className="text-2xl font-bold">All Tasks</h1>
              <span className="text-muted-foreground text-sm">
                {stats.outstanding} Outstanding • {stats.inProgress} In Progress
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => pushToTickTickMutation.mutate()}
                disabled={pushToTickTickMutation.isPending}
              >
                <Upload className={`h-4 w-4 mr-2 ${pushToTickTickMutation.isPending ? "animate-pulse" : ""}`} />
                {pushToTickTickMutation.isPending ? "Pushing..." : "Push to TickTick"}
              </Button>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <Card className="bg-card/50">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Venture Filter */}
                <Select
                  value={ventureFilter}
                  onValueChange={(value) => {
                    setVentureFilter(value);
                    setProjectFilter("all");
                    setPhaseFilter("all");
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Venture" />
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

                {/* Project Filter */}
                <Select
                  value={projectFilter}
                  onValueChange={(value) => {
                    setProjectFilter(value);
                    setPhaseFilter("all");
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Phase Filter */}
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    {filteredPhases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Priority Filter */}
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Focus Date Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[150px] justify-start text-left font-normal",
                        !focusDateFilter && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {focusDateFilter
                        ? format(focusDateFilter, "MMM d, yyyy")
                        : "Focus Date"}
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

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTasks.size > 0 && (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">
                    {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {bulkDeleteMutation.isPending
                      ? "Deleting..."
                      : `Delete ${selectedTasks.size} Task${selectedTasks.size > 1 ? "s" : ""}`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {tasksLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading tasks...
              </div>
            ) : filteredAndSortedTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {hasActiveFilters
                  ? "No tasks match your filters"
                  : "No tasks yet. Click 'New Task' to create one."}
              </div>
            ) : (
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement).dataset.state = isSomeSelected ? "indeterminate" : isAllSelected ? "checked" : "unchecked";
                          }
                        }}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[50px] text-muted-foreground font-medium">NO</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[50px]">
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("status")}
                      >
                        <SortIcon field="status" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("title")}
                      >
                        TASK
                        <SortIcon field="title" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("venture")}
                      >
                        VENTURE
                        <SortIcon field="venture" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("project")}
                      >
                        PROJECT
                        <SortIcon field="project" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("phase")}
                      >
                        PHASE
                        <SortIcon field="phase" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("focusDate")}
                      >
                        FOCUS DATE
                        <SortIcon field="focusDate" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("dueDate")}
                      >
                        DUE DATE
                        <SortIcon field="dueDate" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("effort")}
                      >
                        EFFORT
                        <SortIcon field="effort" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors text-muted-foreground font-medium"
                        onClick={() => handleSort("priority")}
                      >
                        PRIORITY
                        <SortIcon field="priority" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTasks.map((task, index) => {
                    const ventureColor = getVentureColor(task.ventureId);
                    const ventureName = getVentureName(task.ventureId);

                    return (
                      <TableRow
                        key={task.id}
                        className={cn(
                          "cursor-pointer group",
                          task.status === "completed" && "opacity-60",
                          selectedTasks.has(task.id) && "bg-muted/50"
                        )}
                        onClick={() => openTaskDetail(task.id)}
                      >
                        {/* Selection Checkbox */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={() => toggleTaskSelection(task.id)}
                            aria-label={`Select task: ${task.title}`}
                          />
                        </TableCell>

                        {/* Row Number */}
                        <TableCell className="font-mono text-muted-foreground text-lg">
                          {String(index + 1).padStart(2, "0")}
                        </TableCell>

                        {/* Status Toggle Checkbox */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={task.status === "completed"}
                            onCheckedChange={() => handleToggleStatus(task)}
                            className="h-5 w-5"
                          />
                        </TableCell>

                        {/* Status Icon */}
                        <TableCell>
                          <span className={getStatusColor(task.status)}>
                            {getStatusIcon(task.status)}
                          </span>
                        </TableCell>

                        {/* Task Title */}
                        <TableCell>
                          <span className={cn(
                            "font-medium",
                            task.status === "completed" && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </span>
                        </TableCell>

                        {/* Venture */}
                        <TableCell>
                          {ventureName ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-6 w-6 rounded flex items-center justify-center text-white"
                                style={{ backgroundColor: ventureColor || "#6366f1" }}
                              >
                                <Building2 className="h-3 w-3" />
                              </div>
                              <span className="text-sm">{ventureName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Project */}
                        <TableCell>
                          {task.projectId ? (
                            <div className="flex items-center gap-1.5">
                              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{getProjectName(task.projectId)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Phase */}
                        <TableCell>
                          {task.phaseId ? (
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{getPhaseName(task.phaseId)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Focus Date - Inline Editable */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 px-2 text-sm font-normal justify-start",
                                  !task.focusDate && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                {task.focusDate
                                  ? format(parseISO(task.focusDate), "MMM d")
                                  : "Set date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={task.focusDate ? parseISO(task.focusDate) : undefined}
                                onSelect={(date) => {
                                  updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: {
                                      focusDate: date ? format(date, "yyyy-MM-dd") : null,
                                    },
                                  });
                                }}
                                initialFocus
                              />
                              {task.focusDate && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-muted-foreground"
                                    onClick={() => {
                                      updateTaskMutation.mutate({
                                        taskId: task.id,
                                        updates: { focusDate: null },
                                      });
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Clear date
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Due Date - Inline Editable */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 px-2 text-sm font-normal justify-start",
                                  !task.dueDate && "text-muted-foreground",
                                  task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed" && "text-red-500"
                                )}
                              >
                                <CalendarDays className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                {task.dueDate
                                  ? format(parseISO(task.dueDate), "MMM d")
                                  : "Set due"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={task.dueDate ? parseISO(task.dueDate) : undefined}
                                onSelect={(date) => {
                                  updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: {
                                      dueDate: date ? format(date, "yyyy-MM-dd") : null,
                                    },
                                  });
                                }}
                                initialFocus
                              />
                              {task.dueDate && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-muted-foreground"
                                    onClick={() => {
                                      updateTaskMutation.mutate({
                                        taskId: task.id,
                                        updates: { dueDate: null },
                                      });
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Clear date
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Effort */}
                        <TableCell>
                          {task.estEffort ? (
                            <span className="text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {task.estEffort}h
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Priority */}
                        <TableCell>
                          {task.priority ? (
                            <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                              {task.priority}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openTaskDetail(task.id)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: { status: "todo" },
                                  })
                                }
                              >
                                Mark To Do
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: { status: "in_progress" },
                                  })
                                }
                              >
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: {
                                      status: "completed",
                                      completedAt: new Date(),
                                    },
                                  })
                                }
                              >
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: { status: "on_hold" },
                                  })
                                }
                              >
                                Mark On Hold
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this task?")) {
                                    deleteTaskMutation.mutate(task.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Footer Stats */}
        {filteredAndSortedTasks.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
