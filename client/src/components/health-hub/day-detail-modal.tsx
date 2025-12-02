import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { X, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

interface Day {
  id: string;
  date: string;
  title: string | null;
  top3Outcomes: string | null;
  oneThingToShip: string | null;
  reflectionAm: string | null;
  reflectionPm: string | null;
  mood: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  completedAt: string | null;
}

interface DayDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  healthEntry: HealthEntry | null;
  onEdit: (entry: HealthEntry) => void;
}

export default function DayDetailModal({
  open,
  onOpenChange,
  date,
  healthEntry,
  onEdit,
}: DayDetailModalProps) {
  const { data: day, isLoading: dayLoading } = useQuery<Day>({
    queryKey: ["/api/days", date],
    enabled: !!date,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { focus_date: date }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?focus_date=${date}`, {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!date,
  });

  const completedTasks = tasks.filter((t) => t.status === "done");

  if (!date) return null;

  const getMoodEmoji = (mood: string | null): string => {
    switch (mood) {
      case "low":
        return "😔";
      case "medium":
        return "😐";
      case "high":
        return "😊";
      case "peak":
        return "🤩";
      default:
        return "—";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {format(parseISO(date), "EEEE, MMMM d, yyyy")}
              </DialogTitle>
              <DialogDescription>Complete health and day overview</DialogDescription>
            </div>
            {healthEntry && (
              <Button variant="outline" size="sm" onClick={() => onEdit(healthEntry)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Health Data */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Health Metrics</h3>
            {healthEntry ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Sleep</div>
                  <div className="text-lg font-bold">
                    {healthEntry.sleepHours ? `${healthEntry.sleepHours} hrs` : "—"}
                  </div>
                  {healthEntry.sleepQuality && (
                    <div className="text-xs text-muted-foreground capitalize">
                      {healthEntry.sleepQuality}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Energy</div>
                  <div className="text-lg font-bold">
                    {healthEntry.energyLevel ? (
                      <>
                        {healthEntry.energyLevel}/5{" "}
                        {"⚡".repeat(healthEntry.energyLevel)}
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Mood</div>
                  <div className="text-lg font-bold">
                    {getMoodEmoji(healthEntry.mood)}{" "}
                    <span className="capitalize text-base">
                      {healthEntry.mood || "—"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Workout</div>
                  <div className="text-lg font-bold">
                    {healthEntry.workoutDone ? (
                      <span className="text-emerald-600">
                        ✓{" "}
                        {healthEntry.workoutType && healthEntry.workoutType !== "none"
                          ? healthEntry.workoutType
                          : "Done"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">✗ None</span>
                    )}
                  </div>
                  {healthEntry.workoutDurationMin && (
                    <div className="text-xs text-muted-foreground">
                      {healthEntry.workoutDurationMin} minutes
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Steps</div>
                  <div className="text-lg font-bold">
                    {healthEntry.steps ? healthEntry.steps.toLocaleString() : "—"}
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Weight</div>
                  <div className="text-lg font-bold">
                    {healthEntry.weightKg ? `${healthEntry.weightKg} kg` : "—"}
                  </div>
                </div>

                {healthEntry.stressLevel && (
                  <div className="p-3 bg-muted/50 rounded-lg col-span-2 md:col-span-3">
                    <div className="text-sm text-muted-foreground">Stress Level</div>
                    <div className="text-lg font-bold capitalize">{healthEntry.stressLevel}</div>
                  </div>
                )}

                {healthEntry.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg col-span-2 md:col-span-3">
                    <div className="text-sm text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm">{healthEntry.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No health data logged for this day
              </div>
            )}
          </div>

          <Separator />

          {/* Day Context */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Day Context</h3>
            {dayLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : day ? (
              <div className="space-y-3">
                {day.title && (
                  <div>
                    <div className="text-sm text-muted-foreground">Day Title</div>
                    <div className="font-medium">{day.title}</div>
                  </div>
                )}

                {day.top3Outcomes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Top 3 Outcomes</div>
                    <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {day.top3Outcomes}
                    </div>
                  </div>
                )}

                {day.oneThingToShip && (
                  <div>
                    <div className="text-sm text-muted-foreground">One Thing to Ship</div>
                    <div className="font-medium">{day.oneThingToShip}</div>
                  </div>
                )}

                {(day.reflectionAm || day.reflectionPm) && (
                  <div className="grid md:grid-cols-2 gap-3">
                    {day.reflectionAm && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">AM Reflection</div>
                        <div className="text-sm bg-muted/50 p-3 rounded-lg">
                          {day.reflectionAm}
                        </div>
                      </div>
                    )}
                    {day.reflectionPm && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">PM Reflection</div>
                        <div className="text-sm bg-muted/50 p-3 rounded-lg">
                          {day.reflectionPm}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No day record found
              </div>
            )}
          </div>

          <Separator />

          {/* Completed Tasks */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Completed Tasks {completedTasks.length > 0 && `(${completedTasks.length})`}
            </h3>
            {tasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : completedTasks.length > 0 ? (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-emerald-600 font-bold">✓</div>
                    <div className="flex-1 text-sm">{task.title}</div>
                    <Badge variant="secondary">Done</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No completed tasks for this day
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
