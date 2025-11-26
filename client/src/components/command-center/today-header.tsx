import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
      const res = await apiRequest("PATCH", `/api/days/${day?.date}`, data);
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
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* One Thing to Ship - Hero */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-primary">🎯 One Thing to Ship Today</label>
            {!isEditingOneThingToShip ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOneThingValue(day.oneThingToShip || "");
                  setIsEditingOneThingToShip(true);
                }}
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
            <p className="text-lg font-semibold">
              {day.oneThingToShip || "Not set - what will you ship?"}
            </p>
          )}
        </div>

        {/* Top 3 Outcomes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Top 3 Outcomes</label>
            {!isEditingTop3 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTop3Value(day.top3Outcomes || "");
                  setIsEditingTop3(true);
                }}
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
          {isEditingTop3 ? (
            <Textarea
              value={top3Value}
              onChange={(e) => setTop3Value(e.target.value)}
              placeholder="1. First outcome&#10;2. Second outcome&#10;3. Third outcome"
              rows={4}
              onBlur={handleSaveTop3}
              autoFocus
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
              {day.top3Outcomes || "No outcomes set"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
