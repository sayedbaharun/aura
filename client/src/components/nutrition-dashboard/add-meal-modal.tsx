import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AddMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MEAL_TAGS = ["clean", "high_protein", "cheat", "meal_prep", "eating_out", "healthy"];
const CONTEXTS = [
  { value: "home", label: "Home" },
  { value: "restaurant", label: "Restaurant" },
  { value: "office", label: "Office" },
  { value: "travel", label: "Travel" },
];

export default function AddMealModal({ open, onOpenChange }: AddMealModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
    mealType: "breakfast",
    description: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatsG: "",
    context: "home",
    tags: [] as string[],
    notes: "",
  });

  const createMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nutrition", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition"] });
      onOpenChange(false);
      resetForm();
      toast({
        title: "Success",
        description: "Meal logged successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log meal",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      time: format(new Date(), "HH:mm"),
      mealType: "breakfast",
      description: "",
      calories: "",
      proteinG: "",
      carbsG: "",
      fatsG: "",
      context: "home",
      tags: [],
      notes: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.description) {
      toast({
        title: "Error",
        description: "Please enter a meal description",
        variant: "destructive",
      });
      return;
    }

    const datetime = new Date(`${formData.date}T${formData.time}`).toISOString();

    const payload = {
      datetime,
      mealType: formData.mealType,
      description: formData.description,
      calories: formData.calories ? parseFloat(formData.calories) : null,
      proteinG: formData.proteinG ? parseFloat(formData.proteinG) : null,
      carbsG: formData.carbsG ? parseFloat(formData.carbsG) : null,
      fatsG: formData.fatsG ? parseFloat(formData.fatsG) : null,
      context: formData.context,
      tags: formData.tags.length > 0 ? formData.tags : null,
      notes: formData.notes || null,
    };

    createMealMutation.mutate(payload);
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Meal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          {/* Meal Type */}
          <div className="space-y-2">
            <Label htmlFor="mealType">Meal Type</Label>
            <Select value={formData.mealType} onValueChange={(value) => setFormData({ ...formData, mealType: value })}>
              <SelectTrigger id="mealType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="e.g., Grilled chicken with quinoa and vegetables"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Macros */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calories (kcal)</Label>
              <Input
                id="calories"
                type="number"
                step="0.1"
                placeholder="450"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proteinG">Protein (g)</Label>
              <Input
                id="proteinG"
                type="number"
                step="0.1"
                placeholder="28"
                value={formData.proteinG}
                onChange={(e) => setFormData({ ...formData, proteinG: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbsG">Carbs (g)</Label>
              <Input
                id="carbsG"
                type="number"
                step="0.1"
                placeholder="35"
                value={formData.carbsG}
                onChange={(e) => setFormData({ ...formData, carbsG: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatsG">Fats (g)</Label>
              <Input
                id="fatsG"
                type="number"
                step="0.1"
                placeholder="22"
                value={formData.fatsG}
                onChange={(e) => setFormData({ ...formData, fatsG: e.target.value })}
              />
            </div>
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Select value={formData.context} onValueChange={(value) => setFormData({ ...formData, context: value })}>
              <SelectTrigger id="context">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEXTS.map((ctx) => (
                  <SelectItem key={ctx.value} value={ctx.value}>
                    {ctx.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {MEAL_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this meal..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={createMealMutation.isPending || !formData.description}
            >
              {createMealMutation.isPending ? "Saving..." : "Log Meal"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMealMutation.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
