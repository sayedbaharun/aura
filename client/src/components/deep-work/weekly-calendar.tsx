import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isToday,
  isPast,
  parseISO,
  getHours,
  differenceInDays,
} from "date-fns";
import { Plus, Calendar, Video, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  type: string;
  ventureId: string | null;
  estEffort: number | null;
  focusDate: string | null;
  dueDate: string | null;
  focusSlot: "morning_routine" | "deep_work_1" | "admin_block" | "lunch" | "gym" | "afternoon" | "evening_review" | "meetings" | "buffer" | null;
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  attendees?: Array<{ email: string; responseStatus?: string }>;
}

interface CalendarWeekResponse {
  configured: boolean;
  events?: CalendarEvent[];
  weekStart?: string;
  weekEnd?: string;
}

interface WeeklyCalendarProps {
  selectedWeek: Date;
  onCellClick: (date: Date, slot: string) => void;
}

const FOCUS_SLOTS = [
  { key: "morning_routine", label: "Morning Routine", time: "7:00-9:00 AM", capacity: 2, color: "bg-amber-100 dark:bg-amber-900/30", startHour: 7, endHour: 9 },
  { key: "deep_work_1", label: "Deep Work 1 ⭐", time: "9:00-11:00 AM", capacity: 2, color: "bg-blue-200 dark:bg-blue-900/40 border-2 border-blue-400", startHour: 9, endHour: 11 },
  { key: "admin_block", label: "Admin Block", time: "11:00 AM-12:00 PM", capacity: 1, color: "bg-purple-100 dark:bg-purple-900/30", startHour: 11, endHour: 12 },
  { key: "lunch", label: "Lunch", time: "12:00-1:00 PM", capacity: 1, color: "bg-green-100 dark:bg-green-900/30", startHour: 12, endHour: 13 },
  { key: "gym", label: "Gym / Workout", time: "1:00-3:00 PM", capacity: 2, color: "bg-red-100 dark:bg-red-900/30", startHour: 13, endHour: 15 },
  { key: "afternoon", label: "Afternoon", time: "3:00-11:00 PM", capacity: 8, color: "bg-cyan-100 dark:bg-cyan-900/30", startHour: 15, endHour: 23 },
  { key: "evening_review", label: "Evening Review", time: "11:00 PM-12:00 AM", capacity: 1, color: "bg-indigo-100 dark:bg-indigo-900/30", startHour: 23, endHour: 24 },
  { key: "meetings", label: "Meetings", time: "Flexible", capacity: 4, color: "bg-emerald-100 dark:bg-emerald-900/30", startHour: 0, endHour: 24 },
  { key: "buffer", label: "Buffer", time: "Flexible", capacity: 2, color: "bg-slate-100 dark:bg-slate-800/50", startHour: 0, endHour: 24 },
] as const;

// Map event time to focus slot
function getSlotForEvent(event: CalendarEvent): string {
  if (!event.start.dateTime) return "meetings"; // All-day events go to meetings

  const startTime = parseISO(event.start.dateTime);
  const hour = getHours(startTime) + startTime.getMinutes() / 60;

  // Find matching slot based on time
  for (const slot of FOCUS_SLOTS) {
    if (slot.key === "meetings" || slot.key === "buffer") continue;
    if (hour >= slot.startHour && hour < slot.endHour) {
      return slot.key;
    }
  }

  // Default to meetings for events that don't fit other slots
  return "meetings";
}

