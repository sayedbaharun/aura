/**
 * TickTick Integration Routes
 * Sync tasks between TickTick and SB-OS
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import * as ticktick from "../ticktick";

const router = Router();

// Get TickTick connection status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = await ticktick.checkConnection();
    res.json(status);
  } catch (error) {
    logger.error({ error }, "Error checking TickTick status");
    res.status(500).json({ error: "Failed to check TickTick connection" });
  }
});

// Get all TickTick projects (lists)
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const projects = await ticktick.getProjects();
    res.json(projects);
  } catch (error) {
    logger.error({ error }, "Error fetching TickTick projects");
    res.status(500).json({ error: "Failed to fetch TickTick projects" });
  }
});

// Get tasks from a specific TickTick project
router.get("/projects/:projectId/tasks", async (req: Request, res: Response) => {
  try {
    const tasks = await ticktick.getProjectTasks(req.params.projectId);
    res.json(tasks);
  } catch (error) {
    logger.error({ error, projectId: req.params.projectId }, "Error fetching TickTick tasks");
    res.status(500).json({ error: "Failed to fetch TickTick tasks" });
  }
});

// Get or create the SB-OS Inbox project in TickTick
router.post("/inbox/setup", async (req: Request, res: Response) => {
  try {
    const inboxName = req.body.name || process.env.TICKTICK_INBOX_NAME || "SB-OS Inbox";
    const project = await ticktick.getOrCreateInboxProject(inboxName);
    res.json({
      success: true,
      project,
      message: `Inbox project "${project.name}" is ready. Add tasks to this list in TickTick and sync them to SB-OS.`,
    });
  } catch (error) {
    logger.error({ error }, "Error setting up TickTick inbox");
    res.status(500).json({ error: "Failed to setup TickTick inbox" });
  }
});

// Sync tasks from TickTick inbox to SB-OS capture items
router.post("/sync", async (req: Request, res: Response) => {
  try {
    // Get the inbox project ID
    const inboxProjectId = req.body.projectId || await ticktick.getInboxProjectId();

    if (!inboxProjectId) {
      return res.status(400).json({
        error: "No inbox project configured",
        message: "Please set up the inbox first using POST /api/ticktick/inbox/setup or provide a projectId",
      });
    }

    // Fetch tasks from TickTick
    const ticktickTasks = await ticktick.getProjectTasks(inboxProjectId);

    // Filter to only incomplete tasks
    const incompleteTasks = ticktickTasks.filter(
      t => t.status === ticktick.TICKTICK_STATUS.NORMAL
    );

    const result: ticktick.TickTickSyncResult = {
      synced: 0,
      skipped: 0,
      errors: [],
      items: [],
    };

    // Get existing capture items with TickTick external IDs to avoid duplicates
    const existingCaptures = await storage.getCaptures({ clarified: false });
    const existingExternalIds = new Set(
      existingCaptures
        .filter(c => c.externalId?.startsWith('ticktick:'))
        .map(c => c.externalId)
    );

    // Process each TickTick task
    for (const task of incompleteTasks) {
      const externalId = `ticktick:${task.id}`;

      // Skip if already synced
      if (existingExternalIds.has(externalId)) {
        result.skipped++;
        result.items.push({
          tickTickId: task.id,
          title: task.title,
        });
        continue;
      }

      try {
        // Convert TickTick task to capture item format
        const captureData = ticktick.tickTickTaskToCaptureItem(task);

        // Create capture item in SB-OS
        const capture = await storage.createCapture({
          title: captureData.title,
          type: captureData.type,
          source: captureData.source,
          notes: captureData.notes,
          externalId: captureData.externalId,
          clarified: false,
        });

        result.synced++;
        result.items.push({
          tickTickId: task.id,
          title: task.title,
          captureId: capture.id,
        });

        logger.info({
          tickTickId: task.id,
          captureId: capture.id,
          title: task.title,
        }, "Synced TickTick task to capture item");

      } catch (error: any) {
        result.errors.push(`Failed to sync task "${task.title}": ${error.message}`);
        logger.error({ error, taskId: task.id }, "Error syncing TickTick task");
      }
    }

    // Optionally complete synced tasks in TickTick
    if (req.body.completeAfterSync) {
      for (const item of result.items) {
        if (item.captureId) {
          try {
            await ticktick.completeTask(inboxProjectId, item.tickTickId);
          } catch (error) {
            logger.warn({ error, tickTickId: item.tickTickId }, "Failed to complete TickTick task after sync");
          }
        }
      }
    }

    res.json({
      success: true,
      ...result,
      message: `Synced ${result.synced} new items, skipped ${result.skipped} existing items`,
    });

  } catch (error) {
    logger.error({ error }, "Error syncing from TickTick");
    res.status(500).json({ error: "Failed to sync from TickTick" });
  }
});

// Complete a task in TickTick (after processing in SB-OS)
router.post("/tasks/:taskId/complete", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    await ticktick.completeTask(projectId, req.params.taskId);
    res.json({ success: true, message: "Task completed in TickTick" });
  } catch (error) {
    logger.error({ error, taskId: req.params.taskId }, "Error completing TickTick task");
    res.status(500).json({ error: "Failed to complete TickTick task" });
  }
});

// Create a task in TickTick (push from SB-OS)
router.post("/tasks", async (req: Request, res: Response) => {
  try {
    const { title, projectId, content, dueDate, priority } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ error: "title and projectId are required" });
    }

    const task = await ticktick.createTask({
      title,
      projectId,
      content,
      dueDate,
      priority,
    });

    res.status(201).json(task);
  } catch (error) {
    logger.error({ error }, "Error creating TickTick task");
    res.status(500).json({ error: "Failed to create TickTick task" });
  }
});

// Push SB-OS tasks with focusDate/dueDate to TickTick
router.post("/push-tasks", async (req: Request, res: Response) => {
  try {
    // Get TickTick projects to map domains
    const ticktickProjects = await ticktick.getProjects();

    // Map domain names to TickTick project IDs
    const domainToProject: Record<string, string> = {};

    for (const project of ticktickProjects) {
      // Remove emojis and normalize the name
      const normalizedName = project.name.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim().toLowerCase();

      if (normalizedName.includes('work')) domainToProject['work'] = project.id;
      if (normalizedName.includes('home')) domainToProject['home'] = project.id;
      if (normalizedName.includes('health')) domainToProject['health'] = project.id;
      if (normalizedName.includes('finance')) domainToProject['finance'] = project.id;
      if (normalizedName.includes('travel')) domainToProject['travel'] = project.id;
      if (normalizedName.includes('learning')) domainToProject['learning'] = project.id;
      if (normalizedName.includes('play')) domainToProject['play'] = project.id;
      if (normalizedName.includes('calls')) domainToProject['calls'] = project.id;
      if (normalizedName.includes('personal')) domainToProject['personal'] = project.id;
      if (normalizedName.includes('shopping')) domainToProject['shopping'] = project.id;
    }

    const defaultProjectId = ticktickProjects[0]?.id;

    // Get active tasks with focusDate or dueDate
    const allTasks = await storage.getTasks({});
    const tasksToSync = allTasks.filter(task =>
      (task.focusDate || task.dueDate) &&
      !['completed', 'on_hold'].includes(task.status) &&
      !task.externalId?.startsWith('ticktick:')
    );

    const result = {
      pushed: 0,
      skipped: 0,
      errors: [] as string[],
      items: [] as Array<{ taskId: string; title: string; tickTickId?: string; tickTickProject?: string }>,
    };

    // Map SB-OS priority to TickTick priority
    const priorityMap: Record<string, number> = {
      'P0': ticktick.TICKTICK_PRIORITY.HIGH,
      'P1': ticktick.TICKTICK_PRIORITY.MEDIUM,
      'P2': ticktick.TICKTICK_PRIORITY.LOW,
      'P3': ticktick.TICKTICK_PRIORITY.NONE,
    };

    for (const task of tasksToSync) {
      try {
        const projectId = (task.domain && domainToProject[task.domain]) || defaultProjectId;

        if (!projectId) {
          result.errors.push(`No TickTick project found for task "${task.title}"`);
          continue;
        }

        const taskDate = task.focusDate || task.dueDate;

        const ticktickTask = await ticktick.createTask({
          title: task.title,
          projectId,
          content: task.notes || undefined,
          dueDate: taskDate ? `${taskDate}T09:00:00.000+0000` : undefined,
          priority: task.priority ? priorityMap[task.priority] : ticktick.TICKTICK_PRIORITY.NONE,
        });

        await storage.updateTask(task.id, {
          externalId: `ticktick:${ticktickTask.id}`,
        });

        result.pushed++;
        result.items.push({
          taskId: task.id,
          title: task.title,
          tickTickId: ticktickTask.id,
          tickTickProject: ticktickProjects.find(p => p.id === projectId)?.name,
        });

        logger.info({
          taskId: task.id,
          tickTickId: ticktickTask.id,
          title: task.title,
        }, "Pushed SB-OS task to TickTick");

      } catch (error: any) {
        result.errors.push(`Failed to push task "${task.title}": ${error.message}`);
        logger.error({ error, taskId: task.id }, "Error pushing task to TickTick");
      }
    }

    res.json({
      success: true,
      ...result,
      message: `Pushed ${result.pushed} tasks to TickTick`,
    });

  } catch (error) {
    logger.error({ error }, "Error pushing tasks to TickTick");
    res.status(500).json({ error: "Failed to push tasks to TickTick" });
  }
});

export default router;
