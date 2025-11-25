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

interface Milestone {
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
  milestoneId: string | null;
  status: string;
}

interface ProjectDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onEdit?: (project: Project) => void;
}

const MILESTONE_STATUS_OPTIONS = [
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
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState({
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

  // Fetch milestones for this project
  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["/api/milestones", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/milestones?project_id=${projectId}`, {
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

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: { name: string; targetDate: string; notes: string }) => {
      const res = await apiRequest("POST", "/api/milestones", {
        ...data,
        projectId,
        status: "not_started",
        order: milestones.length,
        targetDate: data.targetDate || null,
        notes: data.notes || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      toast({ title: "Success", description: "Milestone created" });
      setIsAddingMilestone(false);
      setNewMilestone({ name: "", targetDate: "", notes: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create milestone", variant: "destructive" });
    },
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Milestone> }) => {
      const res = await apiRequest("PATCH", `/api/milestones/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      toast({ title: "Success", description: "Milestone updated" });
      setEditingMilestoneId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update milestone", variant: "destructive" });
    },
  });

  // Delete milestone mutation
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/milestones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      toast({ title: "Success", description: "Milestone deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete milestone", variant: "destructive" });
    },
  });

  const handleAddMilestone = () => {
    if (!newMilestone.name.trim()) {
      toast({ title: "Error", description: "Milestone name is required", variant: "destructive" });
      return;
    }
    createMilestoneMutation.mutate(newMilestone);
  };

  const handleDeleteMilestone = (id: string) => {
    if (confirm("Delete this milestone?")) {
      deleteMilestoneMutation.mutate(id);
    }
  };

  const handleToggleMilestoneStatus = (milestone: Milestone) => {
    const newStatus = milestone.status === "done" ? "not_started" : "done";
    updateMilestoneMutation.mutate({ id: milestone.id, data: { status: newStatus } });
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
  const doneMilestones = milestones.filter((m) => m.status === "done").length;
  const milestoneProgress = milestones.length > 0 ? Math.round((doneMilestones / milestones.length) * 100) : 0;

  // Get tasks per milestone
  const getTasksForMilestone = (milestoneId: string) => {
    return tasks.filter((t) => t.milestoneId === milestoneId);
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
                <span className="font-medium">Milestone Progress</span>
                <span className="text-muted-foreground">
                  {doneMilestones}/{milestones.length}
                </span>
              </div>
              <Progress value={milestoneProgress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Milestones Section */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Milestones</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddingMilestone(true)}
              disabled={isAddingMilestone}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Milestone
            </Button>
          </div>

          {/* Add Milestone Form */}
          {isAddingMilestone && (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
              <Input
                placeholder="Milestone name..."
                value={newMilestone.name}
                onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  placeholder="Target date"
                  value={newMilestone.targetDate}
                  onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value })}
                  className="flex-1"
                />
                <Button onClick={handleAddMilestone} disabled={createMilestoneMutation.isPending}>
                  {createMilestoneMutation.isPending ? "Adding..." : "Add"}
                </Button>
                <Button variant="ghost" onClick={() => setIsAddingMilestone(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Milestones List */}
          {milestones.length === 0 && !isAddingMilestone ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">No milestones yet</p>
              <p className="text-xs mt-1">Add milestones to break down this project into phases</p>
            </div>
          ) : (
            <div className="space-y-2">
              {milestones
                .sort((a, b) => a.order - b.order)
                .map((milestone) => {
                  const milestoneTasks = getTasksForMilestone(milestone.id);
                  const doneTasksInMilestone = milestoneTasks.filter((t) => t.status === "done").length;

                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        "p-3 border rounded-lg transition-colors",
                        milestone.status === "done" && "bg-green-50/50 dark:bg-green-900/10"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleMilestoneStatus(milestone)}
                          className={cn("mt-0.5", getStatusColor(milestone.status))}
                        >
                          {milestone.status === "done" ? (
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
                                milestone.status === "done" && "line-through text-muted-foreground"
                              )}
                            >
                              {milestone.name}
                            </h4>
                            <div className="flex items-center gap-1">
                              {milestone.targetDate && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(milestone.targetDate), "MMM d")}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMilestone(milestone.id)}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {milestoneTasks.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {doneTasksInMilestone}/{milestoneTasks.length} tasks
                              </span>
                              <Progress
                                value={
                                  milestoneTasks.length > 0
                                    ? (doneTasksInMilestone / milestoneTasks.length) * 100
                                    : 0
                                }
                                className="h-1 w-20"
                              />
                            </div>
                          )}

                          {milestone.notes && (
                            <p className="text-xs text-muted-foreground">{milestone.notes}</p>
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
