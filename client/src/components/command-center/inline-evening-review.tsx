import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Moon,
  CheckCircle2,
  Circle,
  Trophy,
  TrendingUp,
  Heart,
  ListTodo,
  Rocket,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Day } from "@shared/schema";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P1" | "P2" | "P3" | null;
}

interface HealthEntry {
  id: string;
  date: string;
  sleepHours: number | null;
  workoutDone: boolean;
  steps: number | null;
  mood: string | null;
}

interface InlineEveningReviewProps {
  day: Day | null;
}

export default function InlineEveningReview({ day }: InlineEveningReviewProps) {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const [review, setReview] = useState({
    reflectionPm: "",
    gratitude: ["", "", ""],
    tomorrowPriorities: ["", "", ""],
    windDown: {
      clearInbox: false,
      rescheduleUnfinished: false,
      supplements: false,
      bedBy2am: false,
    },
  });

  // Fetch today's tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  // Fetch today's health entry
  const { data: healthEntries = [] } = useQuery<HealthEntry[]>({
    queryKey: ["/api/health", { startDate: today, endDate: today }],
    queryFn: async () => {
      const res = await fetch(`/api/health?startDate=${today}&endDate=${today}`, {
        credentials: "include",
      });
      return await res.json();
    },
  });

  // Fetch all outstanding tasks for priority picker
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { status: "todo" }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?status=todo`, { credentials: "include" });
      return await res.json();
    },
  });

  // Group tasks by priority for dropdowns
  const tasksByPriority = {
    P1: Array.isArray(allTasks) ? allTasks.filter(t => t.priority === "P1") : [],
    P2: Array.isArray(allTasks) ? allTasks.filter(t => t.priority === "P2") : [],
    P3: Array.isArray(allTasks) ? allTasks.filter(t => t.priority === "P3") : [],
  };

  const todayHealth = Array.isArray(healthEntries) ? healthEntries[0] : null;

  // Load existing data when day data arrives
  useEffect(() => {
    if (day) {
      const eveningRituals = day.eveningRituals as {
        gratitude?: string[];
        tomorrowPriorities?: string[];
        windDown?: {
          clearInbox?: boolean;
          rescheduleUnfinished?: boolean;
          supplements?: boolean;
          bedBy2am?: boolean;
        };
      } | null;

      setReview({
        reflectionPm: day.reflectionPm || "",
        gratitude: Array.isArray(eveningRituals?.gratitude) ? eveningRituals.gratitude : ["", "", ""],
        tomorrowPriorities: Array.isArray(eveningRituals?.tomorrowPriorities) ? eveningRituals.tomorrowPriorities : ["", "", ""],
        windDown: {
          clearInbox: eveningRituals?.windDown?.clearInbox ?? false,
          rescheduleUnfinished: eveningRituals?.windDown?.rescheduleUnfinished ?? false,
          supplements: eveningRituals?.windDown?.supplements ?? false,
          bedBy2am: eveningRituals?.windDown?.bedBy2am ?? false,
        },
      });
    }
  }, [day]);

  // Calculate day stats
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === "done").length : 0;
  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const morningRituals = day?.morningRituals as Record<string, { done?: boolean }> | null;
  const morningRitualsComplete = morningRituals
    ? Object.values(morningRituals)
        .filter(v => typeof v === "object" && v !== null)
        .every((v: any) => v.done)
    : false;

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const eveningRituals = {
        reviewCompleted: true,
        journalEntry: review.reflectionPm,
        gratitude: review.gratitude.filter(g => g.trim()),
        tomorrowPriorities: review.tomorrowPriorities.filter(p => p.trim()),
        windDown: {
          ...review.windDown,
          completedAt: Object.values(review.windDown).some(v => v === true)
            ? new Date().toISOString()
            : undefined,
        },
        completedAt: new Date().toISOString(),
      };

      const payload = {
        id: day?.id || `day_${today}`,
        date: today,
        reflectionPm: review.reflectionPm || null,
        eveningRituals,
      };

      try {
        const res = await apiRequest("PATCH", `/api/days/${today}`, payload);
        return await res.json();
      } catch (e) {
        const res = await apiRequest("POST", "/api/days", payload);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/days"] });
      queryClient.invalidateQueries({ queryKey: ["/api/days/today"] });
      toast({
        title: "Evening review saved!",
        description: "Great job completing your daily review.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateGratitude = (index: number, value: string) => {
    const newGratitude = [...review.gratitude];
    newGratitude[index] = value;
    setReview({ ...review, gratitude: newGratitude });
  };

  const updatePriority = (index: number, value: string) => {
    const newPriorities = [...review.tomorrowPriorities];
    newPriorities[index] = value;
    setReview({ ...review, tomorrowPriorities: newPriorities });
  };

  const windDownCount = Object.values(review.windDown).filter(v => v === true).length;

  return (
    <div className="space-y-6">
      {/* Header with Save */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-indigo-500" />
              <span className="font-medium">Evening Review</span>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Day Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            Today's Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{completedTasks}/{totalTasks}</div>
              <div className="text-xs text-muted-foreground">Tasks Done</div>
              <Progress value={taskCompletionRate} className="h-1.5 mt-2" />
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {morningRitualsComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300 mx-auto" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Morning</div>
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {todayHealth?.workoutDone ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300 mx-auto" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Workout</div>
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {todayHealth?.steps ? todayHealth.steps.toLocaleString() : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Steps</div>
            </div>
          </div>

          {day?.oneThingToShip && (
            <div className="mt-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-3 w-3 text-purple-500" />
                <span className="font-medium text-xs">One Thing to Ship</span>
              </div>
              <p className="text-sm text-muted-foreground">{day.oneThingToShip}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evening Reflection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Evening Reflection
            </CardTitle>
            <CardDescription className="text-xs">
              What went well? What could be improved?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Today I accomplished... I learned... Tomorrow I will..."
              value={review.reflectionPm}
              onChange={(e) => setReview({ ...review, reflectionPm: e.target.value })}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Gratitude */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-rose-500" />
              Grateful For
            </CardTitle>
            <CardDescription className="text-xs">
              End the day with gratitude
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium text-sm w-5">{index + 1}.</span>
                <input
                  type="text"
                  placeholder="I'm grateful for..."
                  value={review.gratitude[index] || ""}
                  onChange={(e) => updateGratitude(index, e.target.value)}
                  className="flex-1 bg-transparent border-b border-muted-foreground/20 focus:border-primary outline-none py-1.5 text-sm"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tomorrow's Priorities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-emerald-500" />
            Tomorrow's Top 3 Priorities
          </CardTitle>
          <CardDescription className="text-xs">
            Pick from tasks or type custom priorities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            { index: 0, priority: "P1" as const, tasks: tasksByPriority.P1 },
            { index: 1, priority: "P2" as const, tasks: tasksByPriority.P2 },
            { index: 2, priority: "P3" as const, tasks: tasksByPriority.P3 },
          ]).map(({ index, priority, tasks: priorityTasks }) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  index === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  index === 1 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {priority}
                </div>
                <div className="flex-1 space-y-1">
                  {priorityTasks.length > 0 && (
                    <Select
                      value={
                        priorityTasks.find(t => t.title === review.tomorrowPriorities[index])?.id || ""
                      }
                      onValueChange={(taskId) => {
                        const task = priorityTasks.find(t => t.id === taskId);
                        if (task) {
                          updatePriority(index, task.title);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={`Pick ${priority} task...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <input
                    type="text"
                    placeholder={
                      priorityTasks.length > 0
                        ? "Or type custom..."
                        : `No ${priority} tasks - type custom...`
                    }
                    value={review.tomorrowPriorities[index] || ""}
                    onChange={(e) => updatePriority(index, e.target.value)}
                    className="w-full bg-transparent border-b border-muted-foreground/20 focus:border-primary outline-none py-1 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Wind Down Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-indigo-500" />
            Wind Down Checklist
          </CardTitle>
          <CardDescription className="text-xs">
            Complete before bed ({windDownCount}/4)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="clearInbox"
                checked={review.windDown.clearInbox}
                onCheckedChange={(checked) =>
                  setReview({
                    ...review,
                    windDown: { ...review.windDown, clearInbox: checked as boolean },
                  })
                }
              />
              <Label htmlFor="clearInbox" className="text-sm cursor-pointer">
                Clear Inbox
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="rescheduleUnfinished"
                checked={review.windDown.rescheduleUnfinished}
                onCheckedChange={(checked) =>
                  setReview({
                    ...review,
                    windDown: { ...review.windDown, rescheduleUnfinished: checked as boolean },
                  })
                }
              />
              <Label htmlFor="rescheduleUnfinished" className="text-sm cursor-pointer">
                Reschedule Tasks
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="supplements"
                checked={review.windDown.supplements}
                onCheckedChange={(checked) =>
                  setReview({
                    ...review,
                    windDown: { ...review.windDown, supplements: checked as boolean },
                  })
                }
              />
              <Label htmlFor="supplements" className="text-sm cursor-pointer">
                Supplements
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="bedBy2am"
                checked={review.windDown.bedBy2am}
                onCheckedChange={(checked) =>
                  setReview({
                    ...review,
                    windDown: { ...review.windDown, bedBy2am: checked as boolean },
                  })
                }
              />
              <Label htmlFor="bedBy2am" className="text-sm cursor-pointer">
                Bed by 2am
              </Label>
            </div>
          </div>

          <Progress
            value={(windDownCount / 4) * 100}
            className="h-1.5 mt-3"
          />
        </CardContent>
      </Card>
    </div>
  );
}
