import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  ventureId: string | null;
  projectId: string | null;
}

interface Venture {
  id: string;
  name: string;
  icon: string | null;
}

interface TaskPickerProps {
  selectedTasks: string[];
  onSelect: (tasks: string[]) => void;
  maxSelections?: number;
  priorityFilter?: ("P0" | "P1" | "P2" | "P3")[];
  triggerLabel: string;
  dialogTitle: string;
  placeholder?: string;
}

export default function TaskPicker({
  selectedTasks,
  onSelect,
  maxSelections = 3,
  priorityFilter,
  triggerLabel,
  dialogTitle,
  placeholder = "Search tasks...",
}: TaskPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch all tasks (not just today's)
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { status: "next,in_progress,backlog" }],
    queryFn: async () => {
      const res = await fetch("/api/tasks?status=next,in_progress,backlog", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Filter tasks based on priority and search
  const filteredTasks = tasks.filter((task) => {
    // Priority filter
    if (priorityFilter && !priorityFilter.includes(task.priority)) {
      return false;
    }

    // Search filter
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return true;
  });

  const getVentureName = (ventureId: string | null) => {
    if (!ventureId) return null;
    const venture = ventures.find((v) => v.id === ventureId);
    return venture ? `${venture.icon || ""} ${venture.name}` : null;
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

  const isSelected = (taskTitle: string) => selectedTasks.includes(taskTitle);

  const handleToggle = (task: Task) => {
    if (isSelected(task.title)) {
      // Remove from selection
      onSelect(selectedTasks.filter((t) => t !== task.title));
    } else if (selectedTasks.length < maxSelections) {
      // Add to selection
      onSelect([...selectedTasks, task.title]);
    }
  };

  const handleRemove = (taskTitle: string) => {
    onSelect(selectedTasks.filter((t) => t !== taskTitle));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="sr-only">Select tasks to add to your focus list</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected tasks */}
          {selectedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Selected ({selectedTasks.length}/{maxSelections})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTasks.map((title, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {title}
                    <button
                      onClick={() => handleRemove(title)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Task list */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks found
              </p>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggle(task)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    isSelected(task.title)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50",
                    !isSelected(task.title) && selectedTasks.length >= maxSelections && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      isSelected(task.title)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {isSelected(task.title) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={getPriorityColor(task.priority)}
                        variant="secondary"
                      >
                        {task.priority}
                      </Badge>
                      {getVentureName(task.ventureId) && (
                        <span className="text-xs text-muted-foreground">
                          {getVentureName(task.ventureId)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{task.title}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
