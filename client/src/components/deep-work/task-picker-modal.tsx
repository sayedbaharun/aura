import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
}: TaskPickerModalProps) {
  const { toast } = useToast();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterVenture, setFilterVenture] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;
  const slotInfo = slot ? SLOT_INFO[slot as keyof typeof SLOT_INFO] : null;

  // Fetch all unscheduled tasks
  const { data: allTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "unscheduled"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/tasks?status=next,in_progress`
      );
      const tasks = await res.json();
      // Filter out tasks that already have focus_date
      return Array.isArray(tasks) ? tasks.filter((task: Task) => !task.focusDate) : [];
    },
    enabled: isOpen,
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Filter tasks
  const filteredTasks = allTasks.filter((task) => {
    // Search filter
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Priority filter
    if (filterPriority !== "all" && task.priority !== filterPriority) {
      return false;
    }

    // Venture filter
    if (filterVenture !== "all" && task.ventureId !== filterVenture) {
      return false;
    }

    // Type filter
    if (filterType !== "all" && task.type !== filterType) {
      return false;
    }

    return true;
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!dateStr || !slot) throw new Error("Invalid date or slot");

      const dayId = `day_${dateStr}`;

      return Promise.all(
        Array.from(selectedTaskIds).map((taskId) =>
          apiRequest("PATCH", `/api/tasks/${taskId}`, {
            focusDate: dateStr,
            focusSlot: slot,
            dayId,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: `${selectedTaskIds.size} task(s) scheduled!`,
      });
      setSelectedTaskIds(new Set());
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule tasks",
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
    setFilterType("all");
    onClose();
  };

  if (!date || !slot || !slotInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">Schedule Tasks</div>
              <div className="text-sm font-normal text-muted-foreground mt-1">
                {format(date, "EEEE, MMM d")} - {slotInfo.label} ({slotInfo.time})
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

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

          <div className="grid grid-cols-3 gap-2">
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

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="deep_work">Deep Work</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
              </SelectContent>
            </Select>
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
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const venture = getVentureInfo(task.ventureId);
              const isSelected = selectedTaskIds.has(task.id);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
                    isSelected && "bg-accent border-primary"
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
                      <h4 className="font-medium text-sm">{task.title}</h4>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={getPriorityColor(task.priority)}
                          variant="secondary"
                        >
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.type.replace("_", " ")}
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
            disabled={selectedTaskIds.size === 0 || scheduleMutation.isPending}
          >
            Schedule {selectedTaskIds.size > 0 && `(${selectedTaskIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
