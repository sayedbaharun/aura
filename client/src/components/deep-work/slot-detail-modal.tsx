import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTaskDetailModal } from "@/lib/task-detail-modal-store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  ventureId: string | null;
  estEffort: number | null;
  notes: string | null;
  focusDate: string | null;
  focusSlot: string | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface SlotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  slot: string | null;
  onAddTask: () => void;
}

const SLOT_INFO = {
  morning_routine: { label: "Morning Routine", time: "7:00-10:00 AM", capacity: 3 },
  gym: { label: "Gym", time: "10:00 AM-12:00 PM", capacity: 2 },
  admin: { label: "Admin Block", time: "12:00-1:30 PM", capacity: 1.5 },
  lunch: { label: "Lunch", time: "1:30-3:00 PM", capacity: 1.5 },
  walk: { label: "Walk", time: "3:00-4:00 PM", capacity: 1 },
  deep_work: { label: "Deep Work", time: "4:00-8:00 PM", capacity: 4 },
  evening: { label: "Evening", time: "8:00 PM-1:00 AM", capacity: 5 },
  meetings: { label: "Meetings", time: "Flexible", capacity: 4 },
  buffer: { label: "Buffer", time: "Flexible", capacity: 2 },
} as const;

export default function SlotDetailModal({
  isOpen,
  onClose,
  date,
  slot,
  onAddTask,
}: SlotDetailModalProps) {
  const { toast } = useToast();
  const { openTaskDetail } = useTaskDetailModal();

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;
  const slotInfo = slot ? SLOT_INFO[slot as keyof typeof SLOT_INFO] : null;

  // Fetch tasks for this slot
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isOpen && !!dateStr && !!slot,
  });

  const slotTasks = allTasks.filter(
    (task) => task.focusDate === dateStr && task.focusSlot === slot
  );

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const removeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        focusDate: null,
        focusSlot: null,
        dayId: null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task removed from slot",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove task",
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return Promise.all(
        slotTasks.map((task) =>
          apiRequest("PATCH", `/api/tasks/${task.id}`, {
            focusDate: null,
            focusSlot: null,
            dayId: null,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "All tasks cleared from slot",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear tasks",
        variant: "destructive",
      });
    },
  });

  const handleRemoveTask = (taskId: string) => {
    if (confirm("Remove this task from the slot?")) {
      removeTaskMutation.mutate(taskId);
    }
  };

  const handleClearAll = () => {
    if (confirm("Clear all tasks from this slot?")) {
      clearAllMutation.mutate();
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

  const getVentureInfo = (ventureId: string | null) => {
    if (!ventureId) return null;
    return ventures.find((v) => v.id === ventureId);
  };

  const totalEffort = slotTasks.reduce(
    (sum, task) => sum + (task.estEffort || 0),
    0
  );
  const capacity = slotInfo?.capacity || 8;
  const remaining = capacity - totalEffort;
  const percentage = (totalEffort / capacity) * 100;

  if (!date || !slot || !slotInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">
                {format(date, "EEEE, MMM d")} - {slotInfo.label}
              </div>
              <div className="text-sm font-normal text-muted-foreground mt-1">
                {slotInfo.time}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">View and manage tasks for this time slot</DialogDescription>
        </DialogHeader>

        {/* Capacity Indicator */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Available Capacity</span>
            <span className="text-muted-foreground">
              {capacity} hours total
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Scheduled: {totalEffort.toFixed(1)} hours ({slotTasks.length} tasks)</span>
              <span>Remaining: {remaining.toFixed(1)} hours</span>
            </div>
            <Progress
              value={Math.min(percentage, 100)}
              className="h-2"
              indicatorClassName={
                percentage > 100
                  ? "bg-red-500"
                  : percentage > 70
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }
            />
            {percentage > 100 && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Warning: Slot is over-scheduled by {(percentage - 100).toFixed(0)}%
              </p>
            )}
          </div>
        </div>

        {/* Current Tasks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Scheduled Tasks</h3>
            <Button size="sm" onClick={onAddTask}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>

          {slotTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">No tasks scheduled yet</p>
              <p className="text-xs mt-1">Click "Add Task" to schedule tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slotTasks.map((task) => {
                const venture = getVentureInfo(task.ventureId);
                return (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    style={{
                      borderLeftColor: venture?.color || "#6b7280",
                      borderLeftWidth: "3px",
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <h4
                            className="font-medium text-sm cursor-pointer hover:underline"
                            onClick={() => openTaskDetail(task.id)}
                          >
                            {task.title}
                          </h4>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={getPriorityColor(task.priority)}
                              variant="secondary"
                            >
                              {task.priority}
                            </Badge>
                            {venture && (
                              <Badge variant="outline" className="text-xs">
                                {venture.icon} {venture.name}
                              </Badge>
                            )}
                            {task.estEffort && (
                              <Badge variant="secondary" className="text-xs">
                                {task.estEffort}h
                              </Badge>
                            )}
                          </div>

                          {task.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.notes}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          {slotTasks.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearAllMutation.isPending}
            >
              Clear All Tasks
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
