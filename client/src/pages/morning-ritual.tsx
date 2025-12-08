import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sun,
  Dumbbell,
  Pill,
  BookOpen,
  Target,
  Rocket,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Droplets,
  Brain,
  Coffee,
  Bed,
  Footprints,
  Settings,
  Calendar,
  type LucideIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useRoute, useLocation } from "wouter";

interface Task {
  id: string;
  title: string;
  status: 'idea' | 'next' | 'in_progress' | 'waiting' | 'done' | 'cancelled';
  priority: 'P0' | 'P1' | 'P2' | 'P3' | null;
  dueDate: string | null;
  ventureId: string | null;
  projectId: string | null;
}

interface Venture {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  status: string;
}

interface Top3Outcome {
  text: string;
  completed: boolean;
}

interface Day {
  id: string;
  date: string;
  title: string | null;
  top3Outcomes: Top3Outcome[] | string | null;
  oneThingToShip: string | null;
  reflectionAm: string | null;
  mood: string | null;
  primaryVentureFocus: string | null;
  morningRituals: Record<string, { done: boolean; reps?: number; pages?: number; count?: number }> | null;
}

interface MorningHabitConfig {
  key: string;
  label: string;
  icon: string;
  hasCount: boolean;
  countLabel?: string;
  defaultCount?: number;
  enabled: boolean;
}

interface MorningRitualConfig {
  habits: MorningHabitConfig[];
}

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell,
  Pill,
  BookOpen,
  Droplets,
  Brain,
  Coffee,
  Bed,
  Footprints,
  Sun,
};

const getIconComponent = (iconName: string): LucideIcon => {
  return ICON_MAP[iconName] || Sun;
};