export default function WeeklyCalendar({
  selectedWeek,
  onCellClick,
}: WeeklyCalendarProps) {
  const isMobile = useIsMobile();
  const [mobileStartIndex, setMobileStartIndex] = useState(0);

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Sunday

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // On mobile, show only 2 days at a time
  const MOBILE_DAYS_TO_SHOW = 2;
  const visibleDays = isMobile
    ? weekDays.slice(mobileStartIndex, mobileStartIndex + MOBILE_DAYS_TO_SHOW)
    : weekDays;

  const canGoBack = mobileStartIndex > 0;
  const canGoForward = mobileStartIndex + MOBILE_DAYS_TO_SHOW < 7;

  const handleMobileNavBack = () => {
    if (canGoBack) setMobileStartIndex(mobileStartIndex - 1);
  };

  const handleMobileNavForward = () => {
    if (canGoForward) setMobileStartIndex(mobileStartIndex + 1);
  };

  // Fetch tasks for the week - include all statuses except done/cancelled
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: [
      "/api/tasks",
      `week-${format(weekStart, "yyyy-MM-dd")}`,
      {
        focus_date_gte: format(weekStart, "yyyy-MM-dd"),
        focus_date_lte: format(weekEnd, "yyyy-MM-dd"),
      },
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/tasks?focus_date_gte=${format(weekStart, "yyyy-MM-dd")}&focus_date_lte=${format(weekEnd, "yyyy-MM-dd")}`
      );
      const allTasks = await res.json();
      // Filter out done and cancelled tasks on the client side
      return allTasks.filter((t: Task) => t.status !== "done" && t.status !== "cancelled");
    },
  });

  // Fetch ventures for colors
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  // Fetch Google Calendar events for the week
  const { data: calendarData } = useQuery<CalendarWeekResponse>({
    queryKey: ["/api/calendar/week", format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/calendar/week?weekStart=${format(weekStart, "yyyy-MM-dd")}`
        );
        return await res.json();
      } catch {
        return { configured: false, events: [] };
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  const calendarEvents = calendarData?.events || [];
  const isCalendarConfigured = calendarData?.configured ?? false;

  // Group calendar events by date and slot
  const eventsByDateSlot = calendarEvents.reduce((acc, event) => {
    const eventDate = event.start.dateTime
      ? parseISO(event.start.dateTime)
      : event.start.date
      ? parseISO(event.start.date)
      : null;

    if (!eventDate) return acc;

    const dateStr = format(eventDate, "yyyy-MM-dd");
    const slot = getSlotForEvent(event);
    const key = `${dateStr}_${slot}`;

    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const getEventsForCell = (date: Date, slot: string): CalendarEvent[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${dateStr}_${slot}`;
    return eventsByDateSlot[key] || [];
  };

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

  // Get due date urgency indicator
  const getDueDateUrgency = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    const daysUntil = differenceInDays(date, new Date());

    if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}d late`, color: "bg-red-500 text-white", urgent: true };
    if (daysUntil === 0) return { text: "Today", color: "bg-orange-500 text-white", urgent: true };
    if (daysUntil === 1) return { text: "Tomorrow", color: "bg-yellow-500 text-black", urgent: true };
    if (daysUntil <= 3) return { text: `${daysUntil}d`, color: "bg-blue-500/20 text-blue-700 dark:text-blue-300", urgent: false };
    return null; // Don't show for dates more than 3 days out
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

  // Dynamic grid columns based on visible days
  const gridColsClass = isMobile
    ? "grid-cols-[80px_1fr_1fr]" // Slot label + 2 days on mobile
    : "grid-cols-8"; // Slot label + 7 days on desktop

  return (
    <Card className="p-4 md:overflow-x-auto">
      <div className={cn(!isMobile && "min-w-[1000px]")}>
        {/* Mobile Navigation */}
        {isMobile && (
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMobileNavBack}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium text-muted-foreground">
              {format(visibleDays[0], "MMM d")} - {format(visibleDays[visibleDays.length - 1], "MMM d")}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMobileNavForward}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Day Selector Pills (Mobile) */}
        {isMobile && (
          <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
            {weekDays.map((day, index) => (
              <Button
                key={day.toISOString()}
                variant={index >= mobileStartIndex && index < mobileStartIndex + MOBILE_DAYS_TO_SHOW ? "default" : "outline"}
                size="sm"
                className={cn(
                  "shrink-0",
                  isToday(day) && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => setMobileStartIndex(Math.min(index, 7 - MOBILE_DAYS_TO_SHOW))}
              >
                {format(day, "EEE")}
              </Button>
            ))}
          </div>
        )}

        {/* Header Row */}
        <div className={cn("grid gap-2 mb-2", gridColsClass)}>
          <div className="font-semibold text-sm text-muted-foreground"></div>
          {visibleDays.map((day) => (
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
          <div key={slot.key} className={cn("grid gap-2 mb-2", gridColsClass)}>
            {/* Slot Label */}
            <div className={cn("flex flex-col justify-center p-2 text-sm rounded-lg", slot.color)}>
              <div className="font-semibold text-xs md:text-sm">{slot.label}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{slot.time}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 hidden md:block">{slot.capacity}h capacity</div>
            </div>

            {/* Day Cells */}
            {visibleDays.map((day) => {
              const cellTasks = getTasksForCell(day, slot.key);
              const cellEvents = getEventsForCell(day, slot.key);
              const usage = getSlotUsage(cellTasks);
              const capacity = getSlotCapacity(slot.key);
              const percentage = (usage / capacity) * 100;
              const isPastCell = isPast(day) && !isToday(day);
              const hasContent = cellTasks.length > 0 || cellEvents.length > 0;

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
                  {/* Tasks and Calendar Events */}
                  <div className="space-y-1 mb-2">
                    {!hasContent ? (
                      <div className="flex items-center justify-center h-16 text-muted-foreground/50">
                        <Plus className="h-4 w-4" />
                      </div>
                    ) : (
                      <>
                        {/* Calendar Events - shown first with calendar icon */}
                        {cellEvents.map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1.5 rounded border-l-[3px] border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (event.hangoutLink) {
                                window.open(event.hangoutLink, "_blank");
                              }
                            }}
                          >
                            <div className="flex items-start gap-1 mb-0.5">
                              {event.hangoutLink ? (
                                <Video className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                              ) : (
                                <Calendar className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 truncate font-medium text-emerald-900 dark:text-emerald-100">
                                {event.summary || "No title"}
                              </div>
                            </div>
                            {event.start.dateTime && (
                              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 ml-4">
                                {format(parseISO(event.start.dateTime), "h:mm a")}
                                {event.attendees && event.attendees.length > 0 && (
                                  <span className="ml-1">• {event.attendees.length} attendees</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Tasks */}
                        {cellTasks.map((task) => {
                          const dueDateInfo = getDueDateUrgency(task.dueDate);
                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "text-xs p-1.5 rounded border bg-card hover:bg-accent/50 transition-colors",
                                dueDateInfo?.urgent && "ring-1 ring-orange-400/50"
                              )}
                              style={{
                                borderLeftColor: getVentureColor(task.ventureId),
                                borderLeftWidth: "3px",
                              }}
                            >
                              <div className="flex items-start gap-1 mb-1">
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full mt-1 shrink-0",
                                    getPriorityColor(task.priority)
                                  )}
                                />
                                <div className="flex-1 truncate font-medium">
                                  {task.title}
                                </div>
                                {dueDateInfo?.urgent && (
                                  <AlertCircle className="h-3 w-3 text-orange-500 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                {dueDateInfo && (
                                  <span className={cn("text-[9px] px-1 py-0.5 rounded font-medium", dueDateInfo.color)}>
                                    {dueDateInfo.text}
                                  </span>
                                )}
                                {task.estEffort && (
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    {task.estEffort}h
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
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
