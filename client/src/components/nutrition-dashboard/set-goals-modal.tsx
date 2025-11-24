import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface SetGoalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalsUpdated: () => void;
}

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2100,
  protein: 150,
  carbs: 200,
  fats: 70,
};

export function getStoredGoals(): NutritionGoals {
  if (typeof window === "undefined") return DEFAULT_GOALS;

  const stored = localStorage.getItem("nutrition-goals");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_GOALS;
    }
  }
  return DEFAULT_GOALS;
}

export default function SetGoalsModal({ open, onOpenChange, onGoalsUpdated }: SetGoalsModalProps) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);

  useEffect(() => {
    if (open) {
      setGoals(getStoredGoals());
    }
  }, [open]);

  const handleSave = () => {
    if (goals.calories <= 0 || goals.protein < 0 || goals.carbs < 0 || goals.fats < 0) {
      toast({
        title: "Invalid Goals",
        description: "Please enter valid positive values",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("nutrition-goals", JSON.stringify(goals));
    onGoalsUpdated();
    onOpenChange(false);
    toast({
      title: "Goals Updated",
      description: "Your nutrition goals have been saved",
    });
  };

  const handleReset = () => {
    setGoals(DEFAULT_GOALS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Nutrition Goals</DialogTitle>
          <DialogDescription>
            Configure your daily nutrition targets. These goals will be used to track your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="calories">Daily Calories (kcal)</Label>
            <Input
              id="calories"
              type="number"
              step="50"
              value={goals.calories}
              onChange={(e) => setGoals({ ...goals, calories: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protein">Daily Protein (g)</Label>
            <Input
              id="protein"
              type="number"
              step="5"
              value={goals.protein}
              onChange={(e) => setGoals({ ...goals, protein: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="carbs">Daily Carbs (g)</Label>
            <Input
              id="carbs"
              type="number"
              step="5"
              value={goals.carbs}
              onChange={(e) => setGoals({ ...goals, carbs: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fats">Daily Fats (g)</Label>
            <Input
              id="fats"
              type="number"
              step="5"
              value={goals.fats}
              onChange={(e) => setGoals({ ...goals, fats: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Goals
            </Button>
            <Button onClick={handleReset} variant="outline">
              Reset to Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
