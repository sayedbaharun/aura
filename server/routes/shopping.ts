/**
 * Shopping Routes
 * CRUD operations for shopping list items
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertShoppingItemSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all shopping items
router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const category = req.query.category as string;
    const items = await storage.getShoppingItems({ status, category });
    res.json(items);
  } catch (error) {
    logger.error({ error }, "Error fetching shopping items");
    res.status(500).json({ error: "Failed to fetch shopping items" });
  }
});

// Get single shopping item
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const item = await storage.getShoppingItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Shopping item not found" });
    }
    res.json(item);
  } catch (error) {
    logger.error({ error }, "Error fetching shopping item");
    res.status(500).json({ error: "Failed to fetch shopping item" });
  }
});

// Create shopping item
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertShoppingItemSchema.parse(req.body);
    const item = await storage.createShoppingItem(validatedData);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid shopping item data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating shopping item");
      res.status(500).json({ error: "Failed to create shopping item" });
    }
  }
});

// Update shopping item
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const updates = insertShoppingItemSchema.partial().parse(req.body);
    const item = await storage.updateShoppingItem(req.params.id, updates);
    if (!item) {
      return res.status(404).json({ error: "Shopping item not found" });
    }
    res.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid shopping item data", details: error.errors });
    } else {
      logger.error({ error }, "Error updating shopping item");
      res.status(500).json({ error: "Failed to update shopping item" });
    }
  }
});

// Delete shopping item
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteShoppingItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting shopping item");
    res.status(500).json({ error: "Failed to delete shopping item" });
  }
});

export default router;
