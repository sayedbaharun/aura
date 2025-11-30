import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cleanFormData } from "@/lib/utils";
import {
  Edit2,
  Trash2,
  Plus,
  Calendar,
  Target,
  CheckCircle2,
  Circle,
  GripVertical,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  ventureId: string;
  status: string;
  category: string;
  priority: "P0" | "P1" | "P2" | "P3";
  startDate: string | null;
  targetEndDate: string | null;
  outcome: string | null;
  notes: string | null;
}

interface Phase {
  id: string;
  name: string;
  projectId: string;
  status: string;
  order: number;
  targetDate: string | null;
  notes: string | null;
}

interface Task {
  id: string;
  title: string;
  projectId: string | null;
  phaseId: string | null;
  status: string;
}

interface ProjectDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onEdit?: (project: Project) => void;
}

const PHASE_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default function ProjectDetailModal({
  open,
  onOpenChange,
  projectId,
  onEdit,
}: ProjectDetailModalProps) {
  const { toast } = useToast();
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [newPhase, setNewPhase] = useState({
    name: "",
    targetDate: "",
    notes: "",
  });

  // Fetch project details
  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        credentials: "include",
      });
      return await res.json();
    },
    enabled: open && !!projectId,
  });

  // Fetch phases for this project
  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: ["/api/phases", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/phases?project_id=${projectId}`, {
        credentials: "include",
      });
      return await res.json();
    },
    enabled: open && !!projectId,
  });

  // Fetch tasks for progress calculation
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?project_id=${projectId}`, {
        credentials: "include",
      });
      return await res.json();
    },
    enabled: open && !!projectId,
  });

  // Create phase mutation
  const createPhaseMutation = useMutation({
    mutationFn: async (data: { name: string; targetDate: string; notes: string }) => {
      const res = await apiRequest("POST", "/api/phases", {
        ...data,
        projectId,
        status: "not_started",
        order: phases.length,
        targetDate: data.targetDate || null,
        notes: data.notes || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      toast({ title: "Success", description: "Phase created" });
      setIsAddingPhase(false);
      setNewPhase({ name: "", targetDate: "", notes: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create phase", variant: "destructive" });
    },
  });

  // Update phase mutation
  const updatePhaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Phase> }) => {
      // Clean data to only send non-empty values
      const cleanData = cleanFormData(data);
      const res = await apiRequest("PATCH", `/api/phases/${id}`, cleanData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phases"] });
      toast({ title: "Success", description: "Phase updated" });
      setEditingPhaseId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update phase", variant: "destructive" });
    },
  });

  // Delete phase mutation
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

  const handleAddPhase = () => {
    if (!newPhase.name.trim()) {
      toast({ title: "Error", description: "Phase name is required", variant: "destructive" });
      return;
    }
    createPhaseMutation.mutate(newPhase);
  };

  const handleDeletePhase = (id: string) => {
    if (confirm("Delete this phase?")) {
      deletePhaseMutation.mutate(id);
    }
  };

  const handleTogglePhaseStatus = (phase: Phase) => {
    const newStatus = phase.status === "done" ? "not_started" : "done";
    updatePhaseMutation.mutate({ id: phase.id, data: { status: newStatus } });
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "text-green-600 dark:text-green-400";
      case "in_progress":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  // Calculate progress
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const taskProgress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const donePhases = phases.filter((m) => m.status === "done").length;
  const phaseProgress = phases.length > 0 ? Math.round((donePhases / phases.length) * 100) : 0;

  // Get tasks per phase
  const getTasksForPhase = (phaseId: string) => {
    return tasks.filter((t) => t.phaseId === phaseId);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{project.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getPriorityColor(project.priority)} variant="secondary">
                  {project.priority}
                </Badge>
                <Badge variant="outline">{project.category}</Badge>
                <Badge variant="secondary">{project.status.replace("_", " ")}</Badge>
              </div>
            </div>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Project Details */}
        <div className="space-y-4">
          {project.outcome && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Target className="h-4 w-4" />
                Success Criteria
              </div>
              <p className="text-sm text-muted-foreground">{project.outcome}</p>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {project.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Start: {format(new Date(project.startDate), "MMM d, yyyy")}
              </div>
            )}
            {project.targetEndDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Target: {format(new Date(project.targetEndDate), "MMM d, yyyy")}
              </div>
            )}
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Task Progress</span>
                <span className="text-muted-foreground">
                  {doneTasks}/{tasks.length}
                </span>
              </div>
              <Progress value={taskProgress} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Phase Progress</span>
                <span className="text-muted-foreground">
                  {donePhases}/{phases.length}
                </span>
              </div>
              <Progress value={phaseProgress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Phases Section */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Phases</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddingPhase(true)}
              disabled={isAddingPhase}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Phase
            </Button>
          </div>

          {/* Add Phase Form */}
          {isAddingPhase && (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
              <Input
                placeholder="Phase name..."
                value={newPhase.name}
                onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  placeholder="Target date"
                  value={newPhase.targetDate}
                  onChange={(e) => setNewPhase({ ...newPhase, targetDate: e.target.value })}
                  className="flex-1"
                />
                <Button onClick={handleAddPhase} disabled={createPhaseMutation.isPending}>
                  {createPhaseMutation.isPending ? "Adding..." : "Add"}
                </Button>
                <Button variant="ghost" onClick={() => setIsAddingPhase(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Phases List */}
          {phases.length === 0 && !isAddingPhase ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">No phases yet</p>
              <p className="text-xs mt-1">Add phases to break down this project</p>
            </div>
          ) : (
            <div className="space-y-2">
              {phases
                .sort((a, b) => a.order - b.order)
                .map((phase) => {
                  const phaseTasks = getTasksForPhase(phase.id);
                  const doneTasksInPhase = phaseTasks.filter((t) => t.status === "done").length;

                  return (
                    <div
                      key={phase.id}
                      className={cn(
                        "p-3 border rounded-lg transition-colors",
                        phase.status === "done" && "bg-green-50/50 dark:bg-green-900/10"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleTogglePhaseStatus(phase)}
                          className={cn("mt-0.5", getStatusColor(phase.status))}
                        >
                          {phase.status === "done" ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4
                              className={cn(
                                "font-medium",
                                phase.status === "done" && "line-through text-muted-foreground"
                              )}
                            >
                              {phase.name}
                            </h4>
                            <div className="flex items-center gap-1">
                              {phase.targetDate && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(phase.targetDate), "MMM d")}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePhase(phase.id)}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {phaseTasks.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {doneTasksInPhase}/{phaseTasks.length} tasks
                              </span>
                              <Progress
                                value={
                                  phaseTasks.length > 0
                                    ? (doneTasksInPhase / phaseTasks.length) * 100
                                    : 0
                                }
                                className="h-1 w-20"
                              />
                            </div>
                          )}

                          {phase.notes && (
                            <p className="text-xs text-muted-foreground">{phase.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Project Notes */}
        {project.notes && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
