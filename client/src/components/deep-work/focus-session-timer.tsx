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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  estEffort: number | null;
  actualEffort: number | null;
  focusDate: string | null;
}

const TIMER_PRESETS = [
  { label: "25 min (Pomodoro)", value: 25 * 60 },
  { label: "50 min", value: 50 * 60 },
  { label: "90 min (Deep Work)", value: 90 * 60 },
];

export default function FocusSessionTimer() {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // seconds
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      duration,
    }: {
      taskId: string;
      duration: number;
    }) => {
      const task = tasks.find((t) => t.id === taskId);
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

    // Update task actual effort
    if (selectedTaskId) {
      const durationHours = initialTime / 3600; // convert seconds to hours
      updateTaskMutation.mutate({
        taskId: selectedTaskId,
        duration: durationHours,
      });

      toast({
        title: "Focus session complete!",
        description: `Great work! ${durationHours.toFixed(1)} hours logged.`,
      });
    } else {
      toast({
        title: "Focus session complete!",
        description: "Great work! Take a break.",
      });
    }

    // Show browser notification
    if (
      "Notification" in window &&
      notificationPermissionRef.current === "granted"
    ) {
      new Notification("Focus Session Complete!", {
        body: "Great work! Time for a break.",
        icon: "/favicon.ico",
      });
    }

    // Play sound (optional - browser default sound)
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGJ0fPTgjMGHm7A7+OZTRMMUKDR8LVjGgU5kdXzzn4wBiV6yPDckDgKE17A6OqlWBIJRpzg8r5sIAcvhc/z14Q0BRtrvO7mnVEODk+k4/C2YhsFOZDW88x+MAYletHw3I45ChNds+nqpVgUCEOa3++9ayEGLYXN89aEMwUeaMzy5ZlPDAvO79q"
    );
    audio.play().catch(() => {
      // Ignore if audio play fails
    });
  };

  const handleStart = () => {
    if (!selectedTaskId) {
      toast({
        title: "No task selected",
        description: "Please select a task to track time against",
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
    // Save partial progress if timer was running
    if (selectedTaskId && timeRemaining < initialTime) {
      const elapsed = initialTime - timeRemaining;
      const durationHours = elapsed / 3600;
      updateTaskMutation.mutate({
        taskId: selectedTaskId,
        duration: durationHours,
      });

      toast({
        title: "Session stopped",
        description: `${durationHours.toFixed(1)} hours logged.`,
      });
    }

    setIsRunning(false);
    setTimeRemaining(initialTime);
  };

  const handlePresetSelect = (seconds: number) => {
    setTimeRemaining(seconds);
    setInitialTime(seconds);
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Card className="rounded-t-lg rounded-b-none border-t-2 border-x-0 border-b-0 shadow-lg">
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">Focus Session Timer</span>
            {isRunning && (
              <span className="text-sm text-muted-foreground">
                ({formatTime(timeRemaining)})
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm">
            {isCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content */}
        {!isCollapsed && (
          <CardContent className="space-y-4 pb-4">
            {/* Task Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Task</label>
              <Select
                value={selectedTaskId || ""}
                onValueChange={setSelectedTaskId}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a task..." />
                </SelectTrigger>
                <SelectContent>
                  {tasks.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No tasks for today
                    </SelectItem>
                  ) : (
                    tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                        {task.estEffort && ` (${task.estEffort}h est.)`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Timer Display */}
            <div className="text-center space-y-2">
              <div className="text-5xl font-bold tabular-nums">
                {formatTime(timeRemaining)}
              </div>
              <Progress value={percentage} className="h-2" />
            </div>

            {/* Timer Presets */}
            <div className="flex gap-2 flex-wrap">
              {TIMER_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(preset.value)}
                  disabled={isRunning}
                >
                  {preset.label}
                </Button>
              ))}
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
                <Button onClick={handleStart} size="lg" className="min-w-[120px]">
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
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
                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
