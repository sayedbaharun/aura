import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
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

interface EditHealthEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: HealthEntry | null;
}

export default function EditHealthEntryModal({ open, onOpenChange, entry }: EditHealthEntryModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: "",
    sleepHours: "",
    sleepQuality: "good",
    energyLevel: 3,
    mood: "medium",
    workoutDone: false,
    workoutType: "none",
    workoutDuration: "",
    steps: "",
    weight: "",
    stressLevel: "medium",
    notes: "",
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        date: entry.date,
        sleepHours: entry.sleepHours?.toString() || "",
        sleepQuality: entry.sleepQuality || "good",
        energyLevel: entry.energyLevel || 3,
        mood: entry.mood || "medium",
        workoutDone: entry.workoutDone || false,
        workoutType: entry.workoutType || "none",
        workoutDuration: entry.workoutDurationMin?.toString() || "",
        steps: entry.steps?.toString() || "",
        weight: entry.weightKg?.toString() || "",
        stressLevel: entry.stressLevel || "medium",
        notes: entry.notes || "",
      });
    }
  }, [entry]);

  const updateHealthMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/health/${entry?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Health entry updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update health entry",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      date: formData.date,
      sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : null,
      sleepQuality: formData.sleepQuality || null,
      energyLevel: formData.energyLevel,
      mood: formData.mood,
      workoutDone: formData.workoutDone,
      workoutType: formData.workoutDone ? formData.workoutType : "none",
      workoutDurationMin: formData.workoutDone && formData.workoutDuration ? parseInt(formData.workoutDuration) : null,
      steps: formData.steps ? parseInt(formData.steps) : null,
      weightKg: formData.weight ? parseFloat(formData.weight) : null,
      stressLevel: formData.stressLevel || null,
      notes: formData.notes || null,
    };

    updateHealthMutation.mutate(payload);
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Health Entry</DialogTitle>
          <DialogDescription>
            Update your health metrics for {entry.date}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              disabled
            />
          </div>

          {/* Sleep */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sleepHours">Sleep Hours</Label>
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

          {/* Energy & Mood */}
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
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="workoutType">Workout Type</Label>
                  <Select
                    value={formData.workoutType}
                    onValueChange={(value) => setFormData({ ...formData, workoutType: value })}
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

          {/* Steps & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="steps">Steps</Label>
              <Input
                id="steps"
                type="number"
                placeholder="10000"
                value={formData.steps}
                onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
              />
            </div>
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
              placeholder="Any additional notes about your day..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateHealthMutation.isPending}>
              {updateHealthMutation.isPending ? "Updating..." : "Update Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
