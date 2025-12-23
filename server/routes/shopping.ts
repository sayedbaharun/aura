/**
 * Shopping Routes
 * CRUD operations for shopping list items with TickTick bidirectional sync
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertShoppingItemSchema } from "@shared/schema";
import { z } from "zod";
import * as ticktick from "../ticktick";

const router = Router();

// Helper to parse TickTick externalId (format: ticktick:<projectId>:<taskId> or ticktick:<taskId>)
function parseTickTickExternalId(externalId: string | null): { projectId: string; taskId: string } | null {
  if (!externalId || !externalId.startsWith('ticktick:')) return null;

  const parts = externalId.split(':');
  if (parts.length === 3) {
    // New format: ticktick:<projectId>:<taskId>
    return { projectId: parts[1], taskId: parts[2] };
  }
  // Old format: ticktick:<taskId> - can't sync without projectId
  return null;
}

// Helper to find the shopping project in TickTick
async function findShoppingProject(): Promise<string | null> {
  try {
    const projects = await ticktick.getProjects();
    const shoppingProject = projects.find(p =>
      p.name.toLowerCase().includes('shopping')
    );
    return shoppingProject?.id || null;
  } catch (error) {
    logger.warn({ error }, "Failed to find TickTick shopping project");
    return null;
  }
}

// Map SB-OS priority to TickTick priority
function mapPriorityToTickTick(priority: 'P1' | 'P2' | 'P3'): number {
  switch (priority) {
    case 'P1': return ticktick.TICKTICK_PRIORITY.HIGH;
    case 'P2': return ticktick.TICKTICK_PRIORITY.MEDIUM;
    case 'P3': return ticktick.TICKTICK_PRIORITY.LOW;
    default: return ticktick.TICKTICK_PRIORITY.NONE;
  }
}

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

// Create shopping item (optionally sync to TickTick)
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertShoppingItemSchema.parse(req.body);
    const syncToTickTick = req.body.syncToTickTick === true;

    let externalId: string | null = validatedData.externalId || null;

    // If syncToTickTick is requested and TickTick is configured, create in TickTick first
    if (syncToTickTick && process.env.TICKTICK_ACCESS_TOKEN && !externalId) {
      try {
        const projectId = await findShoppingProject();
        if (projectId) {
          // Build tags from category
          const tags: string[] = [];
          if (validatedData.category) {
            tags.push(validatedData.category);
          }

          const ticktickTask = await ticktick.createTask({
            title: validatedData.item,
            projectId,
            content: validatedData.notes || undefined,
            priority: mapPriorityToTickTick(validatedData.priority || 'P2'),
            tags,
          });

          externalId = `ticktick:${projectId}:${ticktickTask.id}`;
          logger.info({ ticktickId: ticktickTask.id, item: validatedData.item }, "Created shopping item in TickTick");
        }
      } catch (ticktickError) {
        // Don't fail the creation if TickTick sync fails
        logger.warn({ error: ticktickError }, "Failed to sync shopping item to TickTick");
      }
    }

    const item = await storage.createShoppingItem({
      ...validatedData,
      externalId,
    });
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

// Update shopping item (sync status changes to TickTick)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const updates = insertShoppingItemSchema.partial().parse(req.body);

    // Get current item to check for status changes
    const currentItem = await storage.getShoppingItem(req.params.id);
    if (!currentItem) {
      return res.status(404).json({ error: "Shopping item not found" });
    }

    // Check if status is changing to purchased
    const isBeingPurchased = updates.status === 'purchased' && currentItem.status !== 'purchased';
    const isBeingUnpurchased = updates.status === 'to_buy' && currentItem.status === 'purchased';

    // Sync to TickTick if the item has a TickTick externalId
    if (process.env.TICKTICK_ACCESS_TOKEN && currentItem.externalId) {
      const ticktickInfo = parseTickTickExternalId(currentItem.externalId);

      if (ticktickInfo) {
        try {
          if (isBeingPurchased) {
            // Complete the task in TickTick
            await ticktick.completeTask(ticktickInfo.projectId, ticktickInfo.taskId);
            logger.info({
              ticktickProjectId: ticktickInfo.projectId,
              ticktickTaskId: ticktickInfo.taskId,
              item: currentItem.item,
            }, "Completed shopping item in TickTick");
          } else if (isBeingUnpurchased) {
            // If un-purchasing, we'd need to recreate the task (TickTick doesn't have an uncomplete)
            // For now, we'll just log this
            logger.info({
              ticktickProjectId: ticktickInfo.projectId,
              ticktickTaskId: ticktickInfo.taskId,
              item: currentItem.item,
            }, "Item un-purchased - TickTick task remains completed");
          }
        } catch (ticktickError) {
          // Don't fail the update if TickTick sync fails
          logger.warn({ error: ticktickError }, "Failed to sync status change to TickTick");
        }
      }
    }

    const item = await storage.updateShoppingItem(req.params.id, updates);
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

// Delete shopping item (optionally delete from TickTick)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    // Get the item first to check for TickTick sync
    const item = await storage.getShoppingItem(req.params.id);

    if (item && process.env.TICKTICK_ACCESS_TOKEN && item.externalId) {
      const ticktickInfo = parseTickTickExternalId(item.externalId);
      if (ticktickInfo) {
        try {
          await ticktick.deleteTask(ticktickInfo.projectId, ticktickInfo.taskId);
          logger.info({
            ticktickProjectId: ticktickInfo.projectId,
            ticktickTaskId: ticktickInfo.taskId,
            item: item.item,
          }, "Deleted shopping item from TickTick");
        } catch (ticktickError) {
          // Don't fail the deletion if TickTick sync fails
          logger.warn({ error: ticktickError }, "Failed to delete item from TickTick");
        }
      }
    }

    await storage.deleteShoppingItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting shopping item");
    res.status(500).json({ error: "Failed to delete shopping item" });
  }
});

// Push local shopping items to TickTick
router.post("/push-to-ticktick", async (req: Request, res: Response) => {
  try {
    if (!process.env.TICKTICK_ACCESS_TOKEN) {
      return res.status(503).json({ error: "TickTick not configured" });
    }

    const projectId = await findShoppingProject();
    if (!projectId) {
      return res.status(400).json({
        error: "No shopping project found",
        message: "Please create a project named 'Shopping' in TickTick",
      });
    }

    // Get all to_buy items without TickTick externalId
    const items = await storage.getShoppingItems({ status: 'to_buy' });
    const itemsToSync = items.filter((item: any) =>
      !item.externalId || !item.externalId.startsWith('ticktick:')
    );

    const result = {
      pushed: 0,
      errors: [] as string[],
      items: [] as Array<{ id: string; item: string; ticktickId?: string }>,
    };

    for (const item of itemsToSync) {
      try {
        const tags: string[] = [];
        if (item.category) {
          tags.push(item.category);
        }

        const ticktickTask = await ticktick.createTask({
          title: item.item,
          projectId,
          content: item.notes || undefined,
          priority: mapPriorityToTickTick(item.priority),
          tags,
        });

        // Update the item with the TickTick externalId
        const externalId = `ticktick:${projectId}:${ticktickTask.id}`;
        await storage.updateShoppingItem(item.id, { externalId });

        result.pushed++;
        result.items.push({
          id: item.id,
          item: item.item,
          ticktickId: ticktickTask.id,
        });

        logger.info({
          shoppingItemId: item.id,
          ticktickId: ticktickTask.id,
          item: item.item,
        }, "Pushed shopping item to TickTick");
      } catch (error: any) {
        result.errors.push(`Failed to push "${item.item}": ${error.message}`);
        logger.error({ error, itemId: item.id }, "Error pushing shopping item to TickTick");
      }
    }

    res.json({
      success: true,
      ...result,
      message: `Pushed ${result.pushed} items to TickTick`,
    });
  } catch (error) {
    logger.error({ error }, "Error pushing shopping items to TickTick");
    res.status(500).json({ error: "Failed to push shopping items to TickTick" });
  }
});

export default router;
