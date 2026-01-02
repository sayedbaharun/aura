import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Calendar,
  BookOpen,
  Timer,
  Utensils,
  Languages,
  LineChart,
  Cpu,
  GraduationCap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useRoute, useLocation } from "wouter";
import { useDecisionModal } from "@/lib/decision-modal-store";
import { DecisionsDueSection } from "@/components/decision-close-loop";
import { Lightbulb } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3" | null;
  focusDate: string | null;
  completedAt: string | null;
}

interface Top3Outcome {
  text: string;
  completed: boolean;
}

interface Day {
  id: string;
  date: string;
  title: string | null;
  top3Outcomes: Top3Outcome[] | null;
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
    fastingHours?: number;
    fastingCompleted?: boolean;
    deepWorkHours?: number;
    learningBlock?: {
      arabic?: boolean;
      trading?: boolean;
      ai?: boolean;
    };
    windDown?: {
      clearInbox?: boolean;
      rescheduleUnfinished?: boolean;
      supplements?: boolean;
      bedBy2am?: boolean;
      completedAt?: string;
    };
    readingLog?: {
      bookId: string;
      bookTitle: string;
      pagesRead: number;
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

interface Book {
  id: string;
  title: string;
  author: string | null;
  status: "to_read" | "reading" | "finished";
}

interface ReadingLog {
  bookId: string;
  bookTitle: string;
  pagesRead: number;
}

interface DecisionMemory {
  id: string;
  context: string;
  decision: string;
  reasoning: string | null;
  tags: string[] | null;
  followUpAt: string | null;
  outcome: string | null;
  outcomeNotes: string | null;
  outcomeRecordedAt: string | null;
  createdAt: string;
  derived: {
    canonicalSummary?: string;
    archetype?: string;
    riskLevel?: string;
    reversibility?: string;
  } | null;
}

export default function EveningReview() {
  const { toast } = useToast();
  const [, params] = useRoute("/evening/:date");
  const [, setLocation] = useLocation();
  const { openDecisionModal } = useDecisionModal();

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
    fastingHours: 0,
    deepWorkHours: 0,
    learningBlock: {
      arabic: false,
      trading: false,
      ai: false,
    },
    windDown: {
      clearInbox: false,
      rescheduleUnfinished: false,
      supplements: false,
      bedBy2am: false,
    },
  });

  const [top3Outcomes, setTop3Outcomes] = useState<Top3Outcome[]>([]);
  const [readingLog, setReadingLog] = useState<ReadingLog | null>(null);

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

  // Fetch tasks for the selected day (includes focusDate, dueDate, and overdue tasks)
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today", { date: selectedDate }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/today?date=${selectedDate}`, { credentials: "include" });
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

