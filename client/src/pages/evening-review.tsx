import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Target,
  Rocket,
  Heart,
  ListTodo,
  ChevronRight,
  ChevronLeft,
  Trophy,
  TrendingUp,
  AlertCircle,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useRoute, useLocation } from "wouter";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P1" | "P2" | "P3" | null;
  focusDate: string | null;
  completedAt: string | null;
}

interface Day {
  id: string;
  date: string;
  title: string | null;
  top3Outcomes: string | null;
  oneThingToShip: string | null;
  reflectionAm: string | null;
  reflectionPm: string | null;
  mood: string | null;
  morningRituals: {
    pressUps?: { done: boolean; reps?: number };
    squats?: { done: boolean; reps?: number };
    supplements?: { done: boolean };
    reading?: { done: boolean; pages?: number };
    completedAt?: string;
  } | null;
  eveningRituals: {
    reviewCompleted?: boolean;
    journalEntry?: string;
    gratitude?: string[];
    tomorrowPriorities?: string[];
    windDown?: {
      clearInbox?: boolean;
      rescheduleUnfinished?: boolean;
      supplements?: boolean;
      bedBy2am?: boolean;
      completedAt?: string;
    };
    completedAt?: string;
  } | null;
}

interface HealthEntry {
  id: string;
  date: string;
  sleepHours: number | null;
  workoutDone: boolean;
  steps: number | null;
  mood: string | null;
}