export default function MorningRitual() {
  const { toast } = useToast();
  const [, params] = useRoute("/morning/:date");
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
    setLocation(`/morning/${prevDate}`);
  };

  const goToNextDay = () => {
    const nextDate = format(addDays(currentDate, 1), "yyyy-MM-dd");
    if (nextDate <= todayDate) {
      setLocation(`/morning/${nextDate}`);
    }
  };

  const goToToday = () => {
    setLocation("/morning");
  };

  // Fetch habit configuration
  const { data: habitConfig, isLoading: isConfigLoading } = useQuery<MorningRitualConfig>({
    queryKey: ["/api/settings/morning-ritual"],
  });

  const enabledHabits = useMemo(() => {
    return Array.isArray(habitConfig?.habits) ? habitConfig.habits.filter(h => h.enabled) : [];
  }, [habitConfig?.habits]);

  const [rituals, setRituals] = useState<Record<string, { done: boolean; count?: number }>>({});

  const [top3Outcomes, setTop3Outcomes] = useState<Top3Outcome[]>([
    { text: "", completed: false },
    { text: "", completed: false },
    { text: "", completed: false },
  ]);

  const [planning, setPlanning] = useState({
    oneThingToShip: "",
    reflectionAm: "",
    primaryVentureFocus: "",
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

  // Fetch ventures for focus selection
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const activeVentures = Array.isArray(ventures) ? ventures.filter(v => v.status !== "archived") : [];

  // Fetch P0/P1 tasks due on selected date for "One Thing to Ship" dropdown
  const { data: dueTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { dueDate: selectedDate }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?due_date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await res.json();
    },
  });

  // Filter for P0/P1 tasks that are not done or cancelled
  const priorityTasksDueToday = dueTasks.filter(
    (task) =>
      (task.priority === "P0" || task.priority === "P1") &&
      task.status !== "done" &&
      task.status !== "cancelled"
  );

  // Fetch the day before selected date for syncing priorities
  const dayBeforeSelected = format(subDays(currentDate, 1), "yyyy-MM-dd");
  const { data: yesterdayData } = useQuery<Day & {
    eveningRituals?: {
      tomorrowPriorities?: string[];
    } | null;
  }>({
    queryKey: ["/api/days", dayBeforeSelected],
    queryFn: async () => {
      const res = await fetch(`/api/days/${dayBeforeSelected}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch previous day");
      return await res.json();
    },
  });

  // Reset state when navigating to a different date
  useEffect(() => {
    // Reset rituals to defaults
    if (enabledHabits.length > 0) {
      const initial: Record<string, { done: boolean; count?: number }> = {};
      for (const habit of enabledHabits) {
        initial[habit.key] = {
          done: false,
          count: habit.hasCount ? habit.defaultCount : undefined,
        };
      }
      setRituals(initial);
    }
    // Reset planning
    setTop3Outcomes([
      { text: "", completed: false },
      { text: "", completed: false },
      { text: "", completed: false },
    ]);
    setPlanning({
      oneThingToShip: "",
      reflectionAm: "",
      primaryVentureFocus: "",
    });
  }, [selectedDate]);

  // Initialize rituals from habit config
  useEffect(() => {
    if (enabledHabits.length > 0 && Object.keys(rituals).length === 0) {
      const initial: Record<string, { done: boolean; count?: number }> = {};
      for (const habit of enabledHabits) {
        initial[habit.key] = {
          done: false,
          count: habit.hasCount ? habit.defaultCount : undefined,
        };
      }
      setRituals(initial);
    }
  }, [enabledHabits]);

  // Load existing data when day data arrives
  useEffect(() => {
    if (dayData && enabledHabits.length > 0) {
      if (dayData.morningRituals) {
        const loaded: Record<string, { done: boolean; count?: number }> = {};
        for (const habit of enabledHabits) {
          const saved = dayData.morningRituals[habit.key];
          if (saved && typeof saved === "object") {
            loaded[habit.key] = {
              done: saved.done || false,
              count: habit.hasCount
                ? (saved.reps ?? saved.pages ?? saved.count ?? habit.defaultCount)
                : undefined,
            };
          } else {
            loaded[habit.key] = {
              done: false,
              count: habit.hasCount ? habit.defaultCount : undefined,
            };
          }
        }
        setRituals(loaded);
      }

      // Load top3Outcomes - handle both array and legacy string format
      const tomorrowPriorities = yesterdayData?.eveningRituals?.tomorrowPriorities;

      if (Array.isArray(dayData.top3Outcomes)) {
        // Already in array format
        setTop3Outcomes(dayData.top3Outcomes);
      } else if (typeof dayData.top3Outcomes === "string" && dayData.top3Outcomes) {
        // Legacy string format - convert to array
        const lines = dayData.top3Outcomes.split("\n").filter(l => l.trim());
        const outcomes = lines.map(line => ({
          text: line.replace(/^\d+\.\s*/, ""), // Remove "1. " prefix
          completed: false,
        }));
        while (outcomes.length < 3) outcomes.push({ text: "", completed: false });
        setTop3Outcomes(outcomes.slice(0, 3));
      } else if (Array.isArray(tomorrowPriorities)) {
        // Sync from yesterday's evening priorities
        const outcomes = tomorrowPriorities.map(p => ({
          text: p || "",
          completed: false,
        }));
        while (outcomes.length < 3) outcomes.push({ text: "", completed: false });
        setTop3Outcomes(outcomes.slice(0, 3));
      }

      // One Thing to Ship: use existing value, or sync Priority #1 from yesterday
      let oneThingToShip = dayData.oneThingToShip || "";
      if (!oneThingToShip && Array.isArray(tomorrowPriorities) && tomorrowPriorities[0]?.trim()) {
        oneThingToShip = tomorrowPriorities[0];
      }

      setPlanning({
        oneThingToShip,
        reflectionAm: dayData.reflectionAm || "",
        primaryVentureFocus: dayData.primaryVentureFocus || "",
      });
    }
  }, [dayData, enabledHabits, yesterdayData]);

  // If no day data exists yet, still try to sync from yesterday's priorities
  useEffect(() => {
    const tomorrowPriorities = yesterdayData?.eveningRituals?.tomorrowPriorities;
    if (!dayData && Array.isArray(tomorrowPriorities)) {
      const priorities = tomorrowPriorities.filter(p => p.trim());
      if (priorities.length > 0) {
        // Check if outcomes are empty
        const hasOutcomes = top3Outcomes.some(o => o.text.trim());
        if (!hasOutcomes) {
          const outcomes = priorities.map(p => ({
            text: p,
            completed: false,
          }));
          while (outcomes.length < 3) outcomes.push({ text: "", completed: false });
          setTop3Outcomes(outcomes.slice(0, 3));
        }
        // Sync Priority #1 to One Thing to Ship
        if (!planning.oneThingToShip && priorities[0]) {
          setPlanning(prev => ({
            ...prev,
            oneThingToShip: priorities[0],
          }));
        }
      }
    }
  }, [dayData, yesterdayData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const dayId = `day_${selectedDate}`;

      // Build morningRituals dynamically from current habits
      const morningRituals: Record<string, any> = {};
      for (const habit of enabledHabits) {
        const ritual = rituals[habit.key];
        if (ritual) {
          morningRituals[habit.key] = {
            done: ritual.done,
            ...(habit.hasCount && habit.countLabel === "reps" && { reps: ritual.count }),
            ...(habit.hasCount && habit.countLabel === "pages" && { pages: ritual.count }),
            ...(habit.hasCount && !["reps", "pages"].includes(habit.countLabel || "") && { count: ritual.count }),
          };
        }
      }

      morningRituals.completedAt = isAllRitualsComplete() ? new Date().toISOString() : undefined;

      // Filter outcomes to only include ones with text
      const filteredOutcomes = top3Outcomes.filter(o => o.text.trim());

      const payload = {
        id: dayId,
        date: selectedDate,
        morningRituals,
        top3Outcomes: filteredOutcomes.length > 0 ? top3Outcomes : null,
        oneThingToShip: planning.oneThingToShip || null,
        reflectionAm: planning.reflectionAm || null,
        primaryVentureFocus: planning.primaryVentureFocus || null,
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
        title: "Saved!",
        description: "Your morning ritual has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleHabit = (key: string) => {
    setRituals(prev => ({
      ...prev,
      [key]: { ...prev[key], done: !prev[key]?.done },
    }));
  };

  const updateCount = (key: string, count: number) => {
    setRituals(prev => ({
      ...prev,
      [key]: { ...prev[key], count },
    }));
  };

  const isAllRitualsComplete = () => {
    return enabledHabits.every(h => rituals[h.key]?.done);
  };

  const completedCount = enabledHabits.filter(h => rituals[h.key]?.done).length;
  const progressPercent = enabledHabits.length > 0 ? (completedCount / enabledHabits.length) * 100 : 0;

  // Outcome helpers
  const updateOutcomeText = (index: number, text: string) => {
    setTop3Outcomes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const toggleOutcomeCompleted = (index: number) => {
    setTop3Outcomes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      return updated;
    });
  };

  const completedOutcomes = top3Outcomes.filter(o => o.completed && o.text.trim()).length;
  const totalOutcomes = top3Outcomes.filter(o => o.text.trim()).length;
  const outcomeProgressPercent = totalOutcomes > 0 ? (completedOutcomes / totalOutcomes) * 100 : 0;

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isDayLoading || isConfigLoading) {
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
          <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full shrink-0">
            <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Morning Ritual</h1>
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
          {isAllRitualsComplete() && enabledHabits.length > 0 && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
          <Button variant="outline" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {enabledHabits.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Morning habits</span>
                <span className="font-medium">{completedCount}/{enabledHabits.length} complete</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Morning Habits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-orange-500" />
              Morning Habits
            </CardTitle>
            <CardDescription>
              Start your day with these essential habits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enabledHabits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No habits configured.</p>
                <Button variant="ghost" asChild className="mt-2">
                  <Link href="/settings">Configure habits in Settings</Link>
                </Button>
              </div>
            ) : (
              enabledHabits.map((habit) => {
                const Icon = getIconComponent(habit.icon);
                const isComplete = rituals[habit.key]?.done;

                return (
                  <div
                    key={habit.key}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isComplete
                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={habit.key}
                        checked={isComplete}
                        onCheckedChange={() => toggleHabit(habit.key)}
                        className="h-5 w-5"
                      />
                      <Icon className={`h-5 w-5 ${isComplete ? "text-green-600" : "text-muted-foreground"}`} />
                      <Label
                        htmlFor={habit.key}
                        className={`cursor-pointer ${isComplete ? "line-through text-muted-foreground" : ""}`}
                      >
                        {habit.label}
                      </Label>
                    </div>

                    {habit.hasCount && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={rituals[habit.key]?.count || ""}
                          onChange={(e) => updateCount(habit.key, parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center"
                          min={0}
                        />
                        <span className="text-sm text-muted-foreground">{habit.countLabel}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Daily Planning */}
        <div className="space-y-6">
          {/* One Thing to Ship */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rocket className="h-5 w-5 text-purple-500" />
                One Thing to Ship Today
              </CardTitle>
              <CardDescription>
                Select a P0/P1 task due today as your main focus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {priorityTasksDueToday.length > 0 ? (
                <Select
                  value={planning.oneThingToShip}
                  onValueChange={(value) => setPlanning({ ...planning, oneThingToShip: value })}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select your one thing to ship..." />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityTasksDueToday.map((task) => (
                      <SelectItem key={task.id} value={task.title}>
                        <span className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              task.priority === "P0"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300"
                                : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300"
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
              ) : (
                <div className="text-sm text-muted-foreground py-3 text-center border rounded-md bg-muted/30">
                  No P0/P1 tasks due {isViewingToday ? "today" : "on this date"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 3 Outcomes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-500" />
                Top 3 Outcomes
                {Array.isArray(yesterdayData?.eveningRituals?.tomorrowPriorities) &&
                  yesterdayData.eveningRituals.tomorrowPriorities.filter(p => p.trim()).length > 0 &&
                  !dayData?.top3Outcomes && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Synced from last night
                    </Badge>
                  )}
              </CardTitle>
              <CardDescription>
                What would make today a win? Check off as you complete them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3Outcomes.map((outcome, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    outcome.completed && outcome.text.trim()
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-muted/30"
                  }`}
                >
                  <Checkbox
                    id={`outcome-${index}`}
                    checked={outcome.completed}
                    onCheckedChange={() => toggleOutcomeCompleted(index)}
                    disabled={!outcome.text.trim()}
                    className="h-5 w-5"
                  />
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    index === 0 ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                    index === 1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {index + 1}
                  </div>
                  <Input
                    placeholder={index === 0 ? "Most important outcome..." : `Outcome ${index + 1}...`}
                    value={outcome.text}
                    onChange={(e) => updateOutcomeText(index, e.target.value)}
                    className={`flex-1 ${outcome.completed ? "line-through text-muted-foreground" : ""}`}
                  />
                </div>
              ))}
              {totalOutcomes > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{completedOutcomes}/{totalOutcomes} complete</span>
                  </div>
                  <Progress value={outcomeProgressPercent} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Venture Focus */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Primary Venture Focus
              </CardTitle>
              <CardDescription>
                Which venture gets your deep work today?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={planning.primaryVentureFocus}
                onValueChange={(value) => setPlanning({ ...planning, primaryVentureFocus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a venture..." />
                </SelectTrigger>
                <SelectContent>
                  {activeVentures.map((venture) => (
                    <SelectItem key={venture.id} value={venture.id}>
                      <span className="flex items-center gap-2">
                        {venture.icon && <span>{venture.icon}</span>}
                        {venture.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Morning Reflection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Morning Intention
          </CardTitle>
          <CardDescription>
            Set your mindset for the day. What energy do you want to bring?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Today I'm grateful for... I'm focused on... I will approach challenges with..."
            value={planning.reflectionAm}
            onChange={(e) => setPlanning({ ...planning, reflectionAm: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ChevronRight className="h-4 w-4 mr-2" />
            Go to Command Center
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/deep-work">
            <ChevronRight className="h-4 w-4 mr-2" />
            Plan Deep Work
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
