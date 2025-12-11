import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Play,
  Pause,
  Square,
  ChevronUp,
  ChevronDown,
  Clock,
  Coffee,
  X,
  Plus,
  RotateCcw,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  estEffort: number | null;
  actualEffort: number | null;
  focusDate: string | null;
  priority: string | null;
  status: string;
}

const TIMER_PRESETS = [
  { label: "25 min", value: 25 * 60, type: "work" },
  { label: "50 min", value: 50 * 60, type: "work" },
  { label: "90 min", value: 90 * 60, type: "deep" },
];

const BREAK_PRESETS = [
  { label: "5 min", value: 5 * 60 },
  { label: "15 min", value: 15 * 60 },
  { label: "30 min", value: 30 * 60 },
];

type TimerMode = "work" | "break";

export default function FocusSessionTimer() {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [customMinutes, setCustomMinutes] = useState("");
  const [timerMode, setTimerMode] = useState<TimerMode>("work");
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [taskToAdd, setTaskToAdd] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's tasks and all active tasks
  const { data: todayTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  const { data: activeTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", "active"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        "/api/tasks?status=todo,in_progress"
      );
      return await res.json();
    },
  });

  // Combine and deduplicate tasks
  const availableTasks = [...todayTasks];
  activeTasks.forEach((task) => {
    if (!availableTasks.find((t) => t.id === task.id)) {
      availableTasks.push(task);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      duration,
    }: {
      taskId: string;
      duration: number;
    }) => {
      const task = availableTasks.find((t) => t.id === taskId);
      if (!task) throw new Error("Task not found");

      const newActualEffort = (task.actualEffort || 0) + duration;

      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        actualEffort: newActualEffort,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
    },
  });

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        notificationPermissionRef.current = permission;
      });
    } else if ("Notification" in window) {
      notificationPermissionRef.current = Notification.permission;
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const handleTimerComplete = () => {
    setIsRunning(false);

    if (timerMode === "work") {
      // Update tasks with distributed effort
      if (selectedTaskIds.length > 0) {
        const durationHours = initialTime / 3600;
        const durationPerTask = durationHours / selectedTaskIds.length;

        selectedTaskIds.forEach((taskId) => {
          updateTaskMutation.mutate({
            taskId,
            duration: durationPerTask,
          });
        });

        setCompletedPomodoros((prev) => prev + 1);

        toast({
          title: "Focus session complete!",
          description: `${durationHours.toFixed(1)} hours logged across ${selectedTaskIds.length} task(s). Time for a break!`,
        });
      } else {
        toast({
          title: "Focus session complete!",
          description: "Great work! Time for a break.",
        });
      }

      // Suggest break
      setTimerMode("break");
      const breakTime =
        completedPomodoros > 0 && (completedPomodoros + 1) % 4 === 0
          ? 15 * 60
          : 5 * 60;
      setTimeRemaining(breakTime);
      setInitialTime(breakTime);
    } else {
      // Break finished
      toast({
        title: "Break over!",
        description: "Ready for another focus session?",
      });
      setTimerMode("work");
      setTimeRemaining(25 * 60);
      setInitialTime(25 * 60);
    }

    // Show browser notification
    if (
      "Notification" in window &&
      notificationPermissionRef.current === "granted"
    ) {
      new Notification(
        timerMode === "work" ? "Focus Session Complete!" : "Break Over!",
        {
          body:
            timerMode === "work"
              ? "Great work! Time for a break."
              : "Ready for another focus session?",
          icon: "/favicon.ico",
        }
      );
    }

    // Play sound
    playNotificationSound();
  };

  const playNotificationSound = () => {
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGJ0fPTgjMGHm7A7+OZTRMMUKDR8LVjGgU5kdXzzn4wBiV6yPDckDgKE17A6OqlWBIJRpzg8r5sIAcvhc/z14Q0BRtrvO7mnVEODk+k4/C2YhsFOZDW88x+MAYletHw3I45ChNds+nqpVgUCEOa3++9ayEGLYXN89aEMwUeaMzy5ZlPDAvO79q"
    );
    audio.play().catch(() => {});
  };

  const handleStart = () => {
    if (timerMode === "work" && selectedTaskIds.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select 1-3 tasks to focus on",
        variant: "destructive",
      });
      return;
    }
    setIsRunning(true);
    setIsCollapsed(false);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    // Save partial progress if timer was running during work mode
    if (timerMode === "work" && selectedTaskIds.length > 0 && timeRemaining < initialTime) {
      const elapsed = initialTime - timeRemaining;
      const durationHours = elapsed / 3600;
      const durationPerTask = durationHours / selectedTaskIds.length;

      selectedTaskIds.forEach((taskId) => {
        updateTaskMutation.mutate({
          taskId,
          duration: durationPerTask,
        });
      });

      toast({
        title: "Session stopped",
        description: `${durationHours.toFixed(1)} hours logged across ${selectedTaskIds.length} task(s).`,
      });
    }

    setIsRunning(false);
    setTimeRemaining(initialTime);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimerMode("work");
    setTimeRemaining(25 * 60);
    setInitialTime(25 * 60);
    setCompletedPomodoros(0);
  };

  const handlePresetSelect = (seconds: number, mode: TimerMode = "work") => {
    setTimeRemaining(seconds);
    setInitialTime(seconds);
    setTimerMode(mode);
    setCustomMinutes("");
  };

  const handleCustomTime = () => {
    const minutes = parseInt(customMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      toast({
        title: "Invalid time",
        description: "Please enter a valid number of minutes",
        variant: "destructive",
      });
      return;
    }
    const seconds = minutes * 60;
    setTimeRemaining(seconds);
    setInitialTime(seconds);
  };

  const handleAddTask = () => {
    if (!taskToAdd) return;
    if (selectedTaskIds.length >= 3) {
      toast({
        title: "Maximum tasks reached",
        description: "You can only focus on up to 3 tasks at a time",
        variant: "destructive",
      });
      return;
    }
    if (selectedTaskIds.includes(taskToAdd)) {
      toast({
        title: "Task already selected",
        description: "This task is already in your focus list",
        variant: "destructive",
      });
      return;
    }
    setSelectedTaskIds([...selectedTaskIds, taskToAdd]);
    setTaskToAdd("");
  };

  const handleRemoveTask = (taskId: string) => {
    setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const percentage = ((initialTime - timeRemaining) / initialTime) * 100;

  const selectedTasks = availableTasks.filter((t) =>
    selectedTaskIds.includes(t.id)
  );
  const unselectedTasks = availableTasks.filter(
    (t) => !selectedTaskIds.includes(t.id)
  );

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "P0":
        return "bg-red-500";
      case "P1":
        return "bg-orange-500";
      case "P2":
        return "bg-yellow-500";
      case "P3":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Card
        className={cn(
          "rounded-t-lg rounded-b-none border-t-2 border-x-0 border-b-0 shadow-lg",
          timerMode === "break" && "border-t-green-500"
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2">
            {timerMode === "work" ? (
              <Clock className="h-5 w-5" />
            ) : (
              <Coffee className="h-5 w-5 text-green-500" />
            )}
            <span className="font-semibold">
              {timerMode === "work" ? "Focus Session" : "Break Time"}
            </span>
            {isRunning && (
              <span className="text-sm text-muted-foreground">
                ({formatTime(timeRemaining)})
              </span>
            )}
            {completedPomodoros > 0 && (
              <Badge variant="secondary" className="ml-2">
                {completedPomodoros} pomodoro{completedPomodoros !== 1 && "s"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedTaskIds.length > 0 && (
              <Badge variant="outline">
                {selectedTaskIds.length} task{selectedTaskIds.length !== 1 && "s"}
              </Badge>
            )}
            <Button variant="ghost" size="sm">
              {isCollapsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isCollapsed && (
          <CardContent className="space-y-4 pb-4">
            {/* Today's Focus Tasks */}
            {timerMode === "work" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Today's Focus (select 1-3 tasks)
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {selectedTaskIds.length}/3 selected
                  </span>
                </div>

                {/* Selected Tasks */}
                {selectedTasks.length > 0 && (
                  <div className="space-y-1">
                    {selectedTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20"
                      >
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {index + 1}
                        </span>
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            getPriorityColor(task.priority)
                          )}
                        />
                        <span className="flex-1 text-sm truncate">
                          {task.title}
                        </span>
                        {task.estEffort && (
                          <span className="text-xs text-muted-foreground">
                            {task.estEffort}h
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveTask(task.id)}
                          disabled={isRunning}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Task Dropdown */}
                {selectedTaskIds.length < 3 && (
                  <div className="flex gap-2">
                    <Select
                      value={taskToAdd}
                      onValueChange={setTaskToAdd}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add a task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unselectedTasks.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No more tasks available
                          </SelectItem>
                        ) : (
                          unselectedTasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full",
                                    getPriorityColor(task.priority)
                                  )}
                                />
                                <span className="truncate max-w-[200px]">
                                  {task.title}
                                </span>
                                {task.estEffort && (
                                  <span className="text-xs text-muted-foreground">
                                    ({task.estEffort}h)
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddTask}
                      disabled={!taskToAdd || isRunning}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Timer Display */}
            <div className="text-center space-y-2">
              <div
                className={cn(
                  "text-5xl font-bold tabular-nums",
                  timerMode === "break" && "text-green-600"
                )}
              >
                {formatTime(timeRemaining)}
              </div>
              <Progress
                value={percentage}
                className={cn("h-2", timerMode === "break" && "[&>div]:bg-green-500")}
              />
            </div>

            {/* Timer Presets */}
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {(timerMode === "work" ? TIMER_PRESETS : BREAK_PRESETS).map(
                  (preset) => (
                    <Button
                      key={preset.value}
                      variant={
                        initialTime === preset.value && !isRunning
                          ? "secondary"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        handlePresetSelect(preset.value, timerMode)
                      }
                      disabled={isRunning}
                    >
                      {preset.label}
                    </Button>
                  )
                )}
                {timerMode === "work" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePresetSelect(5 * 60, "break")}
                    disabled={isRunning}
                    className="text-green-600"
                  >
                    <Coffee className="h-4 w-4 mr-1" />
                    Take Break
                  </Button>
                )}
                {timerMode === "break" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePresetSelect(25 * 60, "work")}
                    disabled={isRunning}
                    className="text-primary"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Back to Work
                  </Button>
                )}
              </div>
            </div>

            {/* Custom Time */}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Custom (minutes)"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                disabled={isRunning}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleCustomTime}
                disabled={isRunning || !customMinutes}
              >
                Set
              </Button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              {!isRunning ? (
                <>
                  <Button
                    onClick={handleStart}
                    size="lg"
                    className={cn(
                      "min-w-[120px]",
                      timerMode === "break" &&
                        "bg-green-600 hover:bg-green-700"
                    )}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </Button>
                  {(completedPomodoros > 0 || selectedTaskIds.length > 0) && (
                    <Button
                      onClick={handleReset}
                      variant="ghost"
                      size="lg"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Reset
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={handlePause}
                    variant="outline"
                    size="lg"
                    className="min-w-[120px]"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </Button>
                  <Button onClick={handleStop} variant="destructive" size="lg">
                    <Square className="h-5 w-5 mr-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>

            {/* Session Summary */}
            {completedPomodoros > 0 && (
              <div className="text-center text-sm text-muted-foreground border-t pt-3">
                <Check className="h-4 w-4 inline mr-1 text-green-500" />
                {completedPomodoros} pomodoro{completedPomodoros !== 1 && "s"}{" "}
                completed today
                {selectedTaskIds.length > 0 && (
                  <span>
                    {" "}
                    - {((completedPomodoros * 25) / 60).toFixed(1)}h logged
                  </span>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
