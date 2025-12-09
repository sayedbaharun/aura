/**
 * Dashboard Routes
 * Handles readiness, ventures overview, inbox, tasks, urgent items, top3, day, and next meeting
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { PRIORITY_ORDER } from "./constants";

const router = Router();

// Get readiness score based on health data
router.get("/readiness", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[Readiness API] Hit. Date: ${today}`);
    const entries = await storage.getHealthEntries({ dateGte: today, dateLte: today });
    const entry = entries[0];
    console.log(`[Readiness API] Entry found:`, entry ? "Yes" : "No");

    if (!entry) {
      return res.json({
        percentage: 0,
        sleep: 0,
        mood: "unknown",
        status: "no_data"
      });
    }

    // Calculate Readiness Score
    let score = 0;

    // 1. Sleep (50%) - Granular
    if (entry.sleepHours) {
      const sleepScore = Math.min((entry.sleepHours / 8) * 50, 50);
      score += sleepScore;
    }

    // 2. Energy (20%)
    if (entry.energyLevel) {
      score += (entry.energyLevel / 5) * 20;
    }

    // 3. Mood (15%)
    if (entry.mood === 'peak' || entry.mood === 'high') {
      score += 15;
    } else if (entry.mood === 'medium') {
      score += 10;
    } else {
      score += 5;
    }

    // 4. Stress (10%)
    if (entry.stressLevel === 'low') {
      score += 10;
    } else if (entry.stressLevel === 'medium') {
      score += 5;
    }

    // 5. Workout (5%)
    if (entry.workoutDone) {
      score += 5;
    }

    score = Math.round(score);

    res.json({
      percentage: score,
      sleep: entry.sleepHours || 0,
      mood: entry.mood || "unknown",
      status: "calculated"
    });
  } catch (error) {
    console.error("[Readiness API] Error:", error);
    res.status(500).json({ message: "Failed to calculate readiness" });
  }
});

// Get ventures overview for dashboard
router.get("/ventures", async (req: Request, res: Response) => {
  try {
    const [allVentures, allProjects, taskCountsByVenture] = await Promise.all([
      storage.getVentures(),
      storage.getProjects(),
      storage.getActiveTaskCountsByVenture(),
    ]);

    const activeVentures = allVentures.filter(v =>
      ['ongoing', 'building', 'planning', 'active', 'development'].includes(v.status)
    );

    const mappedVentures = activeVentures.map(v => {
      const projectCount = allProjects.filter(p => p.ventureId === v.id).length;
      const taskCounts = taskCountsByVenture.get(v.id) || { total: 0, overdueP0: 0, dueTodayP0P1: 0 };

      let urgency: 'critical' | 'warning' | 'clear' = 'clear';
      let urgencyColor = "bg-green-500";
      let urgencyLabel = "";

      if (taskCounts.overdueP0 > 0) {
        urgency = 'critical';
        urgencyColor = "bg-red-500";
        urgencyLabel = `${taskCounts.overdueP0} overdue`;
      } else if (taskCounts.dueTodayP0P1 > 0) {
        urgency = 'warning';
        urgencyColor = "bg-yellow-500";
        urgencyLabel = `${taskCounts.dueTodayP0P1} due today`;
      }

      return {
        id: v.id,
        name: v.name,
        projectCount,
        taskCount: taskCounts.total,
        urgency,
        urgencyColor,
        urgencyLabel,
        overdueP0Count: taskCounts.overdueP0,
        dueTodayCount: taskCounts.dueTodayP0P1
      };
    });

    const urgencyOrder = { critical: 0, warning: 1, clear: 2 };
    mappedVentures.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    res.json(mappedVentures);
  } catch (error) {
    console.error("[Dashboard Ventures] Error:", error);
    res.status(500).json({ message: "Failed to fetch ventures" });
  }
});

// Get inbox count and preview
router.get("/inbox", async (req: Request, res: Response) => {
  try {
    const items = await storage.getCaptures({ clarified: false });

    const topItems = items
      .slice(0, 3)
      .map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        source: item.source
      }));

    res.json({
      count: items.length,
      items: topItems
    });
  } catch (error) {
    console.error("[Dashboard Inbox] Error:", error);
    res.status(500).json({ message: "Failed to fetch inbox count" });
  }
});

// Get today's tasks
router.get("/tasks", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await storage.getTasksForToday(today);

    const activeTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status));

    activeTasks.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99;
      const pB = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99;
      return pA - pB;
    });

    res.json(activeTasks);
  } catch (error) {
    console.error("[Dashboard Tasks] Error:", error);
    res.status(500).json({ message: "Failed to fetch today's tasks" });
  }
});

// Get urgent tasks
router.get("/urgent", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const urgentTasks = await storage.getUrgentTasks(today, 5);

    const isOnFire = urgentTasks.some(t =>
      t.priority === 'P0' && t.dueDate && t.dueDate < today
    );

    res.json({
      tasks: urgentTasks,
      count: urgentTasks.length,
      onFire: isOnFire
    });
  } catch (error) {
    console.error("[Dashboard Urgent] Error:", error);
    res.status(500).json({ message: "Failed to fetch urgent tasks" });
  }
});

// Get top 3 priority tasks for today
router.get("/top3", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get top priority tasks (P0, P1) that are active
    const topTasks = await storage.getTopPriorityTasks(today, 3);

    // Enhance tasks with additional context
    const enhancedTasks = topTasks.map(task => {
      const isOverdue = task.dueDate && task.dueDate < today;
      const isDueToday = task.dueDate === today;

      return {
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        focusDate: task.focusDate,
        ventureId: task.ventureId,
        projectId: task.projectId,
        isOverdue,
        isDueToday
      };
    });

    res.json({ tasks: enhancedTasks });
  } catch (error) {
    console.error("[Dashboard Top3] Error:", error);
    res.status(500).json({ message: "Failed to fetch top 3 tasks" });
  }
});

// Get current day data
router.get("/day", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const day = await storage.getDayOrCreate(today);

    // Get the primary venture name if set
    let primaryVentureName = null;
    if (day.primaryVentureFocus) {
      const venture = await storage.getVenture(String(day.primaryVentureFocus));
      primaryVentureName = venture?.name || null;
    }

    res.json({
      id: day.id,
      date: day.date,
      title: day.title,
      mood: day.mood,
      top3Outcomes: day.top3Outcomes,
      oneThingToShip: day.oneThingToShip,
      reflectionAm: day.reflectionAm,
      reflectionPm: day.reflectionPm,
      primaryVentureFocus: day.primaryVentureFocus,
      primaryVentureName
    });
  } catch (error) {
    console.error("[Dashboard Day] Error:", error);
    res.status(500).json({ message: "Failed to fetch day summary" });
  }
});

// Get next meeting from Google Calendar
router.get("/next-meeting", async (req: Request, res: Response) => {
  try {
    // Check if calendar is configured
    const calendarConfigured = !!(
      process.env.GOOGLE_CALENDAR_CLIENT_ID &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
      process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
    );

    if (!calendarConfigured) {
      return res.json({
        configured: false,
        meeting: null
      });
    }

    // Get events from now until end of day
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const { listEvents } = await import("../google-calendar");
      const events = await listEvents(now, endOfDay, 5);

      // Find the next upcoming event (not already started)
      const upcomingEvents = events.filter((event: any) => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        return eventStart > now;
      });

      if (upcomingEvents.length === 0) {
        return res.json({
          configured: true,
          meeting: null
        });
      }

      const nextEvent = upcomingEvents[0];
      const startTimeStr = nextEvent.start?.dateTime || nextEvent.start?.date;
      if (!startTimeStr) {
        return res.json({
          configured: true,
          meeting: null
        });
      }
      const eventStart = new Date(startTimeStr);
      const minutesUntil = Math.round((eventStart.getTime() - now.getTime()) / 60000);

      res.json({
        configured: true,
        meeting: {
          id: nextEvent.id,
          title: nextEvent.summary || "Untitled Event",
          startTime: nextEvent.start?.dateTime || nextEvent.start?.date,
          endTime: nextEvent.end?.dateTime || nextEvent.end?.date,
          minutesUntil,
          location: nextEvent.location || null,
          meetLink: nextEvent.hangoutLink || null,
          link: nextEvent.htmlLink,
        }
      });
    } catch (calendarError) {
      logger.error({ error: calendarError }, "Error fetching calendar events");
      res.json({
        connected: true,
        meeting: null,
        error: "Failed to fetch calendar events"
      });
    }
  } catch (error) {
    console.error("[Dashboard Next Meeting] Error:", error);
    res.status(500).json({ message: "Failed to fetch next meeting" });
  }
});

export default router;
