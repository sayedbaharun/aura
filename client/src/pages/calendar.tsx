import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  Video,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  focusSlot: string | null;
  dueDate: string | null;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
}

interface CalendarWeekResponse {
  configured: boolean;
  events?: CalendarEvent[];
}

interface Venture {
  id: string;
  name: string;
  color: string | null;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isMobile = useIsMobile();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Generate calendar days
  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  // Fetch tasks for the month
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: [
      "/api/tasks",
      `month-${format(monthStart, "yyyy-MM")}`,
      {
        focus_date_gte: format(monthStart, "yyyy-MM-dd"),
        focus_date_lte: format(monthEnd, "yyyy-MM-dd"),
      },
    ],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/tasks?focus_date_gte=${format(monthStart, "yyyy-MM-dd")}&focus_date_lte=${format(monthEnd, "yyyy-MM-dd")}`
      );
      return await res.json();
    },
  });

  // Fetch calendar events for the selected week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
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
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Fetch ventures
  const { data: ventures = [] } = useQuery<Venture[]>({
    queryKey: ["/api/ventures"],
  });

  const calendarEvents = calendarData?.events || [];
  const isCalendarConfigured = calendarData?.configured ?? false;

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks.filter(
      (task) =>
        task.focusDate === dateStr ||
        task.dueDate === dateStr
    );
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return calendarEvents.filter((event) => {
      const eventDate = event.start.dateTime
        ? format(parseISO(event.start.dateTime), "yyyy-MM-dd")
        : event.start.date;
      return eventDate === dateStr;
    });
  };

  const selectedTasks = getTasksForDate(selectedDate);
  const selectedEvents = getEventsForDate(selectedDate);

  const getVentureColor = (ventureId: string | null) => {
    if (!ventureId) return "#6b7280";
    const venture = ventures.find((v) => v.id === ventureId);
    return venture?.color || "#6b7280";
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      P0: "destructive",
      P1: "default",
      P2: "secondary",
      P3: "outline",
    };
    return (
      <Badge variant={variants[priority] || "outline"} className="text-xs">
        {priority}
      </Badge>
    );
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) =>
      direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-full">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Calendar</h1>
              <p className="text-muted-foreground">
                View your schedule, tasks, and events
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-3")}>
          {/* Monthly Calendar */}
          <Card className={cn(isMobile ? "" : "col-span-2")}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {isMobile ? day[0] : day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDate(day);
                  const dayEvents = getEventsForDate(day);
                  const hasItems = dayTasks.length > 0 || dayEvents.length > 0;
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square p-1 rounded-lg transition-all relative",
                        "hover:bg-accent",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                        !isCurrentMonth && "text-muted-foreground/50",
                        isToday(day) && !isSelected && "ring-2 ring-primary"
                      )}
                    >
                      <div className="text-sm font-medium">{format(day, "d")}</div>
                      {hasItems && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayTasks.length > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                          {dayEvents.length > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Tasks</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Events</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {isToday(selectedDate)
                  ? "Today"
                  : format(selectedDate, "EEEE, MMM d")}
              </CardTitle>
              {isToday(selectedDate) && (
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {selectedTasks.length === 0 && selectedEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No items scheduled</p>
                    <p className="text-sm">This day is clear</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Calendar Events */}
                    {selectedEvents.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Events
                        </h4>
                        {selectedEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {event.summary || "No title"}
                                </div>
                                {event.start.dateTime && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    {format(parseISO(event.start.dateTime), "h:mm a")}
                                    {event.end?.dateTime && (
                                      <> - {format(parseISO(event.end.dateTime), "h:mm a")}</>
                                    )}
                                  </div>
                                )}
                              </div>
                              {event.hangoutLink && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => window.open(event.hangoutLink, "_blank")}
                                >
                                  <Video className="h-4 w-4 text-emerald-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tasks */}
                    {selectedTasks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Tasks
                        </h4>
                        {selectedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            style={{
                              borderLeftColor: getVentureColor(task.ventureId),
                              borderLeftWidth: "3px",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              {task.status === "done" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className={cn(
                                  "font-medium text-sm",
                                  task.status === "done" && "line-through text-muted-foreground"
                                )}>
                                  {task.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {getPriorityBadge(task.priority)}
                                  {task.focusSlot && (
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {task.focusSlot.replace("_", " ")}
                                    </span>
                                  )}
                                  {task.estEffort && (
                                    <span className="text-xs text-muted-foreground">
                                      {task.estEffort}h
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Calendar Integration Status */}
              {!isCalendarConfigured && (
                <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Connect Google Calendar</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Go to Settings → Integrations to sync your calendar events
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
