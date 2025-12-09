/**
 * Phases Routes
 * CRUD operations for project phases/milestones
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertPhaseSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all phases (optionally filter by project)
router.get("/", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string;
    const phases = await storage.getPhases(projectId ? { projectId } : undefined);
    res.json(phases);
  } catch (error) {
    logger.error({ error }, "Error fetching phases");
    res.status(500).json({ error: "Failed to fetch phases" });
  }
});

// Get single phase
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const phase = await storage.getPhase(req.params.id);
    if (!phase) {
      return res.status(404).json({ error: "Phase not found" });
    }
    res.json(phase);
  } catch (error) {
    logger.error({ error }, "Error fetching phase");
    res.status(500).json({ error: "Failed to fetch phase" });
  }
});

// Create phase
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertPhaseSchema.parse(req.body);
    const phase = await storage.createPhase(validatedData);
    res.status(201).json(phase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid phase data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating phase");
      res.status(500).json({ error: "Failed to create phase" });
    }
  }
});

// Update phase
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    logger.info({ phaseId: req.params.id, body: req.body }, "Updating phase");
    const updates = insertPhaseSchema.partial().parse(req.body);
    logger.info({ phaseId: req.params.id, updates }, "Validated phase updates");
    const phase = await storage.updatePhase(req.params.id, updates);
    if (!phase) {
      return res.status(404).json({ error: "Phase not found" });
    }
    res.json(phase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid phase data", details: error.errors });
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error({ error, errorMessage, errorStack, phaseId: req.params.id, body: req.body }, "Error updating phase");
      res.status(500).json({ error: "Failed to update phase", details: errorMessage });
    }
  }
});

// Delete phase
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deletePhase(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting phase");
    res.status(500).json({ error: "Failed to delete phase" });
  }
});

export default router;