  // Fetch all outstanding P0/P1 tasks for priority picker
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { status: "outstanding" }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?status=todo`, { credentials: "include" });
      const tasks = await res.json();
      // Filter for P0/P1 tasks only
      return Array.isArray(tasks)
        ? tasks.filter((t: Task) => (t.priority === "P0" || t.priority === "P1") && t.status !== "completed" && t.status !== "on_hold")
        : [];
    },
  });

  // Fetch books for reading tracker (filter to "reading" status)
  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const readingBooks = Array.isArray(books)
    ? books.filter((b) => b.status === "reading")
    : [];

  // Fetch decisions due for follow-up (only show on today's review)
  const { data: dueDecisions = [], refetch: refetchDueDecisions } = useQuery<DecisionMemory[]>({
    queryKey: ["/api/decision-memories/due"],
    queryFn: async () => {
      const res = await fetch("/api/decision-memories/due", { credentials: "include" });
      return await res.json();
    },
    enabled: isViewingToday,
  });

  // Fetch decisions eligible for early signal check
  const { data: earlyCheckDecisions = [], refetch: refetchEarlyCheck } = useQuery<DecisionMemory[]>({
    queryKey: ["/api/decision-memories/early-check"],
    queryFn: async () => {
      const res = await fetch("/api/decision-memories/early-check", { credentials: "include" });
      return await res.json();
    },
    enabled: isViewingToday,
  });

  // Handler for when a decision is closed
  const handleDecisionClosed = () => {
    refetchDueDecisions();
    refetchEarlyCheck();
  };

  // P0/P1 tasks available for all priority slots
  const priorityTasks = Array.isArray(allTasks) ? allTasks : [];

  const todayHealth = Array.isArray(healthEntries) ? healthEntries[0] : null;

  // Reset state when navigating to a different date
  useEffect(() => {
    setReview({
      reflectionPm: "",
      gratitude: ["", "", ""],
      tomorrowPriorities: ["", "", ""],
      reviewCompleted: false,
      fastingHours: 0,
      deepWorkHours: 0,
      learningBlock: {
        arabic: false,
        trading: false,
        ai: false,
      },
      windDown: {
        clearInbox: false,
        rescheduleUnfinished: false,
        supplements: false,
        bedBy2am: false,
      },
    });
    setTop3Outcomes([]);
    setReadingLog(null);
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
        fastingHours: dayData.eveningRituals?.fastingHours || 0,
        deepWorkHours: dayData.eveningRituals?.deepWorkHours || 0,
        learningBlock: {
          arabic: dayData.eveningRituals?.learningBlock?.arabic ?? false,
          trading: dayData.eveningRituals?.learningBlock?.trading ?? false,
          ai: dayData.eveningRituals?.learningBlock?.ai ?? false,
        },
        windDown: {
          clearInbox: dayData.eveningRituals?.windDown?.clearInbox ?? false,
          rescheduleUnfinished: dayData.eveningRituals?.windDown?.rescheduleUnfinished ?? false,
          supplements: dayData.eveningRituals?.windDown?.supplements ?? false,
          bedBy2am: dayData.eveningRituals?.windDown?.bedBy2am ?? false,
        },
      });

      // Load top3Outcomes
      if (Array.isArray(dayData.top3Outcomes)) {
        setTop3Outcomes(dayData.top3Outcomes);
      }

      // Load reading log
      if (dayData.eveningRituals?.readingLog) {
        setReadingLog(dayData.eveningRituals.readingLog);
      }
    }
  }, [dayData]);

  // Calculate day stats
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === "completed").length : 0;
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
        fastingHours: review.fastingHours || undefined,
        fastingCompleted: review.fastingHours >= 16,
        deepWorkHours: review.deepWorkHours || undefined,
        learningBlock: review.learningBlock,
        windDown: {
          ...review.windDown,
          completedAt: Object.values(review.windDown).some(v => v === true)
            ? new Date().toISOString()
            : undefined,
        },
        readingLog: readingLog && readingLog.bookId && readingLog.pagesRead > 0
          ? readingLog
          : undefined,
        completedAt: new Date().toISOString(),
      };

      const payload = {
        id: `day_${selectedDate}`,
        date: selectedDate,
        reflectionPm: review.reflectionPm || null,
        eveningRituals,
        top3Outcomes: top3Outcomes.length > 0 ? top3Outcomes : null,
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

  const toggleOutcomeCompleted = (index: number) => {
    const newOutcomes = [...top3Outcomes];
    newOutcomes[index] = {
      ...newOutcomes[index],
      completed: !newOutcomes[index].completed,
    };
    setTop3Outcomes(newOutcomes);
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
          {isViewingToday && (
            <Button
              variant="outline"
              onClick={() => openDecisionModal({ source: 'evening' })}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Log Decision
            </Button>
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

          {/* Top 3 Outcomes */}
          {top3Outcomes.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Today's Top 3 Outcomes</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {top3Outcomes.filter(o => o.completed).length}/{top3Outcomes.length} completed
                </span>
              </div>
              <div className="space-y-2">
                {top3Outcomes.map((outcome, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Checkbox
                      id={`outcome-${index}`}
                      checked={outcome.completed}
                      onCheckedChange={() => toggleOutcomeCompleted(index)}
                    />
                    <Label
                      htmlFor={`outcome-${index}`}
                      className={`text-sm cursor-pointer flex-1 ${
                        outcome.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {outcome.text}
                    </Label>
                  </div>
                ))}
              </div>
              <Progress
                value={(top3Outcomes.filter(o => o.completed).length / top3Outcomes.length) * 100}
                className="h-2 mt-3"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Metrics - Fasting & Deep Work */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-purple-500" />
            Daily Metrics
          </CardTitle>
          <CardDescription>
            Track your fasting window and deep work hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fasting Hours */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-orange-500" />
                <Label htmlFor="fasting-hours" className="font-medium">Fasting Hours</Label>
                <span className="text-xs text-muted-foreground ml-auto">Target: 16h</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="fasting-hours"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="0"
                  value={review.fastingHours || ""}
                  onChange={(e) => setReview({ ...review, fastingHours: parseFloat(e.target.value) || 0 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">hours</span>
                {review.fastingHours >= 16 && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Target Met
                  </Badge>
                )}
              </div>
              <Progress
                value={Math.min((review.fastingHours / 16) * 100, 100)}
                className={`h-2 ${review.fastingHours >= 16 ? '[&>div]:bg-green-500' : '[&>div]:bg-orange-500'}`}
              />
            </div>

            {/* Deep Work Hours */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-purple-500" />
                <Label htmlFor="deep-work-hours" className="font-medium">Deep Work Hours</Label>
                <span className="text-xs text-muted-foreground ml-auto">Target: 5h</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="deep-work-hours"
                  type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  placeholder="0"
                  value={review.deepWorkHours || ""}
                  onChange={(e) => setReview({ ...review, deepWorkHours: parseFloat(e.target.value) || 0 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">hours</span>
                {review.deepWorkHours >= 5 && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Target Met
                  </Badge>
                )}
              </div>
              <Progress
                value={Math.min((review.deepWorkHours / 5) * 100, 100)}
                className={`h-2 ${review.deepWorkHours >= 5 ? '[&>div]:bg-green-500' : '[&>div]:bg-purple-500'}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Block */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            Learning Block
          </CardTitle>
          <CardDescription>
            Did you spend time on your 3 learning tracks today? (15 min each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Arabic */}
            <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id="learning-arabic"
                checked={review.learningBlock.arabic}
                onCheckedChange={(checked) =>
                  setReview({
                    ...review,
                    learningBlock: { ...review.learningBlock, arabic: checked as boolean },
                  })
                }
              />
              <div className="flex items-center gap-2 flex-1">
                <Languages className="h-5 w-5 text-emerald-500" />
                <Label htmlFor="learning-arabic" className="font-medium cursor-pointer">
                  Arabic
                </Label>
              </div>
              {review.learningBlock.arabic && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>

            {/* Trading */}
            <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id="learning-trading"
                checked={review.learningBlock.trading}
                onCheckedChange={(checked) =>
                  setReview({
                    ...review,
                    learningBlock: { ...review.learningBlock, trading: checked as boolean },
                  })
                }
              />
              <div className="flex items-center gap-2 flex-1">
                <LineChart className="h-5 w-5 text-amber-500" />
                <Label htmlFor="learning-trading" className="font-medium cursor-pointer">
                  Trading
                </Label>
              </div>
              {review.learningBlock.trading && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>

            {/* AI */}
            <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id="learning-ai"
                checked={review.learningBlock.ai}
                onCheckedChange={(checked) =>
                  setReview({
                    ...review,
                    learningBlock: { ...review.learningBlock, ai: checked as boolean },
                  })
                }
              />
              <div className="flex items-center gap-2 flex-1">
                <Cpu className="h-5 w-5 text-purple-500" />
                <Label htmlFor="learning-ai" className="font-medium cursor-pointer">
                  AI
                </Label>
              </div>
              {review.learningBlock.ai && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="pt-4 mt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Learning progress</span>
              <span className="font-medium">
                {Object.values(review.learningBlock).filter(v => v === true).length}/3 tracks
              </span>
            </div>
            <Progress
              value={(Object.values(review.learningBlock).filter(v => v === true).length / 3) * 100}
              className="h-2 mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Decisions Due for Follow-up - only show on today's review when there are decisions */}
      {isViewingToday && (dueDecisions.length > 0 || earlyCheckDecisions.length > 0) && (
        <DecisionsDueSection
          dueDecisions={dueDecisions}
          earlyCheckDecisions={earlyCheckDecisions}
          onDecisionClosed={handleDecisionClosed}
        />
      )}

      {/* Evening Reading */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            Evening Reading
          </CardTitle>
          <CardDescription>
            Track what you read today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="book-select">Book</Label>
              {readingBooks.length > 0 ? (
                <Select
                  value={readingLog?.bookId || ""}
                  onValueChange={(bookId) => {
                    const book = readingBooks.find(b => b.id === bookId);
                    if (book) {
                      setReadingLog({
                        bookId: book.id,
                        bookTitle: book.title,
                        pagesRead: readingLog?.pagesRead || 0,
                      });
                    }
                  }}
                >
                  <SelectTrigger id="book-select">
                    <SelectValue placeholder="Select a book you're reading..." />
                  </SelectTrigger>
                  <SelectContent>
                    {readingBooks.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-emerald-500" />
                          {book.title}
                          {book.author && (
                            <span className="text-muted-foreground text-xs">
                              by {book.author}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground py-3 text-center border rounded-md bg-muted/30">
                  No books marked as "reading". Add books from the{" "}
                  <Link href="/books" className="text-primary underline">
                    Books page
                  </Link>.
                </div>
              )}
            </div>

            {readingLog?.bookId && (
              <div className="space-y-2">
                <Label htmlFor="pages-read">Pages Read Today</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="pages-read"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={readingLog.pagesRead || ""}
                    onChange={(e) => {
                      setReadingLog({
                        ...readingLog,
                        pagesRead: parseInt(e.target.value) || 0,
                      });
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">pages</span>
                </div>
              </div>
            )}

            {readingLog?.bookId && readingLog.pagesRead > 0 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  Read {readingLog.pagesRead} pages of "{readingLog.bookTitle}"
                </span>
              </div>
            )}
          </div>
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
            Pick from your P0/P1 tasks. Priority #1 becomes tomorrow's "One Thing to Ship"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  index === 0 ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                  index === 1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  #{index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  {index === 0 && (
                    <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                      <Rocket className="h-3 w-3" />
                      This becomes tomorrow's "One Thing to Ship"
                    </div>
                  )}
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
                      <SelectTrigger className={`w-full ${index === 0 ? "border-purple-300 dark:border-purple-700" : ""}`}>
                        <SelectValue placeholder="Pick a P0/P1 task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  task.priority === "P0"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 text-xs"
                                    : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 text-xs"
                                }
                              >
                                {task.priority}
                              </Badge>
                              {task.title}
                            </span>
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
                        : "No P0/P1 tasks - type a custom priority..."
                    }
                    value={review.tomorrowPriorities[index] || ""}
                    onChange={(e) => updatePriority(index, e.target.value)}
                    className={`w-full bg-transparent border-b focus:border-primary outline-none py-2 ${
                      index === 0 ? "border-purple-300 dark:border-purple-700" : "border-muted-foreground/20"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
          {priorityTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No outstanding P0/P1 tasks. Type custom priorities above.
            </p>
          )}
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
          <Link href="/health-hub">
            <ChevronRight className="h-4 w-4 mr-2" />
            Log Health
          </Link>
        </Button>
      </div>
    </div>
  );
}
