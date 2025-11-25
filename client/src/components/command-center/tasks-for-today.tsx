import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, Circle, Trash2, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useTaskDetailModal } from "@/lib/task-detail-modal-store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import CreateTaskModal from "@/components/create-task-modal";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  domain: string;
  ventureId: string | null;
  projectId: string | null;
  dueDate: string | null;
  focusDate: string | null;
  completedAt: string | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface Project {
  id: string;
  name: string;
  ventureId: string;
}

export default function TasksForToday() {
  const { toast } = useToast();
  const { openTaskDetail } = useTaskDetailModal();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
    refetchInterval: 5000,
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleToggleTask = (task: Task) => {
    const newStatus = task.status === "done" ? "in_progress" : "done";
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: newStatus },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(taskId);
    }
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "business":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "deep_work":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "admin":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "personal":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "learning":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  // Group tasks by venture → project
  const groupedTasks = tasks.reduce((acc, task) => {
    const ventureId = task.ventureId || "no-venture";
    const projectId = task.projectId || "no-project";

    if (!acc[ventureId]) {
      acc[ventureId] = {};
    }
    if (!acc[ventureId][projectId]) {
      acc[ventureId][projectId] = [];
    }
    acc[ventureId][projectId].push(task);

    return acc;
  }, {} as Record<string, Record<string, Task[]>>);

  const getVentureName = (ventureId: string) => {
    if (ventureId === "no-venture") return "No Venture";
    const venture = ventures.find((v) => v.id === ventureId);
    return venture ? `${venture.icon || ""} ${venture.name}` : "Unknown Venture";
  };

  const getProjectName = (projectId: string) => {
    if (projectId === "no-project") return "No Project";
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  if (tasksLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks for Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tasks for Today</CardTitle>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500/20 mb-4" />
            <p className="text-lg font-medium">No tasks for today!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enjoy your free time or add some tasks to get started.
            </p>
            <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Task
            </Button>
          </div>
        </CardContent>
      </Card>
      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultFocusDate={new Date().toISOString().split("T")[0]}
      />
      </>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks for Today ({tasks.length})</CardTitle>
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedTasks).map(([ventureId, projectsMap]) => (
            <div key={ventureId} className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">
                {getVentureName(ventureId)}
              </h3>
              {Object.entries(projectsMap).map(([projectId, projectTasks]) => (
                <Collapsible key={projectId} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 p-2 rounded">
                    <span className="text-sm font-medium">
                      {getProjectName(projectId)}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {projectTasks.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2 pl-4">
                    {projectTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border",
                          task.status === "done" && "opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={task.status === "done"}
                          onCheckedChange={() => handleToggleTask(task)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={getPriorityColor(task.priority)} variant="secondary">
                              {task.priority}
                            </Badge>
                            <Badge className={getTypeColor(task.type)} variant="secondary">
                              {task.type.replace("_", " ")}
                            </Badge>
                          </div>
                          <p
                            className={cn(
                              "text-sm font-medium cursor-pointer hover:underline",
                              task.status === "done" && "line-through"
                            )}
                            onClick={() => openTaskDetail(task.id)}
                          >
                            {task.title}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <CreateTaskModal
      open={createModalOpen}
      onOpenChange={setCreateModalOpen}
      defaultFocusDate={new Date().toISOString().split("T")[0]}
    />
    </>
  );
}
