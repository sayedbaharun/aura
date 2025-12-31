import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cleanFormData } from "@/lib/utils";

interface QuickLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export default function QuickLogModal({ open, onOpenChange, defaultDate }: QuickLogModalProps) {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const [formData, setFormData] = useState({
    date: defaultDate || today,
    sleepHours: "",
    sleepQuality: "good",
    energyLevel: 3,
    mood: "medium",
    weight: "",
    bodyFat: "",
    stressLevel: "medium",
    notes: "",
  });

  useEffect(() => {
    if (defaultDate) {
      setFormData((prev) => ({ ...prev, date: defaultDate }));
    }
  }, [defaultDate]);

  const createHealthMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/health", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Health entry saved",
      });
      // Reset form
      setFormData({
        date: today,
        sleepHours: "",
        sleepQuality: "good",
        energyLevel: 3,
        mood: "medium",
        weight: "",
        bodyFat: "",
        stressLevel: "medium",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save health entry",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      date: formData.date,
      sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : undefined,
      sleepQuality: formData.sleepQuality,
      energyLevel: formData.energyLevel,
      mood: formData.mood,
      weightKg: formData.weight ? parseFloat(formData.weight) : undefined,
      bodyFatPercent: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      stressLevel: formData.stressLevel,
      notes: formData.notes || undefined,
    };

    // Clean data to only send non-empty values
    const cleanPayload = cleanFormData(payload);

    createHealthMutation.mutate(cleanPayload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Morning Health Log</DialogTitle>
          <DialogDescription>
            Record how you feel this morning. Workouts and steps can be logged in the Evening Review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Sleep */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sleepHours">Sleep Hours (the night before)</Label>
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

          {/* Weight & Body Fat */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="bodyFat">Body Fat %</Label>
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                placeholder="15.0"
                value={formData.bodyFat}
                onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
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
              placeholder="How are you feeling this morning? Any context..."
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
            <Button type="submit" disabled={createHealthMutation.isPending}>
              {createHealthMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
