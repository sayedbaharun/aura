import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Heart, Edit, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface HealthEntry {
  id: string;
  dayId: string;
  date: string;
  sleepHours: number | null;
  sleepQuality: string | null;
  energyLevel: number | null;
  mood: string | null;
  steps: number | null;
  workoutDone: boolean;
  workoutType: string | null;
  workoutDurationMin: number | null;
  weightKg: number | null;
  stressLevel: string | null;
  notes: string | null;
}

export default function HealthSnapshot() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: healthEntries = [], isLoading } = useQuery<HealthEntry[]>({
    queryKey: ["/api/health"],
  });

  const entriesArray = Array.isArray(healthEntries) ? healthEntries : [];
  const todayEntry = entriesArray.find((entry) => entry.date === today);

  const [formData, setFormData] = useState({
    sleepHours: "",
    energyLevel: 3,
    mood: "medium",
    workoutDone: false,
    workoutType: "none",
    workoutSubType: "",
    workoutDuration: "",
  });

  useEffect(() => {
    if (todayEntry) {
      // Parse combined workout type (e.g., "strength_push" -> type: "strength", subType: "push")
      let parsedWorkoutType = todayEntry.workoutType || "none";
      let parsedWorkoutSubType = "";

      if (parsedWorkoutType.includes("_")) {
        const [type, subType] = parsedWorkoutType.split("_");
        parsedWorkoutType = type;
        parsedWorkoutSubType = subType;
      }

      setFormData({
        sleepHours: todayEntry.sleepHours?.toString() || "",
        energyLevel: todayEntry.energyLevel || 3,
        mood: todayEntry.mood || "medium",
        workoutDone: todayEntry.workoutDone || false,
        workoutType: parsedWorkoutType,
        workoutSubType: parsedWorkoutSubType,
        workoutDuration: todayEntry.workoutDurationMin?.toString() || "",
      });
    }
  }, [todayEntry]);

  const createHealthMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/health", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Health entry saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save health entry",
        variant: "destructive",
      });
    },
  });

  const updateHealthMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/health/${todayEntry?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Health entry updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update health entry",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Note: workoutSubType is UI-only; database enum only supports base types
    // The subtype is stored in notes if provided
    const workoutNotes = formData.workoutDone && formData.workoutSubType
      ? `${formData.workoutType} - ${formData.workoutSubType}`
      : undefined;

    const payload = {
      date: today,
      sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : null,
      energyLevel: formData.energyLevel,
      mood: formData.mood,
      workoutDone: formData.workoutDone,
      workoutType: formData.workoutDone ? formData.workoutType : "none",
      workoutDurationMin: formData.workoutDone && formData.workoutDuration ? parseInt(formData.workoutDuration) : null,
      notes: workoutNotes,
    };

    if (todayEntry) {
      updateHealthMutation.mutate(payload);
    } else {
      createHealthMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isEditing && todayEntry) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Health
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sleep</span>
            <span className="font-medium">{todayEntry.sleepHours || "—"} hrs</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Energy</span>
            <span className="font-medium">{todayEntry.energyLevel || "—"}/5</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mood</span>
            <span className="font-medium capitalize">{todayEntry.mood || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Workout</span>
            <span className="font-medium capitalize">
              {todayEntry.workoutDone ? (
                todayEntry.workoutType ?
                  todayEntry.workoutType.replace("_", " - ") : "Done"
              ) : "No"}
              {todayEntry.workoutDone && todayEntry.workoutDurationMin && ` (${todayEntry.workoutDurationMin}min)`}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Health
          </CardTitle>
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={createHealthMutation.isPending || updateHealthMutation.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sleepHours">Sleep (hours)</Label>
          <Input
            id="sleepHours"
            type="number"
            step="0.5"
            placeholder="7.5"
            value={formData.sleepHours}
            onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Energy Level: {formData.energyLevel}/5</Label>
          <Slider
            value={[formData.energyLevel]}
            onValueChange={(value) => setFormData({ ...formData, energyLevel: value[0] })}
            min={1}
            max={5}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mood">Mood</Label>
          <Select value={formData.mood} onValueChange={(value) => setFormData({ ...formData, mood: value })}>
            <SelectTrigger id="mood">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="peak">Peak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="workoutDone"
              checked={formData.workoutDone}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, workoutDone: checked as boolean })
              }
            />
            <Label htmlFor="workoutDone" className="cursor-pointer">
              Workout done
            </Label>
          </div>

          {formData.workoutDone && (
            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <Label htmlFor="workoutType">Workout Type</Label>
                <Select
                  value={formData.workoutType}
                  onValueChange={(value) => setFormData({ ...formData, workoutType: value, workoutSubType: "" })}
                >
                  <SelectTrigger id="workoutType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="sport">Sport</SelectItem>
                    <SelectItem value="walk">Walk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional sub-type for Strength */}
              {formData.workoutType === "strength" && (
                <div className="space-y-2">
                  <Label htmlFor="workoutSubType">Muscle Group</Label>
                  <Select
                    value={formData.workoutSubType}
                    onValueChange={(value) => setFormData({ ...formData, workoutSubType: value })}
                  >
                    <SelectTrigger id="workoutSubType">
                      <SelectValue placeholder="Select muscle group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push</SelectItem>
                      <SelectItem value="pull">Pull</SelectItem>
                      <SelectItem value="legs">Legs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Conditional sub-type for Cardio */}
              {formData.workoutType === "cardio" && (
                <div className="space-y-2">
                  <Label htmlFor="workoutSubType">Cardio Type</Label>
                  <Select
                    value={formData.workoutSubType}
                    onValueChange={(value) => setFormData({ ...formData, workoutSubType: value })}
                  >
                    <SelectTrigger id="workoutSubType">
                      <SelectValue placeholder="Select cardio type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hiit">HIIT</SelectItem>
                      <SelectItem value="zone_2">Zone 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Duration input */}
              <div className="space-y-2">
                <Label htmlFor="workoutDuration">Duration (minutes)</Label>
                <Input
                  id="workoutDuration"
                  type="number"
                  placeholder="45"
                  value={formData.workoutDuration}
                  onChange={(e) => setFormData({ ...formData, workoutDuration: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {!todayEntry && (
          <Button onClick={handleSave} className="w-full" disabled={createHealthMutation.isPending}>
            {createHealthMutation.isPending ? "Saving..." : "Save Health Entry"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
