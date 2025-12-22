import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfISOWeek, endOfISOWeek, getISOWeek, getISOWeekYear, addWeeks, subWeeks } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calendar,
  Target,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trophy,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  Clock,
  Zap,
  Heart,
  Moon,
  Ban,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

interface WeeklyBig3 {
  text: string;
  completed: boolean;
}

interface NotToDoItem {
  item: string;
  reason: string;
  status: "pending" | "honored" | "violated";
}

interface Week {
  id: string;
  weekStart: string;
  weekNumber: number;
  year: number;
  weeklyBig3: WeeklyBig3[] | null;
  primaryVentureFocus: string | null;
  theme: string | null;
  planningNotes: string | null;
  reviewNotes: string | null;
  wins: string[] | null;
  improvements: string[] | null;
  notToDo: NotToDoItem[] | null;
  metrics: {
    tasksCompleted?: number;
    deepWorkHours?: number;
    avgEnergy?: number;
    avgSleep?: number;
  } | null;
}

interface Venture {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  status: string;
}

interface WeekMetrics {
  tasksCompleted: number;
  deepWorkHours: number;
  avgEnergy: number;
  avgSleep: number;
  healthEntriesCount: number;
}

export default function WeeklyPlanning() {
  const { toast } = useToast();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);

  const year = getISOWeekYear(selectedDate);
  const weekNumber = getISOWeek(selectedDate);
  const weekId = `week_${year}-${String(weekNumber).padStart(2, '0')}`;
  const weekStart = startOfISOWeek(selectedDate);
  const weekEnd = endOfISOWeek(selectedDate);

  // Form state
  const [weeklyBig3, setWeeklyBig3] = useState<WeeklyBig3[]>([
    { text: "", completed: false },
    { text: "", completed: false },
    { text: "", completed: false },
  ]);
  const [theme, setTheme] = useState("");
  const [primaryVentureFocus, setPrimaryVentureFocus] = useState("");
  const [planningNotes, setPlanningNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [wins, setWins] = useState<string[]>(["", "", ""]);
  const [improvements, setImprovements] = useState<string[]>(["", ""]);
  const [notToDo, setNotToDo] = useState<NotToDoItem[]>([
    { item: "", reason: "", status: "pending" },
    { item: "", reason: "", status: "pending" },
    { item: "", reason: "", status: "pending" },
  ]);

  // Fetch current week
  const { data: week, isLoading } = useQuery<Week>({
    queryKey: ["/api/weeks", weekId],
    queryFn: async () => {
      // First try to get, then create if not exists
      const res = await fetch(`/api/weeks/${weekId}`, { credentials: "include" });
      if (res.status === 404) {
        // Create the week
        const createRes = await apiRequest("POST", "/api/weeks", { year, weekNumber });
        return await createRes.json();
      }
      if (!res.ok) throw new Error("Failed to fetch week");
      return await res.json();
    },
  });

  // Fetch metrics
  const { data: metrics } = useQuery<WeekMetrics>({
    queryKey: ["/api/weeks", weekId, "metrics"],
    queryFn: async () => {
      const res = await fetch(`/api/weeks/${weekId}/metrics`, { credentials: "include" });
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!week,
  });

  // Fetch ventures
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const activeVentures = Array.isArray(ventures) ? ventures.filter(v => v.status !== "archived") : [];

  // Load week data into form
  useEffect(() => {
    if (week) {
      if (week.weeklyBig3 && week.weeklyBig3.length > 0) {
        setWeeklyBig3(week.weeklyBig3);
      } else {
        setWeeklyBig3([
          { text: "", completed: false },
          { text: "", completed: false },
          { text: "", completed: false },
        ]);
      }
      setTheme(week.theme || "");
      setPrimaryVentureFocus(week.primaryVentureFocus || "");
      setPlanningNotes(week.planningNotes || "");
      setReviewNotes(week.reviewNotes || "");
      setWins(week.wins && week.wins.length > 0 ? week.wins : ["", "", ""]);
      setImprovements(week.improvements && week.improvements.length > 0 ? week.improvements : ["", ""]);
      setNotToDo(week.notToDo && week.notToDo.length > 0 ? week.notToDo : [
        { item: "", reason: "", status: "pending" },
        { item: "", reason: "", status: "pending" },
        { item: "", reason: "", status: "pending" },
      ]);
    }
  }, [week]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        weeklyBig3: weeklyBig3.filter(b => b.text.trim()),
        theme: theme || null,
        primaryVentureFocus: primaryVentureFocus || null,
        planningNotes: planningNotes || null,
        reviewNotes: reviewNotes || null,
        wins: wins.filter(w => w.trim()),
        improvements: improvements.filter(i => i.trim()),
        notToDo: notToDo.filter(n => n.item.trim()),
      };

      const res = await apiRequest("PATCH", `/api/weeks/${weekId}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weeks"] });
      toast({
        title: "Week saved",
        description: "Your weekly plan has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save weekly plan.",
        variant: "destructive",
      });
    },
  });

  const goToPreviousWeek = () => {
    setSelectedDate(subWeeks(selectedDate, 1));
  };

  const goToNextWeek = () => {
    setSelectedDate(addWeeks(selectedDate, 1));
  };

  const goToThisWeek = () => {
    setSelectedDate(today);
  };

  const updateBig3 = (index: number, field: keyof WeeklyBig3, value: any) => {
    const updated = [...weeklyBig3];
    updated[index] = { ...updated[index], [field]: value };
    setWeeklyBig3(updated);
  };

  const updateNotToDo = (index: number, field: keyof NotToDoItem, value: any) => {
    const updated = [...notToDo];
    updated[index] = { ...updated[index], [field]: value };
    setNotToDo(updated);
  };

  const addNotToDoItem = () => {
    setNotToDo([...notToDo, { item: "", reason: "", status: "pending" }]);
  };

  const removeNotToDoItem = (index: number) => {
    if (notToDo.length > 1) {
      setNotToDo(notToDo.filter((_, i) => i !== index));
    }
  };

  const completedBig3 = weeklyBig3.filter(b => b.completed && b.text.trim()).length;
  const totalBig3 = weeklyBig3.filter(b => b.text.trim()).length;
  const progressPercent = totalBig3 > 0 ? (completedBig3 / totalBig3) * 100 : 0;

  const isCurrentWeek = getISOWeek(today) === weekNumber && getISOWeekYear(today) === year;
  const isSunday = today.getDay() === 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="space-y-6">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full shrink-0">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Weekly Planning</h1>
            <p className="text-sm text-muted-foreground">
              Week {weekNumber}, {year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isCurrentWeek && (
            <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
              Current Week
            </Badge>
          )}
          {isSunday && isCurrentWeek && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <Moon className="h-3 w-3 mr-1" />
              Planning Night
            </Badge>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <p className="font-medium">
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </p>
              <Button variant="link" size="sm" onClick={goToThisWeek} className="text-muted-foreground">
                Go to this week
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {totalBig3 > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Weekly Big 3 Progress</span>
                <span className="font-medium">{completedBig3}/{totalBig3} complete</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics (if available) */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{metrics.tasksCompleted}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{metrics.deepWorkHours}h</p>
              <p className="text-xs text-muted-foreground">Deep Work</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Zap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{metrics.avgEnergy || "–"}</p>
              <p className="text-xs text-muted-foreground">Avg Energy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Heart className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{metrics.avgSleep || "–"}h</p>
              <p className="text-xs text-muted-foreground">Avg Sleep</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Big 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              Weekly Big 3
            </CardTitle>
            <CardDescription>
              Three major outcomes you want to achieve this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weeklyBig3.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <Checkbox
                  id={`big3-${index}`}
                  checked={item.completed}
                  onCheckedChange={(checked) => updateBig3(index, "completed", checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Input
                    placeholder={`Outcome ${index + 1}...`}
                    value={item.text}
                    onChange={(e) => updateBig3(index, "text", e.target.value)}
                    className={item.completed ? "line-through text-muted-foreground" : ""}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Week Theme & Focus */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Week Theme
              </CardTitle>
              <CardDescription>
                What's the intention or focus for this week?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g., Shipping week, Health focus, Deep work..."
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Primary Venture Focus
              </CardTitle>
              <CardDescription>
                Which venture gets priority this week?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={primaryVentureFocus}
                onValueChange={setPrimaryVentureFocus}
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

      {/* Not-To-Do List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-500" />
            Not-To-Do This Week
          </CardTitle>
          <CardDescription>
            Things you commit to avoiding or eliminating this week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notToDo.map((item, index) => (
            <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder={`I will NOT...`}
                    value={item.item}
                    onChange={(e) => updateNotToDo(index, "item", e.target.value)}
                    className="font-medium"
                  />
                  <Input
                    placeholder="Reason (why is this important to avoid?)"
                    value={item.reason}
                    onChange={(e) => updateNotToDo(index, "reason", e.target.value)}
                    className="text-sm text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {/* Status buttons */}
                  <div className="flex gap-1">
                    <Button
                      variant={item.status === "honored" ? "default" : "outline"}
                      size="icon"
                      className={`h-8 w-8 ${item.status === "honored" ? "bg-green-600 hover:bg-green-700" : ""}`}
                      onClick={() => updateNotToDo(index, "status", item.status === "honored" ? "pending" : "honored")}
                      title="Mark as honored"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={item.status === "violated" ? "default" : "outline"}
                      size="icon"
                      className={`h-8 w-8 ${item.status === "violated" ? "bg-red-600 hover:bg-red-700" : ""}`}
                      onClick={() => updateNotToDo(index, "status", item.status === "violated" ? "pending" : "violated")}
                      title="Mark as violated"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeNotToDoItem(index)}
                    disabled={notToDo.length <= 1}
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {item.status !== "pending" && (
                <Badge
                  variant={item.status === "honored" ? "default" : "destructive"}
                  className={item.status === "honored" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                >
                  {item.status === "honored" ? "✓ Honored" : "✗ Violated"}
                </Badge>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addNotToDoItem}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Not-To-Do Item
          </Button>
        </CardContent>
      </Card>

      {/* Planning Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Planning Notes
          </CardTitle>
          <CardDescription>
            Sunday planning session thoughts, priorities, and intentions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="What do you want to accomplish? What's important? Any blockers to address?"
            value={planningNotes}
            onChange={(e) => setPlanningNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* End of Week Review */}
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        End of Week Review
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400">What Went Well</CardTitle>
            <CardDescription>Celebrate your wins this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {wins.map((win, index) => (
              <Input
                key={index}
                placeholder={`Win ${index + 1}...`}
                value={win}
                onChange={(e) => {
                  const updated = [...wins];
                  updated[index] = e.target.value;
                  setWins(updated);
                }}
              />
            ))}
          </CardContent>
        </Card>

        {/* Improvements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-400">What to Improve</CardTitle>
            <CardDescription>What would you do differently?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {improvements.map((item, index) => (
              <Input
                key={index}
                placeholder={`Improvement ${index + 1}...`}
                value={item}
                onChange={(e) => {
                  const updated = [...improvements];
                  updated[index] = e.target.value;
                  setImprovements(updated);
                }}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Review Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Review Notes</CardTitle>
          <CardDescription>
            End of week reflection and lessons learned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How did the week go? What did you learn? What patterns do you notice?"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            Back to Command Center
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/deep-work">
            Plan Deep Work
          </Link>
        </Button>
      </div>
    </div>
  );
}