export default function EveningReview() {
  const { toast } = useToast();
  const [, params] = useRoute("/evening/:date");
  const [, setLocation] = useLocation();

  // Use date from URL params, or default to today
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const selectedDate = params?.date || todayDate;
  const isViewingToday = selectedDate === todayDate;

  // Parse the selected date for display and navigation
  const currentDate = parseISO(selectedDate);

  // Navigation helpers
  const goToPreviousDay = () => {
    const prevDate = format(subDays(currentDate, 1), "yyyy-MM-dd");
    setLocation(`/evening/${prevDate}`);
  };

  const goToNextDay = () => {
    const nextDate = format(addDays(currentDate, 1), "yyyy-MM-dd");
    if (nextDate <= todayDate) {
      setLocation(`/evening/${nextDate}`);
    }
  };

  const goToToday = () => {
    setLocation("/evening");
  };

  const [review, setReview] = useState({
    reflectionPm: "",
    gratitude: ["", "", ""],
    tomorrowPriorities: ["", "", ""],
    reviewCompleted: false,
    windDown: {
      clearInbox: false,
      rescheduleUnfinished: false,
      supplements: false,
      bedBy2am: false,
    },
  });

  // Fetch the selected day's data
  const { data: dayData, isLoading: isDayLoading } = useQuery<Day>({
    queryKey: ["/api/days", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/days/${selectedDate}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch day");
      return await res.json();
    },
  });

  // Fetch tasks for the selected day
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { focusDate: selectedDate }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?focusDate=${selectedDate}`, { credentials: "include" });
      return await res.json();
    },
  });

  // Fetch health entry for the selected day
  const { data: healthEntries = [] } = useQuery<HealthEntry[]>({
    queryKey: ["/api/health", { startDate: selectedDate, endDate: selectedDate }],
    queryFn: async () => {
      const res = await fetch(`/api/health?startDate=${selectedDate}&endDate=${selectedDate}`, {
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

  // Reset state when navigating to a different date
  useEffect(() => {
    setReview({
      reflectionPm: "",
      gratitude: ["", "", ""],
      tomorrowPriorities: ["", "", ""],
      reviewCompleted: false,
      windDown: {
        clearInbox: false,
        rescheduleUnfinished: false,
        supplements: false,
        bedBy2am: false,
      },
    });
  }, [selectedDate]);

  // Load existing data when day data arrives
  useEffect(() => {
    if (dayData) {
      // Ensure gratitude and tomorrowPriorities are arrays
      const gratitudeData = dayData.eveningRituals?.gratitude;
      const prioritiesData = dayData.eveningRituals?.tomorrowPriorities;

      setReview({
        reflectionPm: dayData.reflectionPm || "",
        gratitude: Array.isArray(gratitudeData) ? gratitudeData : ["", "", ""],
        tomorrowPriorities: Array.isArray(prioritiesData) ? prioritiesData : ["", "", ""],
        reviewCompleted: dayData.eveningRituals?.reviewCompleted || false,
        windDown: {
          clearInbox: dayData.eveningRituals?.windDown?.clearInbox ?? false,
          rescheduleUnfinished: dayData.eveningRituals?.windDown?.rescheduleUnfinished ?? false,
          supplements: dayData.eveningRituals?.windDown?.supplements ?? false,
          bedBy2am: dayData.eveningRituals?.windDown?.bedBy2am ?? false,
        },
      });
    }
  }, [dayData]);

  // Calculate day stats
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === "done").length : 0;
  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const morningRitualsComplete = dayData?.morningRituals
    ? Object.values(dayData.morningRituals)
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
        id: `day_${selectedDate}`,
        date: selectedDate,
        reflectionPm: review.reflectionPm || null,
        eveningRituals,
      };

      // Try PATCH first, then POST if day doesn't exist
      try {
        const res = await apiRequest("PATCH", `/api/days/${selectedDate}`, payload);
        return await res.json();
      } catch (e) {
        const res = await apiRequest("POST", "/api/days", payload);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/days"] });
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

  const handleSave = () => {
    saveMutation.mutate();
  };

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

  if (isDayLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-6">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full shrink-0">
            <Moon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Evening Review</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={goToPreviousDay}
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={goToNextDay}
                disabled={isViewingToday}
                title="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isViewingToday && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs ml-2"
                  onClick={goToToday}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Today
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isViewingToday && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Viewing Past Day
            </Badge>
          )}
          {review.reviewCompleted && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Complete Review"}
          </Button>
        </div>
      </div>

      {/* Day Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Today's Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Tasks Completed */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{completedTasks}/{totalTasks}</div>
              <div className="text-sm text-muted-foreground">Tasks Done</div>
              <Progress value={taskCompletionRate} className="h-2 mt-2" />
            </div>

            {/* Morning Rituals */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">
                {morningRitualsComplete ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                ) : (
                  <Circle className="h-8 w-8 text-gray-300 mx-auto" />
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Morning Rituals</div>
            </div>

            {/* Workout */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">
                {todayHealth?.workoutDone ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                ) : (
                  <Circle className="h-8 w-8 text-gray-300 mx-auto" />
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Workout</div>
            </div>

            {/* Steps */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {todayHealth?.steps ? todayHealth.steps.toLocaleString() : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Steps</div>
            </div>
          </div>

          {/* One Thing to Ship Status */}
          {dayData?.oneThingToShip && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">One Thing to Ship</span>
              </div>
              <p className="text-muted-foreground">{dayData.oneThingToShip}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evening Reflection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Evening Reflection
            </CardTitle>
            <CardDescription>
              What went well? What could be improved?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Today I accomplished... I learned... Tomorrow I will..."
              value={review.reflectionPm}
              onChange={(e) => setReview({ ...review, reflectionPm: e.target.value })}
              rows={6}
            />
          </CardContent>
        </Card>

        {/* Gratitude */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Three Things I'm Grateful For
            </CardTitle>
            <CardDescription>
              End the day with gratitude
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-muted-foreground font-medium w-6">{index + 1}.</span>
                <input
                  type="text"
                  placeholder={`I'm grateful for...`}
                  value={review.gratitude[index] || ""}
                  onChange={(e) => updateGratitude(index, e.target.value)}
                  className="flex-1 bg-transparent border-b border-muted-foreground/20 focus:border-primary outline-none py-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tomorrow's Priorities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-emerald-500" />
            Tomorrow's Top 3 Priorities
          </CardTitle>
          <CardDescription>
            Pick from your outstanding tasks or type a custom priority
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { index: 0, priority: "P1" as const, label: "Urgent", tasks: tasksByPriority.P1 },
            { index: 1, priority: "P2" as const, label: "Important", tasks: tasksByPriority.P2 },
            { index: 2, priority: "P3" as const, label: "Normal", tasks: tasksByPriority.P3 },
          ]).map(({ index, priority, label, tasks: priorityTasks }) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  index === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  index === 1 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                  {priority}
                </div>
                <div className="flex-1 space-y-2">
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
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Pick a ${priority} task...`} />
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
                        ? "Or type a custom priority..."
                        : `No ${priority} tasks - type a custom priority...`
                    }
                    value={review.tomorrowPriorities[index] || ""}
                    onChange={(e) => updatePriority(index, e.target.value)}
                    className="w-full bg-transparent border-b border-muted-foreground/20 focus:border-primary outline-none py-2"
                  />
                </div>
              </div>
              {priorityTasks.length === 0 && (
                <p className="text-xs text-muted-foreground ml-11">
                  No outstanding {priority} tasks. Create some or type a custom priority.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Wind Down Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-500" />
            Wind Down Checklist
          </CardTitle>
          <CardDescription>
            Complete these before bed for a restful night
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
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
            <div className="flex-1">
              <Label htmlFor="clearInbox" className="font-medium cursor-pointer">
                Clear Inbox
              </Label>
              <p className="text-sm text-muted-foreground">
                Process and clear your quick capture inbox
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
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
            <div className="flex-1">
              <Label htmlFor="rescheduleUnfinished" className="font-medium cursor-pointer">
                Reschedule Unfinished
              </Label>
              <p className="text-sm text-muted-foreground">
                Move incomplete tasks to future dates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
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
            <div className="flex-1">
              <Label htmlFor="supplements" className="font-medium cursor-pointer">
                Supplements
              </Label>
              <p className="text-sm text-muted-foreground">
                Take your evening supplements stack
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
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
            <div className="flex-1">
              <Label htmlFor="bedBy2am" className="font-medium cursor-pointer">
                Bed by 2am
              </Label>
              <p className="text-sm text-muted-foreground">
                Hit your sleep target time
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wind down progress</span>
              <span className="font-medium">
                {Object.values(review.windDown).filter(v => v === true).length}/4
              </span>
            </div>
            <Progress
              value={(Object.values(review.windDown).filter(v => v === true).length / 4) * 100}
              className="h-2 mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Incomplete Tasks Warning */}
      {totalTasks > 0 && completedTasks < totalTasks && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {totalTasks - completedTasks} task{totalTasks - completedTasks > 1 ? "s" : ""} incomplete
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Consider rescheduling incomplete tasks or adding them to tomorrow's priorities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ChevronRight className="h-4 w-4 mr-2" />
            Command Center
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/morning">
            <ChevronRight className="h-4 w-4 mr-2" />
            Morning Ritual
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/health">
            <ChevronRight className="h-4 w-4 mr-2" />
            Log Health
          </Link>
        </Button>
      </div>
    </div>
  );
}
