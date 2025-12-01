import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cleanFormData } from "@/lib/utils";

interface NutritionEntry {
  id: string;
  datetime: string;
  mealType: string;
  description: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
  context: string | null;
  tags: string[] | null;
  notes: string | null;
}

interface EditMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: NutritionEntry | null;
}

const MEAL_TAGS = ["clean", "high_protein", "cheat", "meal_prep", "eating_out", "healthy"];
const CONTEXTS = [
  { value: "home", label: "Home" },
  { value: "restaurant", label: "Restaurant" },
  { value: "office", label: "Office" },
  { value: "travel", label: "Travel" },
];

export default function EditMealModal({ open, onOpenChange, meal }: EditMealModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: "",
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

  useEffect(() => {
    if (meal) {
      const mealDate = new Date(meal.datetime);
      setFormData({
        date: format(mealDate, "yyyy-MM-dd"),
        mealType: meal.mealType || "breakfast",
        description: meal.description || "",
        calories: meal.calories?.toString() || "",
        proteinG: meal.proteinG?.toString() || "",
        carbsG: meal.carbsG?.toString() || "",
        fatsG: meal.fatsG?.toString() || "",
        context: meal.context || "home",
        tags: meal.tags || [],
        notes: meal.notes || "",
      });
    }
  }, [meal]);

  const updateMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/nutrition/${meal?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition"] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Meal updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update meal",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.description) {
      toast({
        title: "Error",
        description: "Please enter a meal description",
        variant: "destructive",
      });
      return;
    }

    // Use noon as default time since we're not tracking specific meal times
    const datetime = new Date(`${formData.date}T12:00`).toISOString();

    const payload = {
      datetime,
      mealType: formData.mealType,
      description: formData.description,
      calories: formData.calories ? parseFloat(formData.calories) : undefined,
      proteinG: formData.proteinG ? parseFloat(formData.proteinG) : undefined,
      carbsG: formData.carbsG ? parseFloat(formData.carbsG) : undefined,
      fatsG: formData.fatsG ? parseFloat(formData.fatsG) : undefined,
      context: formData.context,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      notes: formData.notes,
    };

    // Clean data to only send non-empty values
    const cleanPayload = cleanFormData(payload);

    updateMealMutation.mutate(cleanPayload);
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  if (!meal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Meal</DialogTitle>
          <DialogDescription className="sr-only">Edit meal details and nutrition information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
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
              disabled={updateMealMutation.isPending || !formData.description}
            >
              {updateMealMutation.isPending ? "Saving..." : "Update Meal"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMealMutation.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
