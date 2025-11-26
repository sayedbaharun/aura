import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Dumbbell, Pill, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Day } from "@shared/schema";

interface MorningHabitsMiniProps {
  day: Day | null;
}

const habits = [
  { key: "pressUps", label: "Push-ups", icon: Dumbbell },
  { key: "squats", label: "Squats", icon: Dumbbell },
  { key: "supplements", label: "Supps", icon: Pill },
  { key: "reading", label: "Reading", icon: BookOpen },
] as const;

type HabitKey = (typeof habits)[number]["key"];

export default function MorningHabitsMini({ day }: MorningHabitsMiniProps) {
  const queryClient = useQueryClient();

  const rituals = day?.morningRituals || {};

  const updateMutation = useMutation({
    mutationFn: async (updatedRituals: typeof rituals) => {
      if (!day?.id) return;
      const res = await apiRequest("PATCH", `/api/days/${day.id}`, { morningRituals: updatedRituals });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["days"] });
    },
  });

  const toggleHabit = (habitKey: HabitKey) => {
    const currentValue = rituals[habitKey]?.done || false;
    const updatedRituals = {
      ...rituals,
      [habitKey]: {
        ...rituals[habitKey],
        done: !currentValue,
      },
    };
    updateMutation.mutate(updatedRituals);
  };

  const completedCount = habits.filter((h) => rituals[h.key]?.done).length;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Habits</span>
      <div className="flex items-center gap-1">
        {habits.map((habit) => {
          const isDone = rituals[habit.key]?.done || false;
          const Icon = habit.icon;
          return (
            <button
              key={habit.key}
              onClick={() => toggleHabit(habit.key)}
              className={cn(
                "relative p-2 rounded-lg transition-all",
                isDone
                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
              title={habit.label}
            >
              <Icon className="h-4 w-4" />
              {isDone && (
                <Check className="absolute -top-1 -right-1 h-3 w-3 text-green-500" />
              )}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground ml-1">
        {completedCount}/{habits.length}
      </span>
    </div>
  );
}
