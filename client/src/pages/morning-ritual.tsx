import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sun,
  Dumbbell,
  Pill,
  BookOpen,
  Target,
  Rocket,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

interface Venture {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  status: string;
}

interface Day {
  id: string;
  date: string;
  title: string | null;
  top3Outcomes: string | null;
  oneThingToShip: string | null;
  reflectionAm: string | null;
  mood: string | null;
  primaryVentureFocus: string | null;
  morningRituals: {
    pressUps?: { done: boolean; reps?: number };
    squats?: { done: boolean; reps?: number };
    supplements?: { done: boolean };
    reading?: { done: boolean; pages?: number };
    completedAt?: string;
  } | null;
}

const HABITS = [
  {
    key: "pressUps",
    label: "Press-ups",
    icon: Dumbbell,
    hasCount: true,
    countLabel: "reps",
    defaultCount: 50
  },
  {
    key: "squats",
    label: "Squats",
    icon: Dumbbell,
    hasCount: true,
    countLabel: "reps",
    defaultCount: 50
  },
  {
    key: "supplements",
    label: "Supplements",
    icon: Pill,
    hasCount: false
  },
  {
    key: "reading",
    label: "Read 10 pages",
    icon: BookOpen,
    hasCount: true,
    countLabel: "pages",
    defaultCount: 10
  },
];

export default function MorningRitual() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const [rituals, setRituals] = useState<Record<string, { done: boolean; count?: number }>>({
    pressUps: { done: false, count: 50 },
    squats: { done: false, count: 50 },
    supplements: { done: false },
    reading: { done: false, count: 10 },
  });

  const [planning, setPlanning] = useState({
    top3Outcomes: "",
    oneThingToShip: "",
    reflectionAm: "",
    primaryVentureFocus: "",
  });

  // Fetch today's day data
  const { data: dayData, isLoading: isDayLoading } = useQuery<Day>({
    queryKey: ["/api/days", today],
    queryFn: async () => {
      const res = await fetch(`/api/days/${today}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch day");
      return await res.json();
    },
  });

  // Fetch ventures for focus selection
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const activeVentures = ventures.filter(v => v.status === "active" || v.status === "development");

  // Load existing data when day data arrives
  useEffect(() => {
    if (dayData) {
      if (dayData.morningRituals) {
        const loaded: Record<string, { done: boolean; count?: number }> = {};
        for (const habit of HABITS) {
          const saved = dayData.morningRituals[habit.key as keyof typeof dayData.morningRituals];
          if (saved && typeof saved === "object") {
            loaded[habit.key] = {
              done: saved.done || false,
              count: habit.hasCount ? ((saved as any).reps || (saved as any).pages || habit.defaultCount) : undefined,
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

      setPlanning({
        top3Outcomes: dayData.top3Outcomes || "",
        oneThingToShip: dayData.oneThingToShip || "",
        reflectionAm: dayData.reflectionAm || "",
        primaryVentureFocus: dayData.primaryVentureFocus || "",
      });
    }
  }, [dayData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const dayId = `day_${today}`;
      const morningRituals = {
        pressUps: { done: rituals.pressUps.done, reps: rituals.pressUps.count },
        squats: { done: rituals.squats.done, reps: rituals.squats.count },
        supplements: { done: rituals.supplements.done },
        reading: { done: rituals.reading.done, pages: rituals.reading.count },
        completedAt: isAllRitualsComplete() ? new Date().toISOString() : undefined,
      };

      const payload = {
        id: dayId,
        date: today,
        morningRituals,
        top3Outcomes: planning.top3Outcomes || null,
        oneThingToShip: planning.oneThingToShip || null,
        reflectionAm: planning.reflectionAm || null,
        primaryVentureFocus: planning.primaryVentureFocus || null,
      };

      // Try PATCH first, then POST if day doesn't exist
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
      [key]: { ...prev[key], done: !prev[key].done },
    }));
  };

  const updateCount = (key: string, count: number) => {
    setRituals(prev => ({
      ...prev,
      [key]: { ...prev[key], count },
    }));
  };

  const isAllRitualsComplete = () => {
    return HABITS.every(h => rituals[h.key]?.done);
  };

  const completedCount = HABITS.filter(h => rituals[h.key]?.done).length;
  const progressPercent = (completedCount / HABITS.length) * 100;

  const handleSave = () => {
    saveMutation.mutate({});
  };

  if (isDayLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Sun className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Morning Ritual</h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAllRitualsComplete() && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Morning habits</span>
              <span className="font-medium">{completedCount}/{HABITS.length} complete</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

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
            {HABITS.map((habit) => {
              const Icon = habit.icon;
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
            })}
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
                What's the single most important thing you must accomplish?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g., Launch the new feature to production"
                value={planning.oneThingToShip}
                onChange={(e) => setPlanning({ ...planning, oneThingToShip: e.target.value })}
                className="text-lg"
              />
            </CardContent>
          </Card>

          {/* Top 3 Outcomes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-500" />
                Top 3 Outcomes
              </CardTitle>
              <CardDescription>
                What would make today a win?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="1. Complete client proposal&#10;2. Review team PRs&#10;3. Exercise for 30 minutes"
                value={planning.top3Outcomes}
                onChange={(e) => setPlanning({ ...planning, top3Outcomes: e.target.value })}
                rows={4}
              />
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
          <Link href="/">
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
          <Link href="/health">
            <ChevronRight className="h-4 w-4 mr-2" />
            Log Health
          </Link>
        </Button>
      </div>
    </div>
  );
}
