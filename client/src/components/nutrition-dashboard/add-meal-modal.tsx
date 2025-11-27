import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cleanFormData } from "@/lib/utils";
import { getSavedMeals, saveMeal, deleteSavedMeal, type SavedMeal } from "@/lib/saved-meals";

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
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [isEstimatingMacros, setIsEstimatingMacros] = useState(false);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
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

  // Load saved meals when modal opens
  useEffect(() => {
    if (open) {
      setSavedMeals(getSavedMeals());
    }
  }, [open]);

  const handleSelectSavedMeal = (meal: SavedMeal) => {
    setFormData({
      ...formData,
      mealType: meal.mealType,
      description: meal.description,
      calories: meal.calories?.toString() || "",
      proteinG: meal.proteinG?.toString() || "",
      carbsG: meal.carbsG?.toString() || "",
      fatsG: meal.fatsG?.toString() || "",
      context: meal.context,
      tags: meal.tags,
    });
    setShowSavedMeals(false);
    toast({
      title: "Meal loaded",
      description: `Loaded "${meal.name}" - adjust as needed`,
    });
  };

  const handleSaveAsFavorite = () => {
    if (!formData.description) {
      toast({
        title: "Error",
        description: "Please enter a meal description first",
        variant: "destructive",
      });
      return;
    }

    const name = formData.description.slice(0, 50);
    saveMeal({
      name,
      description: formData.description,
      mealType: formData.mealType,
      calories: formData.calories ? parseFloat(formData.calories) : null,
      proteinG: formData.proteinG ? parseFloat(formData.proteinG) : null,
      carbsG: formData.carbsG ? parseFloat(formData.carbsG) : null,
      fatsG: formData.fatsG ? parseFloat(formData.fatsG) : null,
      context: formData.context,
      tags: formData.tags,
    });
    setSavedMeals(getSavedMeals());
    toast({
      title: "Saved!",
      description: "Meal saved to favorites for quick access",
    });
  };

  const handleDeleteSavedMeal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedMeal(id);
    setSavedMeals(getSavedMeals());
    toast({
      title: "Deleted",
      description: "Meal removed from favorites",
    });
  };

  const handleEstimateMacros = async () => {
    if (!formData.description) {
      toast({
        title: "Error",
        description: "Please enter a meal description first",
        variant: "destructive",
      });
      return;
    }

    setIsEstimatingMacros(true);
    try {
      const res = await apiRequest("POST", "/api/nutrition/estimate-macros", {
        description: formData.description,
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.message || data.error);
      }

      setFormData({
        ...formData,
        calories: data.calories?.toString() || "",
        proteinG: data.proteinG?.toString() || "",
        carbsG: data.carbsG?.toString() || "",
        fatsG: data.fatsG?.toString() || "",
      });

      toast({
        title: "Macros estimated!",
        description: `Confidence: ${data.confidence}. ${data.notes || ""}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to estimate",
        description: error.message || "Could not estimate macros. Please enter them manually.",
        variant: "destructive",
      });
    } finally {
      setIsEstimatingMacros(false);
    }
  };

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

    createMealMutation.mutate(cleanPayload);
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
          {/* Quick Select from Saved Meals */}
          {savedMeals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Quick Select from Favorites
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSavedMeals(!showSavedMeals)}
                >
                  {showSavedMeals ? "Hide" : "Show"} ({savedMeals.length})
                </Button>
              </div>
              {showSavedMeals && (
                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {savedMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer group"
                      onClick={() => handleSelectSavedMeal(meal)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{meal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {meal.calories || "?"} kcal | P: {meal.proteinG || "?"}g | C: {meal.carbsG || "?"}g | F: {meal.fatsG || "?"}g
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 ml-2"
                        onClick={(e) => handleDeleteSavedMeal(meal.id, e)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
            </div>
          )}

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
            <div className="flex gap-2">
              <Input
                id="description"
                placeholder="e.g., Grilled chicken with quinoa and vegetables"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleEstimateMacros}
                disabled={!formData.description || isEstimatingMacros}
                title="Estimate macros using AI"
              >
                {isEstimatingMacros ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a description and click the sparkle button to estimate macros with AI
            </p>
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
          <div className="flex flex-col gap-2 pt-4">
            <div className="flex gap-2">
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
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleSaveAsFavorite}
              disabled={!formData.description}
            >
              <Star className="h-4 w-4 mr-2" />
              Save as Favorite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
