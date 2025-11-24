import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertVentureSchema,
  insertProjectSchema,
  insertTaskSchema,
  insertCaptureItemSchema,
  insertDaySchema,
  insertHealthEntrySchema,
  insertNutritionEntrySchema,
  insertDocSchema,
} from "@shared/schema";
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
      const filters = {
        ventureId: req.query.venture_id as string,
        projectId: req.query.project_id as string,
        type: req.query.type as string,
        domain: req.query.domain as string,
        status: req.query.status as string,
      };

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
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

  const httpServer = createServer(app);
  return httpServer;
}
