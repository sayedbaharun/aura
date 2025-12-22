/**
 * Fear Settings Routes
 * Tim Ferriss-style fear-setting exercise for decision making
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertFearSettingSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all fear settings for user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { ventureId, status } = req.query;
    const fearSettings = await storage.getFearSettings({
      userId,
      ventureId: ventureId as string,
      status: status as string,
    });
    res.json(fearSettings);
  } catch (error) {
    logger.error({ error }, "Error fetching fear settings");
    res.status(500).json({ error: "Failed to fetch fear settings" });
  }
});

// Get single fear setting
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const fearSetting = await storage.getFearSetting(req.params.id);
    if (!fearSetting) {
      return res.status(404).json({ error: "Fear setting not found" });
    }
    res.json(fearSetting);
  } catch (error) {
    logger.error({ error }, "Error fetching fear setting");
    res.status(500).json({ error: "Failed to fetch fear setting" });
  }
});

// Create fear setting
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const validatedData = insertFearSettingSchema.parse({
      ...req.body,
      userId,
    });
    const fearSetting = await storage.createFearSetting(validatedData);
    res.status(201).json(fearSetting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid fear setting data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating fear setting");
      res.status(500).json({ error: "Failed to create fear setting" });
    }
  }
});

// Update fear setting
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const updates = insertFearSettingSchema.partial().parse(req.body);
    const fearSetting = await storage.updateFearSetting(req.params.id, updates);
    if (!fearSetting) {
      return res.status(404).json({ error: "Fear setting not found" });
    }
    res.json(fearSetting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid fear setting data", details: error.errors });
    } else {
      logger.error({ error }, "Error updating fear setting");
      res.status(500).json({ error: "Failed to update fear setting" });
    }
  }
});

// Delete fear setting
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteFearSetting(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting fear setting");
    res.status(500).json({ error: "Failed to delete fear setting" });
  }
});

export default router;
