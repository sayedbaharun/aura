import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sun, Edit, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function MorningHealthLog() {
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
    sleepQuality: "good",
    energyLevel: 3,
    mood: "medium",
    weight: "",
  });

  useEffect(() => {
    if (todayEntry) {
      setFormData({
        sleepHours: todayEntry.sleepHours?.toString() || "",
        sleepQuality: todayEntry.sleepQuality || "good",
        energyLevel: todayEntry.energyLevel || 3,
        mood: todayEntry.mood || "medium",
        weight: todayEntry.weightKg?.toString() || "",
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
        title: "Morning log saved",
        description: "Your morning health metrics have been recorded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save morning log",
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
        title: "Morning log updated",
        description: "Your morning health metrics have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update morning log",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const payload = {
      date: today,
      sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : null,
      sleepQuality: formData.sleepQuality,
      energyLevel: formData.energyLevel,
      mood: formData.mood,
      weightKg: formData.weight ? parseFloat(formData.weight) : null,
    };

    if (todayEntry) {
      updateHealthMutation.mutate(payload);
    } else {
      createHealthMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    if (todayEntry) {
      setFormData({
        sleepHours: todayEntry.sleepHours?.toString() || "",
        sleepQuality: todayEntry.sleepQuality || "good",
        energyLevel: todayEntry.energyLevel || 3,
        mood: todayEntry.mood || "medium",
        weight: todayEntry.weightKg?.toString() || "",
      });
    }
    setIsEditing(false);
  };

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case "low": return "😔";
      case "medium": return "😐";
      case "high": return "😊";
      case "peak": return "🤩";
      default: return "—";
    }
  };

  const getSleepQualityLabel = (quality: string) => {
    switch (quality) {
      case "poor": return "Poor";
      case "fair": return "Fair";
      case "good": return "Good";
      case "excellent": return "Excellent";
      default: return "—";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Morning Check-in
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
  if (!isEditing && todayEntry && (todayEntry.sleepHours || todayEntry.energyLevel || todayEntry.mood)) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Morning Check-in
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Sleep</span>
              <p className="font-medium">{todayEntry.sleepHours || "—"} hrs</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Quality</span>
              <p className="font-medium">{getSleepQualityLabel(todayEntry.sleepQuality || "")}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Energy</span>
              <p className="font-medium">{todayEntry.energyLevel || "—"}/5</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Mood</span>
              <p className="font-medium">{getMoodEmoji(todayEntry.mood || "")} {todayEntry.mood || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Weight</span>
              <p className="font-medium">{todayEntry.weightKg ? `${todayEntry.weightKg} kg` : "—"}</p>
            </div>
          </div>
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
              <Sun className="h-5 w-5" />
              Morning Check-in
            </CardTitle>
            <CardDescription>How did you sleep? How are you feeling?</CardDescription>
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
        {/* Sleep */}
        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="sleepQuality">Sleep Quality</Label>
            <Select value={formData.sleepQuality} onValueChange={(value) => setFormData({ ...formData, sleepQuality: value })}>
              <SelectTrigger id="sleepQuality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Energy Level */}
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

        {/* Mood */}
        <div className="space-y-2">
          <Label htmlFor="mood">Mood</Label>
          <Select value={formData.mood} onValueChange={(value) => setFormData({ ...formData, mood: value })}>
            <SelectTrigger id="mood">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">😔 Low</SelectItem>
              <SelectItem value="medium">😐 Medium</SelectItem>
              <SelectItem value="high">😊 High</SelectItem>
              <SelectItem value="peak">🤩 Peak</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="75.0"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
          />
        </div>

        {!todayEntry && (
          <Button onClick={handleSave} className="w-full" disabled={createHealthMutation.isPending}>
            {createHealthMutation.isPending ? "Saving..." : "Save Morning Check-in"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
