import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";
import { Search, X, Clock, AlertCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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
  focusDate: string | null;
  dueDate: string | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface TaskPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  slot: string | null;
  preSelectedTaskId?: string | null;
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

export default function TaskPickerModal({
  isOpen,
  onClose,
  date,
  slot,
  preSelectedTaskId,
}: TaskPickerModalProps) {
  const { toast } = useToast();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterVenture, setFilterVenture] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(date);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(slot);

  // Update selected date/slot when props change
  useEffect(() => {
    setSelectedDate(date);
    setSelectedSlot(slot);
  }, [date, slot]);

  // Pre-select task if provided
  useEffect(() => {
    if (preSelectedTaskId && isOpen) {
      setSelectedTaskIds(new Set([preSelectedTaskId]));
    }
  }, [preSelectedTaskId, isOpen]);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const slotInfo = selectedSlot ? SLOT_INFO[selectedSlot as keyof typeof SLOT_INFO] : null;

  // Fetch ALL tasks (consistent query key with other components)
  const { data: allTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks", { credentials: "include" });
      return await res.json();
    },
    enabled: isOpen,
  });

  // Filter to show tasks that need scheduling:
  // - No focusDate set (not yet scheduled)
  // - Status is actionable (not done, cancelled)
  const needsSchedulingTasks = allTasks.filter((task) => {
    if (task.focusDate) return false; // Already scheduled
    if (task.status === "done" || task.status === "cancelled") return false;
    return true;
  });

  // Sort: tasks with dueDate first (by urgency), then by priority
  const sortedTasks = [...needsSchedulingTasks].sort((a, b) => {
    // Tasks with due dates come first
    const aHasDue = !!a.dueDate;
    const bHasDue = !!b.dueDate;
    if (aHasDue && !bHasDue) return -1;
    if (!aHasDue && bHasDue) return 1;

    // If both have due dates, sort by urgency
    if (aHasDue && bHasDue) {
      const aDays = differenceInDays(parseISO(a.dueDate!), new Date());
      const bDays = differenceInDays(parseISO(b.dueDate!), new Date());
      if (aDays !== bDays) return aDays - bDays;
    }

    // Then by priority
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Filter tasks by search and filters
  const filteredTasks = sortedTasks.filter((task) => {
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterPriority !== "all" && task.priority !== filterPriority) {
      return false;
    }
    if (filterVenture !== "all" && task.ventureId !== filterVenture) {
      return false;
    }
    return true;
  });

  // Get due date urgency display
  const getDueDateUrgency = (dueDate: string | null) => {
    if (!dueDate) return null;
    const d = parseISO(dueDate);
    const daysUntil = differenceInDays(d, new Date());

    if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}d overdue`, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", urgent: true };
    if (daysUntil === 0) return { text: "Due today", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", urgent: true };
    if (daysUntil === 1) return { text: "Due tomorrow", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", urgent: true };
    if (daysUntil <= 3) return { text: `Due in ${daysUntil}d`, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", urgent: false };
    if (daysUntil <= 7) return { text: `Due in ${daysUntil}d`, color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", urgent: false };
    return { text: format(d, "MMM d"), color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", urgent: false };
  };

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!dateStr || !selectedSlot) throw new Error("Please select a date and time slot");

      const dayId = `day_${dateStr}`;

      return Promise.all(
        Array.from(selectedTaskIds).map((taskId) =>
          apiRequest("PATCH", `/api/tasks/${taskId}`, {
            focusDate: dateStr,
            focusSlot: selectedSlot,
            dayId,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/days/today"] });
      toast({
        title: "Success",
        description: `${selectedTaskIds.size} task(s) scheduled!`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule tasks",
        variant: "destructive",
      });
    },
  });

  const handleToggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const handleSchedule = () => {
    if (selectedTaskIds.size === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to schedule",
        variant: "destructive",
      });
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast({
        title: "Select date and slot",
        description: "Please select a date and time slot first",
        variant: "destructive",
      });
      return;
    }
    scheduleMutation.mutate();
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

  const selectedTasks = allTasks.filter((task) =>
    selectedTaskIds.has(task.id)
  );
  const totalEffort = selectedTasks.reduce(
    (sum, task) => sum + (task.estEffort || 0),
    0
  );

  const handleClose = () => {
    setSelectedTaskIds(new Set());
    setSearchQuery("");
    setFilterPriority("all");
    setFilterVenture("all");
    setSelectedDate(null);
    setSelectedSlot(null);
    onClose();
  };

  // Count tasks with due dates
  const tasksWithDueDates = filteredTasks.filter(t => t.dueDate).length;
  const tasksWithoutDueDates = filteredTasks.filter(t => !t.dueDate).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">Schedule Tasks</div>
              {selectedDate && slotInfo ? (
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {format(selectedDate, "EEEE, MMM d")} - {slotInfo.label} ({slotInfo.time})
                </div>
              ) : (
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  Select tasks and choose a time slot
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">Select tasks to schedule for this time slot</DialogDescription>
        </DialogHeader>

        {/* Date/Slot Selection (if not provided) */}
        {(!date || !slot) && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Time Slot</label>
              <Select value={selectedSlot || ""} onValueChange={setSelectedSlot}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SLOT_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.label} ({info.time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="P0">P0 (Critical)</SelectItem>
                <SelectItem value="P1">P1 (High)</SelectItem>
                <SelectItem value="P2">P2 (Medium)</SelectItem>
                <SelectItem value="P3">P3 (Low)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterVenture} onValueChange={setFilterVenture}>
              <SelectTrigger>
                <SelectValue placeholder="Venture" />
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
          </div>

          {/* Task counts */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            {tasksWithDueDates > 0 && (
              <Badge variant="outline" className="text-orange-600">
                {tasksWithDueDates} with due dates
              </Badge>
            )}
            {tasksWithoutDueDates > 0 && (
              <Badge variant="outline">
                {tasksWithoutDueDates} without due dates
              </Badge>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No unscheduled tasks found</p>
              <p className="text-xs mt-1">All tasks have been scheduled!</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const venture = getVentureInfo(task.ventureId);
              const isSelected = selectedTaskIds.has(task.id);
              const dueDateInfo = getDueDateUrgency(task.dueDate);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
                    isSelected && "bg-accent border-primary",
                    dueDateInfo?.urgent && !isSelected && "ring-1 ring-orange-400/50 bg-orange-50/30 dark:bg-orange-950/10"
                  )}
                  style={{
                    borderLeftColor: venture?.color || "#6b7280",
                    borderLeftWidth: "3px",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleTask(task.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start gap-2">
                        <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                        {dueDateInfo?.urgent && (
                          <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={getPriorityColor(task.priority)}
                          variant="secondary"
                        >
                          {task.priority}
                        </Badge>
                        {dueDateInfo && (
                          <Badge className={cn("text-xs", dueDateInfo.color)}>
                            <Clock className="h-3 w-3 mr-1" />
                            {dueDateInfo.text}
                          </Badge>
                        )}
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
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Summary */}
        {selectedTaskIds.size > 0 && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {selectedTaskIds.size} task(s) selected
              </span>
              <span className="text-muted-foreground">
                Total: {totalEffort.toFixed(1)} hours
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={selectedTaskIds.size === 0 || !selectedDate || !selectedSlot || scheduleMutation.isPending}
          >
            Schedule {selectedTaskIds.size > 0 && `(${selectedTaskIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
