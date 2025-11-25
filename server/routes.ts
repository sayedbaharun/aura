import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertVentureSchema,
  insertProjectSchema,
  insertMilestoneSchema,
  insertTaskSchema,
  insertCaptureItemSchema,
  insertDaySchema,
  insertHealthEntrySchema,
  insertNutritionEntrySchema,
  insertDocSchema,
  insertAttachmentSchema,
  insertUserPreferencesSchema,
  insertCustomCategorySchema,
} from "@shared/schema";
import { getAllIntegrationStatuses, getIntegrationStatus } from "./integrations";
import { z } from "zod";
import { logger } from "./logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  app.get('/health', async (req, res) => {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
      }
    };

    // Check database connectivity
    try {
      await storage.getVentures();
      health.checks.database = true;
    } catch (error) {
      logger.error({ error }, 'Health check: Database connectivity failed');
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // ============================================================================
  // AUTHENTICATION (Mock for single-user)
  // ============================================================================

  app.get('/api/auth/user', async (req: any, res) => {
    // Mock user for Railway deployment (no auth)
    res.json({
      id: 'default-user',
      email: 'sayed@hikmadigital.com',
      firstName: 'Sayed',
      lastName: 'Baharun',
    });
  });

  // ============================================================================
  // VENTURES
  // ============================================================================

  // Get all ventures
  app.get("/api/ventures", async (req, res) => {
    try {
      const ventures = await storage.getVentures();
      res.json(ventures);
    } catch (error) {
      logger.error({ error }, "Error fetching ventures");
      res.status(500).json({ error: "Failed to fetch ventures" });
    }
  });

  // Get single venture
  app.get("/api/ventures/:id", async (req, res) => {
    try {
      const venture = await storage.getVenture(req.params.id);
      if (!venture) {
        return res.status(404).json({ error: "Venture not found" });
      }
      res.json(venture);
    } catch (error) {
      logger.error({ error }, "Error fetching venture");
      res.status(500).json({ error: "Failed to fetch venture" });
    }
  });

  // Create venture
  app.post("/api/ventures", async (req, res) => {
    try {
      const validatedData = insertVentureSchema.parse(req.body);
      const venture = await storage.createVenture(validatedData);
      res.status(201).json(venture);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid venture data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating venture");
        res.status(500).json({ error: "Failed to create venture" });
      }
    }
  });

  // Update venture
  app.patch("/api/ventures/:id", async (req, res) => {
    try {
      const updates = insertVentureSchema.partial().parse(req.body);
      const venture = await storage.updateVenture(req.params.id, updates);
      if (!venture) {
        return res.status(404).json({ error: "Venture not found" });
      }
      res.json(venture);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid venture data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating venture");
        res.status(500).json({ error: "Failed to update venture" });
      }
    }
  });

  // Delete venture
  app.delete("/api/ventures/:id", async (req, res) => {
    try {
      await storage.deleteVenture(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting venture");
      res.status(500).json({ error: "Failed to delete venture" });
    }
  });

  // ============================================================================
  // PROJECTS
  // ============================================================================

  // Get all projects (optionally filter by venture)
  app.get("/api/projects", async (req, res) => {
    try {
      const ventureId = req.query.venture_id as string;
      const projects = await storage.getProjects(ventureId ? { ventureId } : undefined);
      res.json(projects);
    } catch (error) {
      logger.error({ error }, "Error fetching projects");
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Get single project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      logger.error({ error }, "Error fetching project");
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Create project
  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating project");
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  });

  // Update project
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating project");
        res.status(500).json({ error: "Failed to update project" });
      }
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting project");
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // ============================================================================
  // MILESTONES
  // ============================================================================

  // Get all milestones (optionally filter by project)
  app.get("/api/milestones", async (req, res) => {
    try {
      const projectId = req.query.project_id as string;
      const milestones = await storage.getMilestones(projectId ? { projectId } : undefined);
      res.json(milestones);
    } catch (error) {
      logger.error({ error }, "Error fetching milestones");
      res.status(500).json({ error: "Failed to fetch milestones" });
    }
  });

  // Get single milestone
  app.get("/api/milestones/:id", async (req, res) => {
    try {
      const milestone = await storage.getMilestone(req.params.id);
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      logger.error({ error }, "Error fetching milestone");
      res.status(500).json({ error: "Failed to fetch milestone" });
    }
  });

  // Create milestone
  app.post("/api/milestones", async (req, res) => {
    try {
      const validatedData = insertMilestoneSchema.parse(req.body);
      const milestone = await storage.createMilestone(validatedData);
      res.status(201).json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid milestone data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating milestone");
        res.status(500).json({ error: "Failed to create milestone" });
      }
    }
  });

  // Update milestone
  app.patch("/api/milestones/:id", async (req, res) => {
    try {
      const updates = insertMilestoneSchema.partial().parse(req.body);
      const milestone = await storage.updateMilestone(req.params.id, updates);
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid milestone data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating milestone");
        res.status(500).json({ error: "Failed to update milestone" });
      }
    }
  });

  // Delete milestone
  app.delete("/api/milestones/:id", async (req, res) => {
    try {
      await storage.deleteMilestone(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting milestone");
      res.status(500).json({ error: "Failed to delete milestone" });
    }
  });

  // ============================================================================
  // TASKS
  // ============================================================================

  // Get all tasks (with filters)
  app.get("/api/tasks", async (req, res) => {
    try {
      const filters = {
        ventureId: req.query.venture_id as string,
        projectId: req.query.project_id as string,
        status: req.query.status as string,
        focusDate: req.query.focus_date as string,
        focusDateGte: req.query.focus_date_gte as string,
        focusDateLte: req.query.focus_date_lte as string,
        dueDate: req.query.due_date as string,
      };

      // Remove undefined filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );

      const tasks = await storage.getTasks(cleanFilters);
      res.json(tasks);
    } catch (error) {
      logger.error({ error }, "Error fetching tasks");
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get today's tasks (special endpoint)
  app.get("/api/tasks/today", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const tasks = await storage.getTasksForToday(today);
      res.json(tasks);
    } catch (error) {
      logger.error({ error }, "Error fetching today's tasks");
      res.status(500).json({ error: "Failed to fetch today's tasks" });
    }
  });

  // Get single task
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      logger.error({ error }, "Error fetching task");
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Create task
  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid task data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating task");
        res.status(500).json({ error: "Failed to create task" });
      }
    }
  });

  // Update task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const updates = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // If task was marked done and has a project, check project completion
      if (updates.status === 'done' && task.projectId) {
        const allTasks = await storage.getTasks({ projectId: task.projectId });
        const allDone = allTasks.every(t => t.status === 'done');

        if (allDone) {
          // Suggest project completion (return in response)
          return res.json({
            task,
            suggestion: {
              type: 'project_completion',
              message: `All tasks in project completed. Mark project as done?`,
              projectId: task.projectId
            }
          });
        }
      }

      res.json({ task });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid task data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating task");
        res.status(500).json({ error: "Failed to update task" });
      }
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting task");
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // ============================================================================
  // CAPTURE ITEMS
  // ============================================================================

  // Get all captures (optionally filter by clarified status)
  app.get("/api/captures", async (req, res) => {
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
  app.get("/api/captures/:id", async (req, res) => {
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
  app.post("/api/captures", async (req, res) => {
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
  app.patch("/api/captures/:id", async (req, res) => {
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

  // Convert capture to task (special endpoint)
  app.post("/api/captures/:id/convert", async (req, res) => {
    try {
      const taskData = insertTaskSchema.partial().parse(req.body);
      const result = await storage.convertCaptureToTask(req.params.id, taskData as any);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid task data", details: error.errors });
      } else if (error instanceof Error && error.message === 'Capture not found') {
        res.status(404).json({ error: "Capture not found" });
      } else {
        logger.error({ error }, "Error converting capture to task");
        res.status(500).json({ error: "Failed to convert capture to task" });
      }
    }
  });

  // Delete capture
  app.delete("/api/captures/:id", async (req, res) => {
    try {
      await storage.deleteCapture(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting capture");
      res.status(500).json({ error: "Failed to delete capture" });
    }
  });

  // ============================================================================
  // DAYS
  // ============================================================================

  // Get all days (with date range filter)
  app.get("/api/days", async (req, res) => {
    try {
      const filters = {
        dateGte: req.query.date_gte as string,
        dateLte: req.query.date_lte as string,
      };

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );

      const days = await storage.getDays(cleanFilters);
      res.json(days);
    } catch (error) {
      logger.error({ error }, "Error fetching days");
      res.status(500).json({ error: "Failed to fetch days" });
    }
  });

  // Get today's day (auto-create if doesn't exist)
  app.get("/api/days/today", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const day = await storage.getDayOrCreate(today);
      res.json(day);
    } catch (error) {
      logger.error({ error }, "Error fetching today's day");
      res.status(500).json({ error: "Failed to fetch today's day" });
    }
  });

  // Get day by date
  app.get("/api/days/:date", async (req, res) => {
    try {
      const day = await storage.getDay(req.params.date);
      if (!day) {
        return res.status(404).json({ error: "Day not found" });
      }
      res.json(day);
    } catch (error) {
      logger.error({ error }, "Error fetching day");
      res.status(500).json({ error: "Failed to fetch day" });
    }
  });

  // Create day
  app.post("/api/days", async (req, res) => {
    try {
      const validatedData = insertDaySchema.parse(req.body);
      const day = await storage.createDay(validatedData);
      res.status(201).json(day);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid day data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating day");
        res.status(500).json({ error: "Failed to create day" });
      }
    }
  });

  // Update day
  app.patch("/api/days/:date", async (req, res) => {
    try {
      const updates = insertDaySchema.partial().parse(req.body);
      const day = await storage.updateDay(req.params.date, updates);
      if (!day) {
        return res.status(404).json({ error: "Day not found" });
      }
      res.json(day);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid day data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating day");
        res.status(500).json({ error: "Failed to update day" });
      }
    }
  });

  // Delete day
  app.delete("/api/days/:date", async (req, res) => {
    try {
      await storage.deleteDay(req.params.date);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting day");
      res.status(500).json({ error: "Failed to delete day" });
    }
  });

  // ============================================================================
  // HEALTH ENTRIES
  // ============================================================================

  // Get all health entries (with date range filter)
  app.get("/api/health", async (req, res) => {
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
  app.get("/api/health/:id", async (req, res) => {
    try {
      const entry = await storage.getHealthEntry(req.params.id);
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
  app.post("/api/health", async (req, res) => {
    try {
      const { date, ...healthData } = insertHealthEntrySchema.parse(req.body);

      // Ensure Day exists for this date
      const day = await storage.getDayOrCreate(date);

      // Create health entry
      const entry = await storage.createHealthEntry({
        ...healthData,
        dayId: day.id,
        date,
      });

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
  app.patch("/api/health/:id", async (req, res) => {
    try {
      const updates = insertHealthEntrySchema.partial().parse(req.body);
      const entry = await storage.updateHealthEntry(req.params.id, updates);
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

  // ============================================================================
  // NUTRITION ENTRIES
  // ============================================================================

  // Get all nutrition entries (with filters)
  app.get("/api/nutrition", async (req, res) => {
    try {
      const filters = {
        dayId: req.query.day_id as string,
        date: req.query.date as string,
      };

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );

      const entries = await storage.getNutritionEntries(cleanFilters);
      res.json(entries);
    } catch (error) {
      logger.error({ error }, "Error fetching nutrition entries");
      res.status(500).json({ error: "Failed to fetch nutrition entries" });
    }
  });

  // Get single nutrition entry
  app.get("/api/nutrition/:id", async (req, res) => {
    try {
      const entry = await storage.getNutritionEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Nutrition entry not found" });
      }
      res.json(entry);
    } catch (error) {
      logger.error({ error }, "Error fetching nutrition entry");
      res.status(500).json({ error: "Failed to fetch nutrition entry" });
    }
  });

  // Create nutrition entry (auto-link to Day)
  app.post("/api/nutrition", async (req, res) => {
    try {
      const validatedData = insertNutritionEntrySchema.parse(req.body);

      // Extract date from datetime to find/create Day
      const date = new Date(validatedData.datetime).toISOString().split('T')[0];
      const day = await storage.getDayOrCreate(date);

      // Create nutrition entry with linked dayId
      const entry = await storage.createNutritionEntry({
        ...validatedData,
        dayId: day.id,
      });

      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid nutrition entry data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating nutrition entry");
        res.status(500).json({ error: "Failed to create nutrition entry" });
      }
    }
  });

  // Update nutrition entry
  app.patch("/api/nutrition/:id", async (req, res) => {
    try {
      const updates = insertNutritionEntrySchema.partial().parse(req.body);
      const entry = await storage.updateNutritionEntry(req.params.id, updates);
      if (!entry) {
        return res.status(404).json({ error: "Nutrition entry not found" });
      }
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid nutrition entry data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating nutrition entry");
        res.status(500).json({ error: "Failed to update nutrition entry" });
      }
    }
  });

  // Delete nutrition entry
  app.delete("/api/nutrition/:id", async (req, res) => {
    try {
      await storage.deleteNutritionEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting nutrition entry");
      res.status(500).json({ error: "Failed to delete nutrition entry" });
    }
  });

  // ============================================================================
  // DOCS
  // ============================================================================

  // Get all docs (with filters)
  app.get("/api/docs", async (req, res) => {
    try {
      const filters: Record<string, any> = {
        ventureId: req.query.venture_id as string,
        projectId: req.query.project_id as string,
        type: req.query.type as string,
        domain: req.query.domain as string,
        status: req.query.status as string,
      };

      // Handle parentId - can be 'null' string for root level docs
      if (req.query.parent_id !== undefined) {
        filters.parentId = req.query.parent_id === 'null' ? null : req.query.parent_id as string;
      }

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => value !== undefined || key === 'parentId')
      );

      const docs = await storage.getDocs(cleanFilters);
      res.json(docs);
    } catch (error) {
      logger.error({ error }, "Error fetching docs");
      res.status(500).json({ error: "Failed to fetch docs" });
    }
  });

  // Search docs
  app.get("/api/docs/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const docs = await storage.searchDocs(q as string);
      res.json(docs);
    } catch (error) {
      logger.error({ error }, "Error searching docs");
      res.status(500).json({ error: "Failed to search docs" });
    }
  });

  // Get single doc
  app.get("/api/docs/:id", async (req, res) => {
    try {
      const doc = await storage.getDoc(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Doc not found" });
      }
      res.json(doc);
    } catch (error) {
      logger.error({ error }, "Error fetching doc");
      res.status(500).json({ error: "Failed to fetch doc" });
    }
  });

  // Create doc
  app.post("/api/docs", async (req, res) => {
    try {
      const validatedData = insertDocSchema.parse(req.body);
      const doc = await storage.createDoc(validatedData);
      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid doc data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating doc");
        res.status(500).json({ error: "Failed to create doc" });
      }
    }
  });

  // Update doc
  app.patch("/api/docs/:id", async (req, res) => {
    try {
      const updates = insertDocSchema.partial().parse(req.body);
      const doc = await storage.updateDoc(req.params.id, updates);
      if (!doc) {
        return res.status(404).json({ error: "Doc not found" });
      }
      res.json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid doc data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating doc");
        res.status(500).json({ error: "Failed to update doc" });
      }
    }
  });

  // Delete doc
  app.delete("/api/docs/:id", async (req, res) => {
    try {
      await storage.deleteDoc(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting doc");
      res.status(500).json({ error: "Failed to delete doc" });
    }
  });

  // Delete doc recursively (with all children)
  app.delete("/api/docs/:id/recursive", async (req, res) => {
    try {
      await storage.deleteDocRecursive(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting doc recursively");
      res.status(500).json({ error: "Failed to delete doc" });
    }
  });

  // Get doc tree for a venture (all docs, build tree client-side)
  app.get("/api/docs/tree/:ventureId", async (req, res) => {
    try {
      const docs = await storage.getDocTree(req.params.ventureId);
      res.json(docs);
    } catch (error) {
      logger.error({ error }, "Error fetching doc tree");
      res.status(500).json({ error: "Failed to fetch doc tree" });
    }
  });

  // Get direct children of a doc (or root level if parentId is null)
  app.get("/api/docs/children/:parentId", async (req, res) => {
    try {
      const parentId = req.params.parentId === 'null' ? null : req.params.parentId;
      const ventureId = req.query.venture_id as string | undefined;
      const docs = await storage.getDocChildren(parentId, ventureId);
      res.json(docs);
    } catch (error) {
      logger.error({ error }, "Error fetching doc children");
      res.status(500).json({ error: "Failed to fetch doc children" });
    }
  });

  // Reorder docs (for drag and drop)
  app.post("/api/docs/reorder", async (req, res) => {
    try {
      const { docIds, parentId } = req.body;
      if (!Array.isArray(docIds)) {
        return res.status(400).json({ error: "docIds must be an array" });
      }
      await storage.reorderDocs(docIds, parentId ?? null);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error reordering docs");
      res.status(500).json({ error: "Failed to reorder docs" });
    }
  });

  // ============================================================================
  // ATTACHMENTS
  // ============================================================================

  // Get attachments for a doc
  app.get("/api/docs/:docId/attachments", async (req, res) => {
    try {
      const attachments = await storage.getAttachments(req.params.docId);
      res.json(attachments);
    } catch (error) {
      logger.error({ error }, "Error fetching attachments");
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // Get single attachment
  app.get("/api/attachments/:id", async (req, res) => {
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
  app.post("/api/attachments", async (req, res) => {
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
  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      await storage.deleteAttachment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting attachment");
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // ============================================================================
  // NUTRITION AI - Estimate macros from meal description
  // ============================================================================

  app.post("/api/nutrition/estimate-macros", async (req, res) => {
    try {
      const { description } = req.body;

      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: "Description is required" });
      }

      // Check if OpenRouter API key is configured
      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(503).json({
          error: "AI service not configured",
          message: "OpenRouter API key is not set. Please configure OPENROUTER_API_KEY environment variable."
        });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert. Given a meal description, estimate the nutritional macros.
Return ONLY a JSON object with these exact fields:
- calories: number (total kcal)
- proteinG: number (grams of protein)
- carbsG: number (grams of carbohydrates)
- fatsG: number (grams of fat)
- confidence: "low" | "medium" | "high" (how confident you are in the estimate)
- notes: string (brief explanation or assumptions made)

Base your estimates on typical portion sizes unless specified. Be conservative and realistic.
Return ONLY valid JSON, no markdown or explanation outside the JSON.`
          },
          {
            role: "user",
            content: `Estimate the nutritional macros for: ${description}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const responseText = completion.choices[0]?.message?.content || "";

      // Parse JSON response
      try {
        // Clean the response - remove any markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        const macros = JSON.parse(cleanedResponse);

        // Validate the response has required fields
        if (typeof macros.calories !== 'number' ||
            typeof macros.proteinG !== 'number' ||
            typeof macros.carbsG !== 'number' ||
            typeof macros.fatsG !== 'number') {
          throw new Error("Invalid macro values");
        }

        res.json(macros);
      } catch (parseError) {
        logger.error({ parseError, responseText }, "Failed to parse AI macro response");
        res.status(500).json({
          error: "Failed to parse AI response",
          message: "The AI returned an invalid response format"
        });
      }
    } catch (error: any) {
      logger.error({ error }, "Error estimating macros");

      if (error?.status === 401) {
        res.status(503).json({
          error: "AI service authentication failed",
          message: "Invalid OpenAI API key"
        });
      } else if (error?.status === 429) {
        res.status(429).json({
          error: "Rate limited",
          message: "Too many requests. Please try again in a moment."
        });
      } else {
        res.status(500).json({ error: "Failed to estimate macros" });
      }
    }
  });

  // ============================================================================
  // SETTINGS - USER PREFERENCES
  // ============================================================================

  // Get user preferences
  app.get("/api/settings/preferences", async (req, res) => {
    try {
      const userId = "default-user"; // Mock user for single-user system
      const prefs = await storage.getUserPreferences(userId);

      // Return default preferences if none exist
      if (!prefs) {
        res.json({
          userId,
          theme: "system",
          morningRitualConfig: null,
          notificationSettings: null,
        });
        return;
      }

      res.json(prefs);
    } catch (error) {
      logger.error({ error }, "Error fetching user preferences");
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Update user preferences
  app.patch("/api/settings/preferences", async (req, res) => {
    try {
      const userId = "default-user";
      const updates = insertUserPreferencesSchema.partial().parse(req.body);
      const prefs = await storage.upsertUserPreferences(userId, updates);
      res.json(prefs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid preferences data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating user preferences");
        res.status(500).json({ error: "Failed to update preferences" });
      }
    }
  });

  // ============================================================================
  // SETTINGS - MORNING RITUAL CONFIG
  // ============================================================================

  // Get morning ritual config
  app.get("/api/settings/morning-ritual", async (req, res) => {
    try {
      const userId = "default-user";
      const prefs = await storage.getUserPreferences(userId);

      // Return default config if none exists
      if (!prefs?.morningRitualConfig) {
        const defaultConfig = {
          habits: [
            { key: "press_ups", label: "Press-ups", icon: "Dumbbell", hasCount: true, countLabel: "reps", defaultCount: 50, enabled: true },
            { key: "squats", label: "Squats", icon: "Dumbbell", hasCount: true, countLabel: "reps", defaultCount: 50, enabled: true },
            { key: "supplements", label: "Supplements", icon: "Pill", hasCount: false, enabled: true },
            { key: "reading", label: "Read 10 pages", icon: "BookOpen", hasCount: true, countLabel: "pages", defaultCount: 10, enabled: true },
          ],
        };
        res.json(defaultConfig);
        return;
      }

      res.json(prefs.morningRitualConfig);
    } catch (error) {
      logger.error({ error }, "Error fetching morning ritual config");
      res.status(500).json({ error: "Failed to fetch morning ritual config" });
    }
  });

  // Update morning ritual config
  app.patch("/api/settings/morning-ritual", async (req, res) => {
    try {
      const userId = "default-user";
      const morningRitualConfig = req.body;

      const prefs = await storage.upsertUserPreferences(userId, { morningRitualConfig });
      res.json(prefs.morningRitualConfig);
    } catch (error) {
      logger.error({ error }, "Error updating morning ritual config");
      res.status(500).json({ error: "Failed to update morning ritual config" });
    }
  });

  // ============================================================================
  // SETTINGS - INTEGRATIONS STATUS
  // ============================================================================

  // Get all integration statuses
  app.get("/api/settings/integrations", async (req, res) => {
    try {
      const statuses = await getAllIntegrationStatuses();
      res.json(statuses);
    } catch (error) {
      logger.error({ error }, "Error fetching integration statuses");
      res.status(500).json({ error: "Failed to fetch integration statuses" });
    }
  });

  // Get specific integration status
  app.get("/api/settings/integrations/:name", async (req, res) => {
    try {
      const status = await getIntegrationStatus(req.params.name);
      if (!status) {
        return res.status(404).json({ error: "Integration not found" });
      }
      res.json(status);
    } catch (error) {
      logger.error({ error }, "Error fetching integration status");
      res.status(500).json({ error: "Failed to fetch integration status" });
    }
  });

  // ============================================================================
  // SETTINGS - CUSTOM CATEGORIES
  // ============================================================================

  // Get all categories (with optional type filter)
  app.get("/api/settings/categories", async (req, res) => {
    try {
      const filters = {
        type: req.query.type as string,
        enabled: req.query.enabled === "true" ? true : req.query.enabled === "false" ? false : undefined,
      };

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );

      const categories = await storage.getCategories(cleanFilters);
      res.json(categories);
    } catch (error) {
      logger.error({ error }, "Error fetching categories");
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get single category
  app.get("/api/settings/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      logger.error({ error }, "Error fetching category");
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  // Create category
  app.post("/api/settings/categories", async (req, res) => {
    try {
      const validatedData = insertCustomCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid category data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating category");
        res.status(500).json({ error: "Failed to create category" });
      }
    }
  });

  // Update category
  app.patch("/api/settings/categories/:id", async (req, res) => {
    try {
      const updates = insertCustomCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, updates);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid category data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating category");
        res.status(500).json({ error: "Failed to update category" });
      }
    }
  });

  // Delete category
  app.delete("/api/settings/categories/:id", async (req, res) => {
    try {
      // Check if it's a default category (prevent deletion)
      const category = await storage.getCategory(req.params.id);
      if (category?.metadata?.isDefault) {
        return res.status(400).json({ error: "Cannot delete default categories" });
      }

      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting category");
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // ============================================================================
  // SETTINGS - USER PROFILE
  // ============================================================================

  // Get user profile
  app.get("/api/settings/profile", async (req, res) => {
    try {
      const userId = "default-user";
      const user = await storage.getUser(userId);

      if (!user) {
        // Return default profile
        res.json({
          id: userId,
          email: "sayed@hikmadigital.com",
          firstName: "Sayed",
          lastName: "Baharun",
          timezone: "Asia/Dubai",
          dateFormat: "yyyy-MM-dd",
          timeFormat: "24h",
          weekStartsOn: 0,
        });
        return;
      }

      res.json(user);
    } catch (error) {
      logger.error({ error }, "Error fetching user profile");
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.patch("/api/settings/profile", async (req, res) => {
    try {
      const userId = "default-user";
      const { firstName, lastName, timezone, dateFormat, timeFormat, weekStartsOn } = req.body;

      const user = await storage.upsertUser({
        id: userId,
        email: "sayed@hikmadigital.com",
        firstName,
        lastName,
        timezone,
        dateFormat,
        timeFormat,
        weekStartsOn,
      });

      res.json(user);
    } catch (error) {
      logger.error({ error }, "Error updating user profile");
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
