/**
 * Captures Routes
 * CRUD operations for capture items (inbox/brain dump)
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertCaptureItemSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all captures (optionally filter by clarified status)
router.get("/", async (req: Request, res: Response) => {
  try {
    const clarifiedParam = req.query.clarified as string;
    const filters = clarifiedParam !== undefined
      ? { clarified: clarifiedParam === 'true' }
      : undefined;

    const captures = await storage.getCaptures(filters);
    res.json(captures);
  } catch (error) {
    logger.error({ error }, "Error fetching captures");
    res.status(500).json({ error: "Failed to fetch captures" });
  }
});

// Get single capture
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const capture = await storage.getCapture(req.params.id);
    if (!capture) {
      return res.status(404).json({ error: "Capture not found" });
    }
    res.json(capture);
  } catch (error) {
    logger.error({ error }, "Error fetching capture");
    res.status(500).json({ error: "Failed to fetch capture" });
  }
});

// Create capture
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertCaptureItemSchema.parse(req.body);
    const capture = await storage.createCapture(validatedData);
    res.status(201).json(capture);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid capture data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating capture");
      res.status(500).json({ error: "Failed to create capture" });
    }
  }
});

// Update capture
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const updates = insertCaptureItemSchema.partial().parse(req.body);
    const capture = await storage.updateCapture(req.params.id, updates);
    if (!capture) {
      return res.status(404).json({ error: "Capture not found" });
    }
    res.json(capture);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid capture data", details: error.errors });
    } else {
      logger.error({ error }, "Error updating capture");
      res.status(500).json({ error: "Failed to update capture" });
    }
  }
});

// Convert capture to task
router.post("/:id/convert", async (req: Request, res: Response) => {
  try {
    const capture = await storage.getCapture(req.params.id);
    if (!capture) {
      return res.status(404).json({ error: "Capture not found" });
    }

    // Create task from capture
    const task = await storage.createTask({
      title: capture.title,
      notes: capture.notes,
      ventureId: capture.ventureId,
      projectId: capture.projectId,
      status: 'next',
    });

    // Mark capture as clarified and link to task
    await storage.updateCapture(req.params.id, {
      clarified: true,
      linkedTaskId: task.id,
    });

    res.json({ task, capture: { ...capture, clarified: true, linkedTaskId: task.id } });
  } catch (error) {
    logger.error({ error }, "Error converting capture to task");
    res.status(500).json({ error: "Failed to convert capture" });
  }
});

// Delete capture
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteCapture(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting capture");
    res.status(500).json({ error: "Failed to delete capture" });
  }
});

export default router;
