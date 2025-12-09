/**
 * Attachments Routes
 * CRUD operations for document attachments
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertAttachmentSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get single attachment
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const attachment = await storage.getAttachment(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }
    res.json(attachment);
  } catch (error) {
    logger.error({ error }, "Error fetching attachment");
    res.status(500).json({ error: "Failed to fetch attachment" });
  }
});

// Create attachment
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertAttachmentSchema.parse(req.body);
    const attachment = await storage.createAttachment(validatedData);
    res.status(201).json(attachment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid attachment data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating attachment");
      res.status(500).json({ error: "Failed to create attachment" });
    }
  }
});

// Delete attachment
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteAttachment(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting attachment");
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

export default router;
