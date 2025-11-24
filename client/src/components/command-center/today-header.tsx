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
  createdAt: string;
  updatedAt: string;
}

export default function TodayHeader() {
  const { toast } = useToast();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingTop3, setIsEditingTop3] = useState(false);
  const [isEditingOneThingToShip, setIsEditingOneThingToShip] = useState(false);

  const [titleValue, setTitleValue] = useState("");
  const [top3Value, setTop3Value] = useState("");
  const [oneThingValue, setOneThingValue] = useState("");

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{formattedDate}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Day Title</label>
            {!isEditingTitle ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTitleValue(day.title || "");
                  setIsEditingTitle(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveTitle}
                disabled={updateDayMutation.isPending}
              >
                <Save className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isEditingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Enter day title..."
              onBlur={handleSaveTitle}
              autoFocus
            />
          ) : (
            <p className="text-lg font-semibold">
              {day.title || "Untitled Day"}
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

        {/* One Thing to Ship */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">One Thing to Ship</label>
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
              placeholder="What's the one thing you want to ship today?"
              onBlur={handleSaveOneThingToShip}
              autoFocus
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {day.oneThingToShip || "Not set"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
