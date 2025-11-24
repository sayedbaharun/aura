import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isToday,
  isPast,
} from "date-fns";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  ventureId: string | null;
  estEffort: number | null;
  focusDate: string | null;
  focusSlot: "morning" | "midday" | "afternoon" | "evening" | "anytime" | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface WeeklyCalendarProps {
  selectedWeek: Date;
  onCellClick: (date: Date, slot: string) => void;
}

const FOCUS_SLOTS = [
  { key: "morning", label: "Morning", time: "6:00-9:00 AM", capacity: 3 },
  { key: "midday", label: "Midday", time: "9:00 AM-1:00 PM", capacity: 4 },
  { key: "afternoon", label: "Afternoon", time: "1:00-5:00 PM", capacity: 4 },
  { key: "evening", label: "Evening", time: "5:00-9:00 PM", capacity: 4 },
] as const;

export default function WeeklyCalendar({
  selectedWeek,
  onCellClick,
}: WeeklyCalendarProps) {
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Sunday

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch tasks for the week
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: [
      "/api/tasks",
      `week-${format(weekStart, "yyyy-MM-dd")}`,
      {
        focus_date_gte: format(weekStart, "yyyy-MM-dd"),
        focus_date_lte: format(weekEnd, "yyyy-MM-dd"),
        status: "next,in_progress",
      },
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/tasks?focus_date_gte=${format(weekStart, "yyyy-MM-dd")}&focus_date_lte=${format(weekEnd, "yyyy-MM-dd")}&status=next,in_progress`
      );
      return await res.json();
    },
  });

  // Fetch ventures for colors
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Group tasks by date and slot
  const tasksByDateSlot = tasks.reduce((acc, task) => {
    if (!task.focusDate || !task.focusSlot) return acc;
    const key = `${task.focusDate}_${task.focusSlot}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const getTasksForCell = (date: Date, slot: string): Task[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${dateStr}_${slot}`;
    return tasksByDateSlot[key] || [];
  };

  const getSlotCapacity = (slot: string) => {
    const slotConfig = FOCUS_SLOTS.find((s) => s.key === slot);
    return slotConfig?.capacity || 8;
  };

  const getSlotUsage = (tasks: Task[]) => {
    return tasks.reduce((sum, task) => sum + (task.estEffort || 0), 0);
  };

  const getCapacityColor = (usage: number, capacity: number) => {
    const percentage = (usage / capacity) * 100;
    if (percentage > 100) return "bg-red-500";
    if (percentage > 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P0":
        return "bg-red-500";
      case "P1":
        return "bg-orange-500";
      case "P2":
        return "bg-yellow-500";
      case "P3":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getVentureColor = (ventureId: string | null) => {
    if (!ventureId) return "#6b7280"; // gray
    const venture = ventures.find((v) => v.id === ventureId);
    return venture?.color || "#6b7280";
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 overflow-x-auto">
      <div className="min-w-[1000px]">
        {/* Header Row */}
        <div className="grid grid-cols-8 gap-2 mb-2">
          <div className="font-semibold text-sm text-muted-foreground"></div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center font-semibold text-sm p-2 rounded",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              <div>{format(day, "EEE")}</div>
              <div className="text-xs opacity-70">{format(day, "MMM d")}</div>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {FOCUS_SLOTS.map((slot) => (
          <div key={slot.key} className="grid grid-cols-8 gap-2 mb-2">
            {/* Slot Label */}
            <div className="flex flex-col justify-center p-2 text-sm">
              <div className="font-semibold">{slot.label}</div>
              <div className="text-xs text-muted-foreground">{slot.time}</div>
            </div>

            {/* Day Cells */}
            {weekDays.map((day) => {
              const cellTasks = getTasksForCell(day, slot.key);
              const usage = getSlotUsage(cellTasks);
              const capacity = getSlotCapacity(slot.key);
              const percentage = (usage / capacity) * 100;
              const isPastCell = isPast(day) && !isToday(day);

              return (
                <div
                  key={`${day.toISOString()}-${slot.key}`}
                  onClick={() => onCellClick(day, slot.key)}
                  className={cn(
                    "min-h-[120px] border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                    isToday(day) && "bg-primary/5",
                    isPastCell && "opacity-60 bg-muted/30"
                  )}
                >
                  {/* Tasks */}
                  <div className="space-y-1 mb-2">
                    {cellTasks.length === 0 ? (
                      <div className="flex items-center justify-center h-16 text-muted-foreground/50">
                        <Plus className="h-4 w-4" />
                      </div>
                    ) : (
                      cellTasks.map((task) => (
                        <div
                          key={task.id}
                          className="text-xs p-1.5 rounded border bg-card hover:bg-accent/50 transition-colors"
                          style={{
                            borderLeftColor: getVentureColor(task.ventureId),
                            borderLeftWidth: "3px",
                          }}
                        >
                          <div className="flex items-start gap-1 mb-1">
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full mt-1",
                                getPriorityColor(task.priority)
                              )}
                            />
                            <div className="flex-1 truncate font-medium">
                              {task.title}
                            </div>
                          </div>
                          {task.estEffort && (
                            <div className="text-[10px] text-muted-foreground text-right">
                              {task.estEffort}h
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Capacity Indicator */}
                  {cellTasks.length > 0 && (
                    <div className="mt-auto pt-2 border-t">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>
                          {usage.toFixed(1)}/{capacity}h
                        </span>
                        <span>{Math.round(percentage)}%</span>
                      </div>
                      <Progress
                        value={Math.min(percentage, 100)}
                        className="h-1"
                        indicatorClassName={getCapacityColor(usage, capacity)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No deep work scheduled yet</p>
          <p className="text-sm mt-1">
            Click on any cell to schedule tasks for that time slot
          </p>
        </div>
      )}
    </Card>
  );
}
