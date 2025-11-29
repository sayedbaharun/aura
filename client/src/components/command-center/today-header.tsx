import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Save, ListTodo, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TaskPicker from "./task-picker";

interface Day {
  id: string;
  date: string;
  title: string | null;
  top3Outcomes: string | null;
  oneThingToShip: string | null;
  reflectionAm: string | null;
  reflectionPm: string | null;
  mood: string | null;
  primaryVentureFocus: string | null;
  eveningRituals?: {
    reviewCompleted?: boolean;
    journalEntry?: string;
    gratitude?: string[];
    tomorrowPriorities?: string[];
    completedAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TodayHeaderProps {
  showReflection?: boolean;
}

export default function TodayHeader({ showReflection = false }: TodayHeaderProps) {
  const { toast } = useToast();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingTop3, setIsEditingTop3] = useState(false);
  const [isEditingOneThingToShip, setIsEditingOneThingToShip] = useState(false);
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [isEditingGratitude, setIsEditingGratitude] = useState(false);

  const [titleValue, setTitleValue] = useState("");
  const [top3Value, setTop3Value] = useState("");
  const [oneThingValue, setOneThingValue] = useState("");
  const [reflectionValue, setReflectionValue] = useState("");
  const [gratitudeValue, setGratitudeValue] = useState("");

  const { data: day, isLoading } = useQuery<Day>({
    queryKey: ["/api/days/today"],
  });

  const updateDayMutation = useMutation({
    mutationFn: async (data: Partial<Day>) => {
      // Use the date directly (it's already in YYYY-MM-DD format)
      const dateStr = day?.date || format(new Date(), 'yyyy-MM-dd');
      const res = await apiRequest("PATCH", `/api/days/${dateStr}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/days/today"] });
      toast({
        title: "Success",
        description: "Day updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update day",
        variant: "destructive",
      });
    },
  });

  const handleSaveTitle = () => {
    updateDayMutation.mutate({ title: titleValue });
    setIsEditingTitle(false);
  };

  const handleSaveTop3 = () => {
    updateDayMutation.mutate({ top3Outcomes: top3Value });
    setIsEditingTop3(false);
  };

  const handleSaveOneThingToShip = () => {
    updateDayMutation.mutate({ oneThingToShip: oneThingValue });
    setIsEditingOneThingToShip(false);
  };

  const handleSaveReflection = () => {
    updateDayMutation.mutate({ reflectionPm: reflectionValue });
    setIsEditingReflection(false);
  };

  const handleSaveGratitude = () => {
    const gratitudeArray = gratitudeValue.split("\n").filter(g => g.trim());
    updateDayMutation.mutate({
      eveningRituals: {
        ...(day?.eveningRituals || {}),
        gratitude: gratitudeArray,
      }
    });
    setIsEditingGratitude(false);
  };

  // Parse top3Outcomes from newline-separated string to array
  const parseTop3 = (value: string | null): string[] => {
    if (!value) return [];
    return value.split("\n").filter(item => item.trim());
  };

  // Convert array back to newline-separated string
  const formatTop3 = (items: string[]): string => {
    return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  };

  // Handle task picker selection for Top 3 (Today's Focus)
  const handleTop3TaskSelect = (tasks: string[]) => {
    const formatted = formatTop3(tasks);
    updateDayMutation.mutate({ top3Outcomes: formatted });
  };

  // Handle task picker selection for One Thing to Ship
  const handleOneThingSelect = (tasks: string[]) => {
    const selected = tasks[0] || "";
    updateDayMutation.mutate({ oneThingToShip: selected });
  };

  // Get current selections for task pickers
  const getCurrentTop3Tasks = (): string[] => {
    if (!day?.top3Outcomes) return [];
    // Remove numbering prefix if present (e.g., "1. Task name" -> "Task name")
    return day.top3Outcomes.split("\n")
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .filter(line => line);
  };

  const getCurrentOneThingTask = (): string[] => {
    return day?.oneThingToShip ? [day.oneThingToShip] : [];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-8 bg-muted animate-pulse rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 bg-muted animate-pulse rounded"></div>
          <div className="h-24 bg-muted animate-pulse rounded"></div>
          <div className="h-10 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!day) {
    return null;
  }

  const formattedDate = format(new Date(day.date), "EEEE, MMMM d, yyyy");

  // Evening Reflection Mode
  if (showReflection) {
    const gratitude = day.eveningRituals?.gratitude || [];
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evening Reflection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gratitude */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">3 Things I'm Grateful For</label>
              {!isEditingGratitude ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGratitudeValue(gratitude.join("\n"));
                    setIsEditingGratitude(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveGratitude}
                  disabled={updateDayMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
            {isEditingGratitude ? (
              <Textarea
                value={gratitudeValue}
                onChange={(e) => setGratitudeValue(e.target.value)}
                placeholder="1. Something I'm grateful for...&#10;2. Another thing...&#10;3. And one more..."
                rows={3}
                onBlur={handleSaveGratitude}
                autoFocus
              />
            ) : (
              <div className="space-y-1">
                {gratitude.length > 0 ? (
                  gratitude.map((item: string, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {i + 1}. {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No gratitude logged</p>
                )}
              </div>
            )}
          </div>

          {/* Evening Reflection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">How Did Today Go?</label>
              {!isEditingReflection ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReflectionValue(day.reflectionPm || "");
                    setIsEditingReflection(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveReflection}
                  disabled={updateDayMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
            {isEditingReflection ? (
              <Textarea
                value={reflectionValue}
                onChange={(e) => setReflectionValue(e.target.value)}
                placeholder="What went well? What could be better? What did I learn?"
                rows={4}
                onBlur={handleSaveReflection}
                autoFocus
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                {day.reflectionPm || "No reflection yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Morning/Planning Mode (default)
  const currentTop3 = getCurrentTop3Tasks();
  const currentOneThing = getCurrentOneThingTask();

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* One Thing to Ship - Hero */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-primary">One Thing to Ship Today</label>
            <div className="flex items-center gap-1">
              <TaskPicker
                selectedTasks={currentOneThing}
                onSelect={handleOneThingSelect}
                maxSelections={1}
                priorityFilter={["P0", "P1"]}
                triggerLabel="Pick Task"
                dialogTitle="Pick One Thing to Ship (P0/P1)"
                placeholder="Search P0/P1 tasks..."
              />
              {!isEditingOneThingToShip ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOneThingValue(day.oneThingToShip || "");
                    setIsEditingOneThingToShip(true);
                  }}
                  title="Manual entry"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveOneThingToShip}
                  disabled={updateDayMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isEditingOneThingToShip ? (
            <Input
              value={oneThingValue}
              onChange={(e) => setOneThingValue(e.target.value)}
              placeholder="What's the one thing that would make today a success?"
              onBlur={handleSaveOneThingToShip}
              autoFocus
              className="text-lg font-semibold"
            />
          ) : (
            <div className="flex items-center gap-2">
              {day.oneThingToShip ? (
                <>
                  <p className="text-lg font-semibold flex-1">{day.oneThingToShip}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => updateDayMutation.mutate({ oneThingToShip: "" })}
                    title="Clear"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">
                  Not set - pick a P0/P1 task to ship
                </p>
              )}
            </div>
          )}
        </div>

        {/* Top 3 Outcomes / Today's Focus */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Today's Focus (3 Tasks)</label>
            <div className="flex items-center gap-1">
              <TaskPicker
                selectedTasks={currentTop3}
                onSelect={handleTop3TaskSelect}
                maxSelections={3}
                triggerLabel="Pick Tasks"
                dialogTitle="Pick 3 Tasks for Today's Focus"
                placeholder="Search tasks..."
              />
              {!isEditingTop3 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTop3Value(day.top3Outcomes || "");
                    setIsEditingTop3(true);
                  }}
                  title="Manual entry"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveTop3}
                  disabled={updateDayMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isEditingTop3 ? (
            <Textarea
              value={top3Value}
              onChange={(e) => setTop3Value(e.target.value)}
              placeholder="1. First task&#10;2. Second task&#10;3. Third task"
              rows={4}
              onBlur={handleSaveTop3}
              autoFocus
            />
          ) : (
            <div className="space-y-2">
              {currentTop3.length > 0 ? (
                currentTop3.map((task, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {i + 1}
                    </Badge>
                    <span className="text-sm">{task}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No focus tasks set - pick 3 tasks to work on today
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
