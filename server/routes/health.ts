/**
 * Health Routes
 * CRUD operations for health entries
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertHealthEntrySchema } from "@shared/schema";
import { z } from "zod";
import { isValidUUID } from "./constants";

const router = Router();

// Get health entries (with date range)
router.get("/", async (req: Request, res: Response) => {
  try {
    const filters = {
      dateGte: req.query.date_gte as string,
      dateLte: req.query.date_lte as string,
    };

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    const entries = await storage.getHealthEntries(cleanFilters);
    res.json(entries);
  } catch (error) {
    logger.error({ error }, "Error fetching health entries");
    res.status(500).json({ error: "Failed to fetch health entries" });
  }
});

// Get single health entry
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID format to prevent PostgreSQL errors
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid health entry ID format" });
    }

    const entry = await storage.getHealthEntry(id);
    if (!entry) {
      return res.status(404).json({ error: "Health entry not found" });
    }
    res.json(entry);
  } catch (error) {
    logger.error({ error }, "Error fetching health entry");
    res.status(500).json({ error: "Failed to fetch health entry" });
  }
});

// Create health entry (auto-link to Day)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { date, ...healthData } = insertHealthEntrySchema.parse(req.body);

    // Ensure Day exists for this date (date is already a string in YYYY-MM-DD format)
    const day = await storage.getDayOrCreate(date);

    // Create health entry with dayId
    const entry = await storage.createHealthEntry({
      ...healthData,
      dayId: day.id,
      date,
    } as any);

    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid health entry data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating health entry");
      res.status(500).json({ error: "Failed to create health entry" });
    }
  }
});

// Update health entry
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID format to prevent PostgreSQL errors
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "Invalid health entry ID format" });
    }

    const updates = insertHealthEntrySchema.partial().parse(req.body);
    const entry = await storage.updateHealthEntry(id, updates);
    if (!entry) {
      return res.status(404).json({ error: "Health entry not found" });
    }
    res.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid health entry data", details: error.errors });
    } else {
      logger.error({ error }, "Error updating health entry");
      res.status(500).json({ error: "Failed to update health entry" });
    }
  }
});

export default router;
