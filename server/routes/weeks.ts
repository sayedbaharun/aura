/**
 * Weekly Planning Routes
 *
 * Handles weekly planning and review (Sunday ritual)
 */

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { insertWeekSchema } from "@shared/schema";
import { getISOWeek, getISOWeekYear, startOfISOWeek, format, addWeeks, subWeeks } from "date-fns";
import { logger } from "../logger";

const router = Router();

// Get current week
router.get("/current", async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const year = getISOWeekYear(today);
    const weekNumber = getISOWeek(today);

    const week = await storage.getWeekOrCreate(year, weekNumber);
    res.json(week);
  } catch (error) {
    logger.error({ error }, "Error fetching current week");
    res.status(500).json({ error: "Failed to fetch current week" });
  }
});

// Get week by ID (week_YYYY-WW)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const week = await storage.getWeek(id);

    if (!week) {
      return res.status(404).json({ error: "Week not found" });
    }

    res.json(week);
  } catch (error) {
    logger.error({ error }, "Error fetching week");
    res.status(500).json({ error: "Failed to fetch week" });
  }
});

// Get weeks for a year
router.get("/", async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const weeks = await storage.getWeeks({ year });
    res.json(weeks);
  } catch (error) {
    logger.error({ error }, "Error fetching weeks");
    res.status(500).json({ error: "Failed to fetch weeks" });
  }
});

// Create or get a specific week
router.post("/", async (req: Request, res: Response) => {
  try {
    const { year, weekNumber } = req.body;

    if (!year || !weekNumber) {
      return res.status(400).json({ error: "year and weekNumber are required" });
    }

    const week = await storage.getWeekOrCreate(year, weekNumber);
    res.json(week);
  } catch (error) {
    logger.error({ error }, "Error creating week");
    res.status(500).json({ error: "Failed to create week" });
  }
});

// Update a week
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const week = await storage.updateWeek(id, updates);

    if (!week) {
      return res.status(404).json({ error: "Week not found" });
    }

    res.json(week);
  } catch (error) {
    logger.error({ error }, "Error updating week");
    res.status(500).json({ error: "Failed to update week" });
  }
});

// Get week metrics (auto-calculated from tasks, health, trading)
router.get("/:id/metrics", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const week = await storage.getWeek(id);

    if (!week) {
      return res.status(404).json({ error: "Week not found" });
    }

    // Calculate the date range for this week
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const dateGte = format(weekStart, 'yyyy-MM-dd');
    const dateLte = format(weekEnd, 'yyyy-MM-dd');

    // Get tasks completed this week
    const allTasks = await storage.getTasks({});
    const tasksThisWeek = allTasks.filter(t => {
      if (!t.completedAt) return false;
      const completedDate = t.completedAt.split('T')[0];
      return completedDate >= dateGte && completedDate <= dateLte;
    });

    // Get health entries this week
    const healthEntries = await storage.getHealthEntries({ dateGte, dateLte });
    const avgEnergy = healthEntries.length > 0
      ? healthEntries.reduce((sum, h) => sum + (h.energyLevel || 0), 0) / healthEntries.length
      : 0;
    const avgSleep = healthEntries.length > 0
      ? healthEntries.reduce((sum, h) => sum + (h.sleepHours || 0), 0) / healthEntries.length
      : 0;

    // Calculate deep work hours (tasks with type = deep_work and actualEffort)
    const deepWorkTasks = tasksThisWeek.filter(t => t.type === 'deep_work');
    const deepWorkHours = deepWorkTasks.reduce((sum, t) => sum + (t.actualEffort || 0), 0);

    const metrics = {
      tasksCompleted: tasksThisWeek.length,
      deepWorkHours: Math.round(deepWorkHours * 10) / 10,
      avgEnergy: Math.round(avgEnergy * 10) / 10,
      avgSleep: Math.round(avgSleep * 10) / 10,
      healthEntriesCount: healthEntries.length,
    };

    res.json(metrics);
  } catch (error) {
    logger.error({ error }, "Error calculating week metrics");
    res.status(500).json({ error: "Failed to calculate week metrics" });
  }
});

// Navigate to adjacent weeks
router.get("/:id/adjacent", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const week = await storage.getWeek(id);

    if (!week) {
      return res.status(404).json({ error: "Week not found" });
    }

    const weekStart = new Date(week.weekStart);

    // Previous week
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevYear = getISOWeekYear(prevWeekStart);
    const prevWeekNum = getISOWeek(prevWeekStart);
    const prevWeekId = `week_${prevYear}-${String(prevWeekNum).padStart(2, '0')}`;

    // Next week
    const nextWeekStart = addWeeks(weekStart, 1);
    const nextYear = getISOWeekYear(nextWeekStart);
    const nextWeekNum = getISOWeek(nextWeekStart);
    const nextWeekId = `week_${nextYear}-${String(nextWeekNum).padStart(2, '0')}`;

    res.json({
      previous: prevWeekId,
      next: nextWeekId,
    });
  } catch (error) {
    logger.error({ error }, "Error getting adjacent weeks");
    res.status(500).json({ error: "Failed to get adjacent weeks" });
  }
});

export default router;
