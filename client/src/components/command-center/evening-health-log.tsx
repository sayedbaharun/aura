import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Moon, Edit, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

export default function EveningHealthLog() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: healthEntries = [], isLoading } = useQuery<HealthEntry[]>({
    queryKey: ["/api/health"],
  });

  const entriesArray = Array.isArray(healthEntries) ? healthEntries : [];
  const todayEntry = entriesArray.find((entry) => entry.date === today);

  const [formData, setFormData] = useState({
    workoutDone: false,
    workoutType: "none",
    workoutSubType: "",
    workoutDuration: "",
    steps: "",
    stressLevel: "medium",
    notes: "",
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
        workoutDone: todayEntry.workoutDone || false,
        workoutType: parsedWorkoutType,
        workoutSubType: parsedWorkoutSubType,
        workoutDuration: todayEntry.workoutDurationMin?.toString() || "",
        steps: todayEntry.steps?.toString() || "",
        stressLevel: todayEntry.stressLevel || "medium",
        notes: todayEntry.notes || "",
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
        title: "Evening log saved",
        description: "Your evening health metrics have been recorded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save evening log",
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
        title: "Evening log updated",
        description: "Your evening health metrics have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update evening log",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Append subtype info to notes if provided
    let notes = formData.notes || "";
    if (formData.workoutDone && formData.workoutSubType) {
      const subtypeInfo = `Workout: ${formData.workoutType} - ${formData.workoutSubType}`;
      // Only prepend if not already there
      if (!notes.includes(subtypeInfo)) {
        notes = notes ? `${subtypeInfo}\n${notes}` : subtypeInfo;
      }
    }

    const payload = {
      date: today,
      workoutDone: formData.workoutDone,
      workoutType: formData.workoutDone ? formData.workoutType : "none",
      workoutDurationMin: formData.workoutDone && formData.workoutDuration ? parseInt(formData.workoutDuration) : null,
      steps: formData.steps ? parseInt(formData.steps) : null,
      stressLevel: formData.stressLevel,
      notes: notes || null,
    };

    if (todayEntry) {
      updateHealthMutation.mutate(payload);
    } else {
      createHealthMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    if (todayEntry) {
      let parsedWorkoutType = todayEntry.workoutType || "none";
      let parsedWorkoutSubType = "";

      if (parsedWorkoutType.includes("_")) {
        const [type, subType] = parsedWorkoutType.split("_");
        parsedWorkoutType = type;
        parsedWorkoutSubType = subType;
      }

      setFormData({
        workoutDone: todayEntry.workoutDone || false,
        workoutType: parsedWorkoutType,
        workoutSubType: parsedWorkoutSubType,
        workoutDuration: todayEntry.workoutDurationMin?.toString() || "",
        steps: todayEntry.steps?.toString() || "",
        stressLevel: todayEntry.stressLevel || "medium",
        notes: todayEntry.notes || "",
      });
    }
    setIsEditing(false);
  };

  const getStressLabel = (stress: string) => {
    switch (stress) {
      case "low": return "Low";
      case "medium": return "Medium";
      case "high": return "High";
      default: return "—";
    }
  };

  const getWorkoutLabel = (entry: HealthEntry) => {
    if (!entry.workoutDone) return "No workout";
    const type = entry.workoutType?.replace("_", " - ") || "Done";
    const duration = entry.workoutDurationMin ? ` (${entry.workoutDurationMin}min)` : "";
    return `${type}${duration}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Evening Wrap-up
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

  // View mode with existing entry
  if (!isEditing && todayEntry && (todayEntry.workoutDone !== undefined || todayEntry.steps || todayEntry.stressLevel)) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Evening Wrap-up
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Workout</span>
              <p className="font-medium capitalize">{getWorkoutLabel(todayEntry)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Steps</span>
              <p className="font-medium">{todayEntry.steps?.toLocaleString() || "—"}</p>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Stress Level</span>
            <p className="font-medium">{getStressLabel(todayEntry.stressLevel || "")}</p>
          </div>
          {todayEntry.notes && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Notes</span>
              <p className="text-sm text-muted-foreground">{todayEntry.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit/Create mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Evening Wrap-up
            </CardTitle>
            <CardDescription>How was your day? Log your activity.</CardDescription>
          </div>
          {isEditing && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={createHealthMutation.isPending || updateHealthMutation.isPending}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workout */}
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
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="at_home">At Home</SelectItem>
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
              </div>

              {/* Duration */}
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

        {/* Steps */}
        <div className="space-y-2">
          <Label htmlFor="steps">Daily Steps</Label>
          <Input
            id="steps"
            type="number"
            placeholder="10000"
            value={formData.steps}
            onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
          />
        </div>

        {/* Stress Level */}
        <div className="space-y-2">
          <Label htmlFor="stressLevel">Stress Level</Label>
          <Select value={formData.stressLevel} onValueChange={(value) => setFormData({ ...formData, stressLevel: value })}>
            <SelectTrigger id="stressLevel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="How was your day? Any reflections..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        {!todayEntry && (
          <Button onClick={handleSave} className="w-full" disabled={createHealthMutation.isPending}>
            {createHealthMutation.isPending ? "Saving..." : "Save Evening Wrap-up"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
