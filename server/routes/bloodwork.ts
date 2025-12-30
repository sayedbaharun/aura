/**
 * Bloodwork Routes
 * Handles quarterly bloodwork/lab results tracking for health optimization
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertBloodworkEntrySchema } from "@shared/schema";

const router = Router();

// Get all bloodwork entries with optional date range filter
router.get("/", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const entries = await storage.getBloodworkEntries({
      dateGte: startDate as string | undefined,
      dateLte: endDate as string | undefined,
    });

    res.json(entries);
  } catch (error) {
    logger.error({ error }, "[Bloodwork] Failed to fetch entries");
    res.status(500).json({ message: "Failed to fetch bloodwork entries" });
  }
});

// Get a single bloodwork entry
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const entry = await storage.getBloodworkEntry(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: "Bloodwork entry not found" });
    }

    res.json(entry);
  } catch (error) {
    logger.error({ error }, "[Bloodwork] Failed to fetch entry");
    res.status(500).json({ message: "Failed to fetch bloodwork entry" });
  }
});

// Create a new bloodwork entry
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = insertBloodworkEntrySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid bloodwork data",
        errors: parsed.error.errors
      });
    }

    // Auto-calculate HOMA-IR if fasting glucose and insulin are provided
    let entryData = { ...parsed.data };
    if (entryData.fastingGlucose && entryData.fastingInsulin && !entryData.homaIr) {
      entryData.homaIr = (entryData.fastingGlucose * entryData.fastingInsulin) / 405;
    }

    const entry = await storage.createBloodworkEntry(entryData);
    res.status(201).json(entry);
  } catch (error) {
    logger.error({ error }, "[Bloodwork] Failed to create entry");
    res.status(500).json({ message: "Failed to create bloodwork entry" });
  }
});

// Update a bloodwork entry
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await storage.getBloodworkEntry(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Bloodwork entry not found" });
    }

    // Merge with existing and auto-calculate HOMA-IR if needed
    let updateData = { ...req.body };
    const fastingGlucose = updateData.fastingGlucose ?? existing.fastingGlucose;
    const fastingInsulin = updateData.fastingInsulin ?? existing.fastingInsulin;

    if (fastingGlucose && fastingInsulin && !updateData.homaIr) {
      updateData.homaIr = (fastingGlucose * fastingInsulin) / 405;
    }

    const updated = await storage.updateBloodworkEntry(req.params.id, updateData);
    res.json(updated);
  } catch (error) {
    logger.error({ error }, "[Bloodwork] Failed to update entry");
    res.status(500).json({ message: "Failed to update bloodwork entry" });
  }
});

// Delete a bloodwork entry
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await storage.getBloodworkEntry(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Bloodwork entry not found" });
    }

    await storage.deleteBloodworkEntry(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "[Bloodwork] Failed to delete entry");
    res.status(500).json({ message: "Failed to delete bloodwork entry" });
  }
});

// Get the latest bloodwork entry (for dashboard/quick view)
router.get("/latest/one", async (req: Request, res: Response) => {
  try {
    const entries = await storage.getBloodworkEntries();
    const latest = entries[0] || null;
    res.json(latest);
  } catch (error) {
    logger.error({ error }, "[Bloodwork] Failed to fetch latest entry");
    res.status(500).json({ message: "Failed to fetch latest bloodwork entry" });
  }
});

export default router;
