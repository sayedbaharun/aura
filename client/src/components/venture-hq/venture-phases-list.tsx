import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Target, Trash2, FolderKanban, Calendar, CheckCircle2, ChevronRight, ChevronDown, Circle, CircleCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useTaskDetailModal } from "@/lib/task-detail-modal-store";

interface Phase {
  id: string;
  name: string;
  projectId: string;
  status: string;
  order: number;
  targetDate: string | null;
  notes: string | null;
}

interface Project {
  id: string;
  name: string;
  ventureId: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  phaseId: string | null;
  projectId: string | null;
  status: string;
  priority: string | null;
  focusDate: string | null;
}

interface VenturePhasesListProps {
  ventureId: string;
}

export default function VenturePhasesList({ ventureId }: VenturePhasesListProps) {
  const { toast } = useToast();
  const { openTaskDetail } = useTaskDetailModal();
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newPhaseName, setNewPhaseName] = useState("");
  const [selectedProjectForNew, setSelectedProjectForNew] = useState<string>("");
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [quickAddPhaseId, setQuickAddPhaseId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  // Fetch projects for this venture
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", ventureId],
    queryFn: async () => {
      const res = await fetch(`/api/projects?venture_id=${ventureId}`, {
        credentials: "include",
      });
      return await res.json();
    },
  });

  // Fetch all phases
  const { data: allPhases = [], isLoading } = useQuery<Phase[]>({
    queryKey: ["/api/phases"],
    queryFn: async () => {
      const res = await fetch("/api/phases", { credentials: "include" });
      return await res.json();
    },
  });

  // Fetch tasks to count per phase
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", ventureId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?venture_id=${ventureId}`, {
        credentials: "include",
      });
      return await res.json();
    },
  });

  // Filter phases to only those belonging to this venture's projects
  const projectIds = projects.map((p) => p.id);
  const phases = allPhases.filter((phase) => projectIds.includes(phase.projectId));

  const createPhaseMutation = useMutation({
    mutationFn: async (data: { name: string; projectId: string }) => {
      const res = await apiRequest("POST", "/api/phases", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      toast({ title: "Success", description: "Phase created" });
      setNewPhaseName("");
      setSelectedProjectForNew("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create phase", variant: "destructive" });
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Phase> }) => {
      const res = await apiRequest("PATCH", `/api/phases/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update phase", variant: "destructive" });
    },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/phases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      toast({ title: "Success", description: "Phase deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete phase", variant: "destructive" });
    },
  });

  const quickAddTaskMutation = useMutation({
    mutationFn: async (data: { title: string; phaseId: string; projectId: string; ventureId: string }) => {
      const res = await apiRequest("POST", "/api/tasks", {
        title: data.title,
        phaseId: data.phaseId,
        projectId: data.projectId,
        ventureId: data.ventureId,
        status: "todo",
        priority: "P2",
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task created" });
      setQuickAddTitle("");
      setQuickAddPhaseId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const toggleTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date().toISOString() : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleCreatePhase = () => {
    if (!newPhaseName.trim() || !selectedProjectForNew) return;
    createPhaseMutation.mutate({
      name: newPhaseName.trim(),
      projectId: selectedProjectForNew,
    });
  };

  const handleQuickAddTask = (phaseId: string, projectId: string) => {
    if (!quickAddTitle.trim()) return;
    quickAddTaskMutation.mutate({
      title: quickAddTitle.trim(),
      phaseId,
      projectId,
      ventureId,
    });
  };

  const togglePhaseExpanded = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const getTasksForPhase = (phaseId: string) => {
    return tasks.filter((t) => t.phaseId === phaseId);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "P0": return "text-red-600";
      case "P1": return "text-orange-500";
      case "P2": return "text-yellow-500";
      case "P3": return "text-gray-400";
      default: return "text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "not_started":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const getTaskCountForPhase = (phaseId: string) => {
    const phaseTasks = tasks.filter((t) => t.phaseId === phaseId);
    const completed = phaseTasks.filter((t) => t.status === "completed").length;
    return { total: phaseTasks.length, completed };
  };

  // Apply filters
  let filteredPhases = phases;
  if (projectFilter !== "all") {
    filteredPhases = filteredPhases.filter((p) => p.projectId === projectFilter);
  }
  if (statusFilter !== "all") {
    filteredPhases = filteredPhases.filter((p) => p.status === statusFilter);
  }

  // Group by project
  const phasesByProject = filteredPhases.reduce((acc, phase) => {
    const projectId = phase.projectId;
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(phase);
    return acc;
  }, {} as Record<string, Phase[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
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
          <Target className="h-5 w-5" />
          Phases ({filteredPhases.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add New Phase */}
        <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
          <Select value={selectedProjectForNew} onValueChange={setSelectedProjectForNew}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="New phase name..."
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreatePhase()}
          />
          <Button
            size="sm"
            onClick={handleCreatePhase}
            disabled={!newPhaseName.trim() || !selectedProjectForNew || createPhaseMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Phases List grouped by Project */}
        {Object.keys(phasesByProject).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Target className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm text-muted-foreground">
              No phases found. Create phases to organize your project work.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(phasesByProject).map(([projectId, projectPhases]) => (
              <div key={projectId} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FolderKanban className="h-4 w-4" />
                  {getProjectName(projectId)}
                </div>
                <div className="space-y-2 pl-6 border-l-2 border-muted">
                  {projectPhases
                    .sort((a, b) => a.order - b.order)
                    .map((phase) => {
                      const taskCount = getTaskCountForPhase(phase.id);
                      const phaseTasks = getTasksForPhase(phase.id);
                      const isExpanded = expandedPhases.has(phase.id);
                      return (
                        <Collapsible
                          key={phase.id}
                          open={isExpanded}
                          onOpenChange={() => togglePhaseExpanded(phase.id)}
                        >
                          <div className="rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3 p-3">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-medium">{phase.name}</span>
                                  <Badge className={getStatusColor(phase.status)} variant="secondary">
                                    {phase.status.replace("_", " ")}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {phase.targetDate && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(phase.targetDate).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {taskCount.completed}/{taskCount.total} tasks
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickAddPhaseId(phase.id);
                                  if (!isExpanded) togglePhaseExpanded(phase.id);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Select
                                value={phase.status}
                                onValueChange={(value) =>
                                  updatePhaseMutation.mutate({ id: phase.id, data: { status: value } })
                                }
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Phase</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{phase.name}"? Tasks assigned to this phase will become unassigned.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deletePhaseMutation.mutate(phase.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>

                            <CollapsibleContent>
                              <div className="px-3 pb-3 space-y-2">
                                {/* Quick Add Task */}
                                {quickAddPhaseId === phase.id && (
                                  <div className="flex gap-2 p-2 bg-muted/50 rounded">
                                    <Input
                                      placeholder="Task title..."
                                      value={quickAddTitle}
                                      onChange={(e) => setQuickAddTitle(e.target.value)}
                                      className="flex-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleQuickAddTask(phase.id, phase.projectId);
                                        if (e.key === "Escape") {
                                          setQuickAddPhaseId(null);
                                          setQuickAddTitle("");
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuickAddTask(phase.id, phase.projectId)}
                                      disabled={!quickAddTitle.trim() || quickAddTaskMutation.isPending}
                                    >
                                      Add
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setQuickAddPhaseId(null);
                                        setQuickAddTitle("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}

                                {/* Tasks List */}
                                {phaseTasks.length === 0 ? (
                                  <div className="text-sm text-muted-foreground text-center py-4">
                                    No tasks in this phase.{" "}
                                    <button
                                      className="text-primary hover:underline"
                                      onClick={() => setQuickAddPhaseId(phase.id)}
                                    >
                                      Add one
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {phaseTasks.map((task) => (
                                      <div
                                        key={task.id}
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer group",
                                          task.status === "completed" && "opacity-60"
                                        )}
                                        onClick={() => openTaskDetail(task.id)}
                                      >
                                        <button
                                          className="flex-shrink-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTaskStatusMutation.mutate({
                                              taskId: task.id,
                                              newStatus: task.status === "completed" ? "todo" : "completed",
                                            });
                                          }}
                                        >
                                          {task.status === "completed" ? (
                                            <CircleCheck className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                          )}
                                        </button>
                                        <span
                                          className={cn(
                                            "flex-1 text-sm truncate",
                                            task.status === "completed" && "line-through"
                                          )}
                                        >
                                          {task.title}
                                        </span>
                                        {task.priority && (
                                          <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>
                                            {task.priority}
                                          </span>
                                        )}
                                        {task.focusDate && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(task.focusDate).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add Task Button (when quick add is not active) */}
                                {quickAddPhaseId !== phase.id && phaseTasks.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-muted-foreground"
                                    onClick={() => setQuickAddPhaseId(phase.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add task
                                  </Button>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
