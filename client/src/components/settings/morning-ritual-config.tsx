import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sun, Plus, Trash2, GripVertical, Dumbbell, Pill, BookOpen, Droplets, Brain, Coffee, Bed, Footprints } from "lucide-react";

interface MorningHabitConfig {
  key: string;
  label: string;
  icon: string;
  hasCount: boolean;
  countLabel?: string;
  defaultCount?: number;
  enabled: boolean;
}

interface MorningRitualConfig {
  habits: MorningHabitConfig[];
}

const AVAILABLE_ICONS = [
  { value: "Dumbbell", label: "Dumbbell", icon: Dumbbell },
  { value: "Pill", label: "Pill", icon: Pill },
  { value: "BookOpen", label: "Book", icon: BookOpen },
  { value: "Droplets", label: "Water", icon: Droplets },
  { value: "Brain", label: "Brain", icon: Brain },
  { value: "Coffee", label: "Coffee", icon: Coffee },
  { value: "Bed", label: "Sleep", icon: Bed },
  { value: "Footprints", label: "Walk", icon: Footprints },
  { value: "Sun", label: "Sun", icon: Sun },
];

const getIconComponent = (iconName: string) => {
  const found = AVAILABLE_ICONS.find(i => i.value === iconName);
  return found ? found.icon : Sun;
};

export default function MorningRitualConfig() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<MorningRitualConfig>({
    queryKey: ["/api/settings/morning-ritual"],
  });

  const [habits, setHabits] = useState<MorningHabitConfig[]>([]);
  const [newHabit, setNewHabit] = useState<Partial<MorningHabitConfig>>({
    label: "",
    icon: "Sun",
    hasCount: false,
    countLabel: "",
    defaultCount: 0,
    enabled: true,
  });

  useEffect(() => {
    if (config?.habits) {
      setHabits(config.habits);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (updatedHabits: MorningHabitConfig[]) => {
      const res = await apiRequest("PATCH", "/api/settings/morning-ritual", {
        habits: updatedHabits,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/morning-ritual"] });
      toast({
        title: "Morning ritual updated",
        description: "Your habits have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update morning ritual. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleHabit = (key: string) => {
    const updated = habits.map(h =>
      h.key === key ? { ...h, enabled: !h.enabled } : h
    );
    setHabits(updated);
  };

  const handleUpdateHabit = (key: string, field: keyof MorningHabitConfig, value: any) => {
    const updated = habits.map(h =>
      h.key === key ? { ...h, [field]: value } : h
    );
    setHabits(updated);
  };

  const handleDeleteHabit = (key: string) => {
    setHabits(habits.filter(h => h.key !== key));
  };

  const handleAddHabit = () => {
    if (!newHabit.label) {
      toast({
        title: "Error",
        description: "Please enter a habit name.",
        variant: "destructive",
      });
      return;
    }

    const key = newHabit.label.toLowerCase().replace(/\s+/g, "_");

    if (habits.some(h => h.key === key)) {
      toast({
        title: "Error",
        description: "A habit with this name already exists.",
        variant: "destructive",
      });
      return;
    }

    const habit: MorningHabitConfig = {
      key,
      label: newHabit.label,
      icon: newHabit.icon || "Sun",
      hasCount: newHabit.hasCount || false,
      countLabel: newHabit.countLabel || "",
      defaultCount: newHabit.defaultCount || 0,
      enabled: true,
    };

    setHabits([...habits, habit]);
    setNewHabit({
      label: "",
      icon: "Sun",
      hasCount: false,
      countLabel: "",
      defaultCount: 0,
      enabled: true,
    });
  };

  const handleSave = () => {
    updateMutation.mutate(habits);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Habits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Morning Habits
          </CardTitle>
          <CardDescription>
            Configure your morning ritual habits. Toggle to enable/disable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {habits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No habits configured. Add your first habit below.
            </p>
          ) : (
            habits.map((habit) => {
              const IconComponent = getIconComponent(habit.icon);
              return (
                <div
                  key={habit.key}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div className="p-2 bg-muted rounded">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={habit.label}
                      onChange={(e) => handleUpdateHabit(habit.key, "label", e.target.value)}
                      className="font-medium"
                    />
                    {habit.hasCount && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          value={habit.defaultCount || 0}
                          onChange={(e) => handleUpdateHabit(habit.key, "defaultCount", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <Input
                          placeholder="unit (reps, pages, etc.)"
                          value={habit.countLabel || ""}
                          onChange={(e) => handleUpdateHabit(habit.key, "countLabel", e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`count-${habit.key}`} className="text-xs">Count</Label>
                      <Switch
                        id={`count-${habit.key}`}
                        checked={habit.hasCount}
                        onCheckedChange={(checked) => handleUpdateHabit(habit.key, "hasCount", checked)}
                      />
                    </div>
                    <Switch
                      checked={habit.enabled}
                      onCheckedChange={() => handleToggleHabit(habit.key)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteHabit(habit.key)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Add New Habit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Habit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Habit Name</Label>
              <Input
                placeholder="e.g., Cold Shower"
                value={newHabit.label || ""}
                onChange={(e) => setNewHabit({ ...newHabit, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={newHabit.icon || "Sun"}
                onValueChange={(value) => setNewHabit({ ...newHabit, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((icon) => {
                    const IconComp = icon.icon;
                    return (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          {icon.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="newHabitCount"
                checked={newHabit.hasCount || false}
                onCheckedChange={(checked) => setNewHabit({ ...newHabit, hasCount: checked })}
              />
              <Label htmlFor="newHabitCount">Track count</Label>
            </div>
          </div>

          {newHabit.hasCount && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Count</Label>
                <Input
                  type="number"
                  value={newHabit.defaultCount || 0}
                  onChange={(e) => setNewHabit({ ...newHabit, defaultCount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Count Label</Label>
                <Input
                  placeholder="e.g., reps, pages, minutes"
                  value={newHabit.countLabel || ""}
                  onChange={(e) => setNewHabit({ ...newHabit, countLabel: e.target.value })}
                />
              </div>
            </div>
          )}

          <Button onClick={handleAddHabit}>
            <Plus className="h-4 w-4 mr-2" />
            Add Habit
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
