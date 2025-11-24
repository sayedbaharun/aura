import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { UtensilsCrossed, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface NutritionEntry {
  id: string;
  dayId: string;
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

export default function NutritionSnapshot() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: nutritionEntries = [], isLoading } = useQuery<NutritionEntry[]>({
    queryKey: ["/api/nutrition"],
  });

  const todayEntries = nutritionEntries.filter((entry) => {
    const entryDate = format(new Date(entry.datetime), "yyyy-MM-dd");
    return entryDate === today;
  });

  const [formData, setFormData] = useState({
    mealType: "breakfast",
    description: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatsG: "",
    tags: [] as string[],
  });

  const createNutritionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nutrition", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition"] });
      setIsOpen(false);
      setFormData({
        mealType: "breakfast",
        description: "",
        calories: "",
        proteinG: "",
        carbsG: "",
        fatsG: "",
        tags: [],
      });
      toast({
        title: "Success",
        description: "Meal added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add meal",
        variant: "destructive",
      });
    },
  });

  const handleSaveMeal = () => {
    const payload = {
      datetime: new Date().toISOString(),
      mealType: formData.mealType,
      description: formData.description,
      calories: formData.calories ? parseInt(formData.calories) : null,
      proteinG: formData.proteinG ? parseInt(formData.proteinG) : null,
      carbsG: formData.carbsG ? parseInt(formData.carbsG) : null,
      fatsG: formData.fatsG ? parseInt(formData.fatsG) : null,
      tags: formData.tags.length > 0 ? formData.tags : null,
    };

    createNutritionMutation.mutate(payload);
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const totalCalories = todayEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
  const totalProtein = todayEntries.reduce((sum, entry) => sum + (entry.proteinG || 0), 0);
  const proteinGoal = 150;
  const proteinProgress = Math.min((totalProtein / proteinGoal) * 100, 100);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Nutrition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded"></div>
            ))}
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
            <UtensilsCrossed className="h-5 w-5" />
            Nutrition
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Meal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mealType">Meal Type</Label>
                  <Select
                    value={formData.mealType}
                    onValueChange={(value) => setFormData({ ...formData, mealType: value })}
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Eggs, avocado, toast..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
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
                      placeholder="22"
                      value={formData.fatsG}
                      onChange={(e) => setFormData({ ...formData, fatsG: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {["clean", "high_protein", "cheat"].map((tag) => (
                      <Badge
                        key={tag}
                        variant={formData.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSaveMeal}
                  className="w-full"
                  disabled={createNutritionMutation.isPending || !formData.description}
                >
                  {createNutritionMutation.isPending ? "Saving..." : "Add Meal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No meals logged today</p>
        ) : (
          <>
            <div className="space-y-2">
              {todayEntries.map((entry) => (
                <div key={entry.id} className="flex justify-between items-start text-sm border-b pb-2">
                  <div>
                    <p className="font-medium capitalize">{entry.mealType}</p>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{entry.calories || "—"} cal</p>
                    <p className="text-xs text-muted-foreground">{entry.proteinG || "—"}g protein</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Total Calories</span>
                <span>{totalCalories}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Protein</span>
                  <span className="font-medium">
                    {totalProtein}g / {proteinGoal}g
                  </span>
                </div>
                <Progress value={proteinProgress} className="h-2" />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
