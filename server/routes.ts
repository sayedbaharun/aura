import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import {
  insertVentureSchema,
  insertProjectSchema,
  insertPhaseSchema,
  insertTaskSchema,
  insertCaptureItemSchema,
  insertDaySchema,
  insertHealthEntrySchema,
  insertNutritionEntrySchema,
  insertDocSchema,
  insertAttachmentSchema,
  insertUserPreferencesSchema,
  insertCustomCategorySchema,
  insertShoppingItemSchema,
  insertBookSchema,
  insertAiAgentPromptSchema,
} from "@shared/schema";
import { getAllIntegrationStatuses, getIntegrationStatus } from "./integrations";
import { z } from "zod";
import { logger } from "./logger";
import {
  requireAuth,
  authenticateUser,
  setUserPassword,
  logoutUser,
  isAuthRequired,
  isPasswordConfigured,
  createAuditLog,
} from "./auth";
import { AVAILABLE_MODELS } from "./model-manager";
import uploadRoutes from "./upload-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================================================
  // RATE LIMITERS
  // ============================================================================

  // Rate limiter for AI endpoints - 20 requests per minute per user
  const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: {
      error: "Too many AI requests",
      message: "Please wait a moment before sending more messages. Rate limit: 20 requests per minute.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use session user or IP for rate limiting
      return (req as any).session?.userId || req.ip || "anonymous";
    },
  });

  // ============================================================================
  // HEALTH CHECK (No auth required)
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
  // FAVICON FALLBACK (redirect to PNG icon since favicon.ico doesn't exist)
  // ============================================================================
  app.get('/favicon.ico', (req, res) => {
    res.redirect(301, '/icons/icon-32x32.png');
  });

  // ============================================================================
  // Default user UUID (consistent across the app for single-user system)
  const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================

  // Check if authentication is required and if password is configured
  app.get('/api/auth/status', async (req, res) => {
    try {
      const authRequired = isAuthRequired();
      const passwordConfigured = await isPasswordConfigured();
      const session = req.session as any;

      res.json({
        authRequired,
        passwordConfigured,
        isAuthenticated: !!session?.userId,
        setupRequired: authRequired && !passwordConfigured,
      });
    } catch (error) {
      logger.error({ error }, 'Error checking auth status');
      res.status(500).json({ error: 'Failed to check auth status' });
    }
  });

  // Get current authenticated user
  app.get('/api/auth/user', async (req: any, res) => {
    const session = req.session as any;

    // If auth not required, return mock user for backward compatibility
    if (!isAuthRequired()) {
      res.json({
        id: DEFAULT_USER_ID,
        email: 'user@sb-os.local',
        firstName: '',
        lastName: '',
        isAuthenticated: true,
      });
      return;
    }

    // Check if user is logged in
    if (!session?.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    try {
      const user = await storage.getUser(session.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Don't send password hash to client
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        timezone: user.timezone,
        isAuthenticated: true,
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching user');
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await authenticateUser(email, password, req);

      if (!result.success) {
        res.status(401).json({ error: result.error });
        return;
      }

      // Set session
      const session = req.session as any;
      session.userId = result.userId;

      res.json({ success: true, message: 'Login successful' });
    } catch (error) {
      logger.error({ error }, 'Login error');
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      await logoutUser(req);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      logger.error({ error }, 'Logout error');
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Initial setup - create password for the default user
  app.post('/api/auth/setup', async (req, res) => {
    try {
      // Check if already configured
      const configured = await isPasswordConfigured();
      if (configured) {
        res.status(400).json({ error: 'Password already configured. Use change-password instead.' });
        return;
      }

      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Ensure default user exists with the provided email
      await storage.upsertUser({
        id: DEFAULT_USER_ID,
        email,
      });

      // Set password
      const result = await setUserPassword(DEFAULT_USER_ID, password, req);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log them in
      const session = req.session as any;
      session.userId = DEFAULT_USER_ID;

      await createAuditLog(DEFAULT_USER_ID, 'account_setup', req, { email }, 'auth');

      res.json({ success: true, message: 'Account setup complete' });
    } catch (error) {
      logger.error({ error }, 'Setup error');
      res.status(500).json({ error: 'Setup failed' });
    }
  });

  // Change password (requires authentication)
  app.post('/api/auth/change-password', requireAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }

      // Verify current password
      const user = await storage.getUser(req.userId);
      if (!user?.email) {
        res.status(400).json({ error: 'User not found' });
        return;
      }

      const authResult = await authenticateUser(user.email, currentPassword, req);
      if (!authResult.success) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Set new password
      const result = await setUserPassword(req.userId, newPassword, req);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      logger.error({ error }, 'Password change error');
      res.status(500).json({ error: 'Password change failed' });
    }
  });

  // Get CSRF token
  app.get('/api/auth/csrf-token', (req, res) => {
    const session = req.session as any;
    res.json({ csrfToken: session.csrfToken });
  });

  // ============================================================================
  // PROTECTED ROUTES - All routes below require authentication
  // ============================================================================

  // Apply authentication middleware to all /api routes except auth endpoints
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for auth endpoints
    if (req.path.startsWith('/auth/')) {
      return next();
    }
    // Apply requireAuth
    requireAuth(req, res, next);
  });

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  app.get("/api/dashboard/readiness", async (req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const entries = await storage.getHealthEntries({ dateGte: today, dateLte: today });
      const entry = entries[0];

      if (!entry) {
        return res.json({
          percentage: 0,
          sleep: 0,
          mood: "unknown",
          status: "no_data"
        });
      }

      // Calculate Readiness Score
      let score = 0;

      // 1. Sleep (50%) - Granular
      // Target: 8 hours = 50 points
      if (entry.sleepHours) {
        const sleepScore = Math.min((entry.sleepHours / 8) * 50, 50);
        score += sleepScore;
      }

      // 2. Energy (20%)
      // Scale 1-5
      if (entry.energyLevel) {
        score += (entry.energyLevel / 5) * 20;
      }

      // 3. Mood (15%)
      if (entry.mood === 'peak' || entry.mood === 'high') {
        score += 15;
      } else if (entry.mood === 'medium') {
        score += 10;
      } else {
        score += 5; // Low mood gets minimal points
      }

      // 4. Stress (10%)
      // Low stress is better
      if (entry.stressLevel === 'low') {
        score += 10;
      } else if (entry.stressLevel === 'medium') {
        score += 5;
      }
      // High stress = 0 points

      // 5. Workout (5%)
      if (entry.workoutDone) {
        score += 5;
      }

      // Round to nearest integer
      score = Math.round(score);

      res.json({
        percentage: score,
        sleep: entry.sleepHours || 0,
        mood: entry.mood || "unknown",
        status: "calculated"
      });
    } catch (error) {
      logger.error({ error }, "Error calculating readiness");
      res.status(500).json({ error: "Failed to calculate readiness" });
    }
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
      logger.info({ ventureId: req.params.id, body: req.body }, "Updating venture");
      const updates = insertVentureSchema.partial().parse(req.body);
      logger.info({ ventureId: req.params.id, updates }, "Validated venture updates");
      const venture = await storage.updateVenture(req.params.id, updates);
      if (!venture) {
        return res.status(404).json({ error: "Venture not found" });
      }
      res.json(venture);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid venture data", details: error.errors });
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error({ error, errorMessage, errorStack, ventureId: req.params.id, body: req.body }, "Error updating venture");
        res.status(500).json({ error: "Failed to update venture", details: errorMessage });
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
      // Sanitize data - convert empty strings to null for optional fields
      const sanitizedBody = { ...req.body };
      const nullableFields = ['startDate', 'targetEndDate', 'actualEndDate', 'outcome', 'notes', 'budget', 'externalId'];
      for (const field of nullableFields) {
        if (sanitizedBody[field] === '') {
          sanitizedBody[field] = null;
        }
      }

      const validatedData = insertProjectSchema.parse(sanitizedBody);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, errorMessage, body: req.body }, "Error creating project");
        res.status(500).json({ error: "Failed to create project", details: errorMessage });
      }
    }
  });

  // Update project
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      logger.info({ projectId: req.params.id, body: req.body }, "Updating project");

      // Sanitize data - convert empty strings to null for optional fields
      const sanitizedBody = { ...req.body };
      const nullableFields = ['startDate', 'targetEndDate', 'actualEndDate', 'outcome', 'notes', 'budget', 'externalId'];
      for (const field of nullableFields) {
        if (sanitizedBody[field] === '') {
          sanitizedBody[field] = null;
        }
      }

      const updates = insertProjectSchema.partial().parse(sanitizedBody);
      logger.info({ projectId: req.params.id, updates }, "Validated project updates");
      const project = await storage.updateProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error({ error, errorMessage, errorStack, projectId: req.params.id, body: req.body }, "Error updating project");
        res.status(500).json({ error: "Failed to update project", details: errorMessage });
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
  // PHASES
  // ============================================================================

  // Get all phases (optionally filter by project)
  app.get("/api/phases", async (req, res) => {
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
  app.get("/api/phases/:id", async (req, res) => {
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
  app.post("/api/phases", async (req, res) => {
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
  app.patch("/api/phases/:id", async (req, res) => {
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
  app.delete("/api/phases/:id", async (req, res) => {
    try {
      await storage.deletePhase(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting phase");
      res.status(500).json({ error: "Failed to delete phase" });
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

      // Validate status filter if present
      if (cleanFilters.status) {
        const validStatuses = ['idea', 'next', 'in_progress', 'waiting', 'done', 'cancelled', 'backlog'];
        const statuses = (cleanFilters.status as string).split(',').map(s => s.trim());
        const validStatusValues = statuses.filter(s => validStatuses.includes(s));

        if (validStatusValues.length === 0) {
          // If no valid statuses, return empty list immediately instead of querying DB with invalid values
          // or just ignore the status filter? 
          // Better to ignore the invalid status filter or return empty if they explicitly asked for invalid ones.
          // Let's return empty list if they asked for statuses and none were valid.
          if (statuses.length > 0) {
            return res.json([]);
          }
        }

        cleanFilters.status = validStatusValues.join(',');
      }

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
      // Sanitize data - convert empty strings to null for optional fields
      const sanitizedBody = { ...req.body };
      const nullableFields = ['dueDate', 'focusDate', 'notes', 'ventureId', 'projectId', 'phaseId', 'dayId'];
      for (const field of nullableFields) {
        if (sanitizedBody[field] === '') {
          sanitizedBody[field] = null;
        }
      }

      const validatedData = insertTaskSchema.parse(sanitizedBody);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid task data", details: error.errors });
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, errorMessage, body: req.body }, "Error creating task");
        res.status(500).json({ error: "Failed to create task", details: errorMessage });
      }
    }
  });

  // Update task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      logger.info({ taskId: req.params.id, body: req.body }, "Updating task");

      // Sanitize data - convert empty strings to null for optional fields
      const sanitizedBody = { ...req.body };
      const nullableFields = ['dueDate', 'focusDate', 'notes', 'ventureId', 'projectId', 'phaseId', 'dayId'];
      for (const field of nullableFields) {
        if (sanitizedBody[field] === '') {
          sanitizedBody[field] = null;
        }
      }

      const updates = insertTaskSchema.partial().parse(sanitizedBody);
      logger.info({ taskId: req.params.id, updates }, "Validated task updates");
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error({ error, errorMessage, errorStack, taskId: req.params.id, body: req.body }, "Error updating task");
        res.status(500).json({ error: "Failed to update task", details: errorMessage });
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

      // Format date as string for day lookup
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date);

      // Ensure Day exists for this date
      const day = await storage.getDayOrCreate(dateStr);

      // Create health entry with dayId
      const entry = await storage.createHealthEntry({
        ...healthData,
        dayId: day.id,
        date,
      } as any);

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
      } as any);

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
  // FILE UPLOADS
  // ============================================================================

  app.use('/api', uploadRoutes);

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
      const prefs = await storage.getUserPreferences(DEFAULT_USER_ID);

      // Return default preferences if none exist
      if (!prefs) {
        res.json({
          userId: DEFAULT_USER_ID,
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
      const updates = insertUserPreferencesSchema.partial().parse(req.body);
      const prefs = await storage.upsertUserPreferences(DEFAULT_USER_ID, updates);
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
      const prefs = await storage.getUserPreferences(DEFAULT_USER_ID);

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
      const morningRitualConfig = req.body;

      const prefs = await storage.upsertUserPreferences(DEFAULT_USER_ID, { morningRitualConfig });
      res.json(prefs.morningRitualConfig);
    } catch (error) {
      logger.error({ error }, "Error updating morning ritual config");
      res.status(500).json({ error: "Failed to update morning ritual config" });
    }
  });

  // ============================================================================
  // SETTINGS - AI ASSISTANT
  // ============================================================================

  // Get AI assistant settings
  app.get("/api/settings/ai", async (req, res) => {
    try {
      const prefs = await storage.getUserPreferences(DEFAULT_USER_ID);
      res.json({
        aiInstructions: prefs?.aiInstructions || "",
        aiContext: prefs?.aiContext || {
          userName: "",
          role: "",
          goals: [],
          preferences: ""
        }
      });
    } catch (error) {
      logger.error({ error }, "Error fetching AI settings");
      res.status(500).json({ error: "Failed to fetch AI settings" });
    }
  });

  // Update AI assistant settings
  app.patch("/api/settings/ai", async (req, res) => {
    try {
      const { aiInstructions, aiContext } = req.body;
      const updates: any = {};

      if (aiInstructions !== undefined) {
        updates.aiInstructions = aiInstructions;
      }
      if (aiContext !== undefined) {
        updates.aiContext = aiContext;
      }

      const prefs = await storage.upsertUserPreferences(DEFAULT_USER_ID, updates);
      res.json({
        aiInstructions: prefs.aiInstructions || "",
        aiContext: prefs.aiContext || {}
      });
    } catch (error) {
      logger.error({ error }, "Error updating AI settings");
      res.status(500).json({ error: "Failed to update AI settings" });
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
      const user = await storage.getUser(DEFAULT_USER_ID);

      if (!user) {
        // Return default profile (will be created on first save)
        res.json({
          id: DEFAULT_USER_ID,
          email: "user@sb-os.com",
          firstName: "",
          lastName: "",
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
      const { firstName, lastName, email, timezone, dateFormat, timeFormat, weekStartsOn } = req.body;

      // Get existing user to preserve email if not provided
      const existingUser = await storage.getUser(DEFAULT_USER_ID);
      const userEmail = email || existingUser?.email || "user@sb-os.com";

      const user = await storage.upsertUser({
        id: DEFAULT_USER_ID,
        email: userEmail,
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

  // ========================================
  // GOOGLE CALENDAR ROUTES
  // ========================================

  // Check if Google Calendar is configured
  const isCalendarConfigured = () => {
    return !!(
      process.env.GOOGLE_CALENDAR_CLIENT_ID &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
      process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
    );
  };

  // GET /api/calendar/events - List events for a date range
  app.get("/api/calendar/events", async (req, res) => {
    try {
      if (!isCalendarConfigured()) {
        return res.status(503).json({
          error: "Google Calendar not configured",
          message: "Please set up Google Calendar credentials in environment variables",
        });
      }

      const { startDate, endDate, maxResults } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      const { listEvents } = await import("./google-calendar");
      const events = await listEvents(
        new Date(startDate as string),
        new Date(endDate as string),
        maxResults ? parseInt(maxResults as string) : 50
      );

      res.json(events);
    } catch (error) {
      logger.error({ error }, "Error fetching calendar events");
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  // GET /api/calendar/week - Get events for a specific week
  app.get("/api/calendar/week", async (req, res) => {
    try {
      if (!isCalendarConfigured()) {
        return res.status(503).json({
          error: "Google Calendar not configured",
          configured: false,
        });
      }

      const { weekStart } = req.query;
      const startDate = weekStart ? new Date(weekStart as string) : new Date();

      // Get Monday of the week
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(startDate.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { listEvents } = await import("./google-calendar");
      const events = await listEvents(monday, sunday, 100);

      res.json({
        configured: true,
        weekStart: monday.toISOString(),
        weekEnd: sunday.toISOString(),
        events,
      });
    } catch (error) {
      logger.error({ error }, "Error fetching week calendar events");
      res.status(500).json({ error: "Failed to fetch week calendar events" });
    }
  });

  // POST /api/calendar/focus-block - Create a focus time block
  app.post("/api/calendar/focus-block", async (req, res) => {
    try {
      if (!isCalendarConfigured()) {
        return res.status(503).json({
          error: "Google Calendar not configured",
          message: "Please set up Google Calendar credentials",
        });
      }

      const { title, startTime, endTime, description } = req.body;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: "startTime and endTime are required" });
      }

      const { createFocusTimeBlock } = await import("./google-calendar");
      const event = await createFocusTimeBlock(
        title || "Deep Work Session",
        new Date(startTime),
        new Date(endTime),
        description
      );

      res.json(event);
    } catch (error) {
      logger.error({ error }, "Error creating focus block");
      res.status(500).json({ error: "Failed to create focus block" });
    }
  });

  // GET /api/calendar/status - Check calendar connection status
  app.get("/api/calendar/status", async (req, res) => {
    try {
      const configured = isCalendarConfigured();

      if (!configured) {
        return res.json({
          configured: false,
          connected: false,
          message: "Google Calendar credentials not set",
        });
      }

      // Try to list a single event to verify connection
      const { listEvents } = await import("./google-calendar");
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await listEvents(now, tomorrow, 1);

      res.json({
        configured: true,
        connected: true,
        message: "Google Calendar connected successfully",
      });
    } catch (error: any) {
      logger.error({ error }, "Calendar connection check failed");
      res.json({
        configured: true,
        connected: false,
        error: error.message,
        message: "Failed to connect to Google Calendar",
      });
    }
  });

  // ========================================
  // GOOGLE DRIVE ROUTES
  // ========================================

  // Check if Google Drive is configured (uses same credentials as Calendar)
  const isDriveConfigured = () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
    return !!(clientId && clientSecret && refreshToken);
  };

  // GET /api/drive/status - Check Drive connection status
  app.get("/api/drive/status", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.json({
          configured: false,
          connected: false,
          message: "Google Drive credentials not set",
        });
      }

      const { checkDriveConnection } = await import("./google-drive");
      const status = await checkDriveConnection();

      res.json({
        ...status,
        message: status.connected
          ? "Google Drive connected successfully"
          : "Failed to connect to Google Drive",
      });
    } catch (error: any) {
      logger.error({ error }, "Drive status check failed");
      res.json({
        configured: true,
        connected: false,
        error: error.message,
        message: "Failed to check Drive status",
      });
    }
  });

  // GET /api/drive/quota - Get storage quota
  app.get("/api/drive/quota", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { getStorageQuota } = await import("./google-drive");
      const quota = await getStorageQuota();

      res.json(quota);
    } catch (error) {
      logger.error({ error }, "Error getting Drive quota");
      res.status(500).json({ error: "Failed to get storage quota" });
    }
  });

  // GET /api/drive/files - List files in Knowledge Base
  app.get("/api/drive/files", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { folderId, mimeType, search, pageToken, pageSize } = req.query;

      const { listFiles } = await import("./google-drive");
      const result = await listFiles(folderId as string | undefined, {
        mimeType: mimeType as string | undefined,
        searchQuery: search as string | undefined,
        pageToken: pageToken as string | undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      logger.error({ error }, "Error listing Drive files");
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // GET /api/drive/files/:fileId - Get file metadata
  app.get("/api/drive/files/:fileId", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { fileId } = req.params;

      const { getFile } = await import("./google-drive");
      const file = await getFile(fileId);

      res.json(file);
    } catch (error) {
      logger.error({ error }, "Error getting file");
      res.status(500).json({ error: "Failed to get file" });
    }
  });

  // GET /api/drive/search - Search files
  app.get("/api/drive/search", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { query, pageToken, pageSize } = req.query;

      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }

      const { searchFiles } = await import("./google-drive");
      const result = await searchFiles(query as string, {
        pageToken: pageToken as string | undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      logger.error({ error }, "Error searching Drive");
      res.status(500).json({ error: "Failed to search files" });
    }
  });

  // POST /api/drive/folders - Create a folder
  app.post("/api/drive/folders", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { name, parentId, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Folder name is required" });
      }

      const { createFolder } = await import("./google-drive");
      const folder = await createFolder(name, parentId, description);

      res.json(folder);
    } catch (error) {
      logger.error({ error }, "Error creating folder");
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  // POST /api/drive/docs - Create a Google Doc
  app.post("/api/drive/docs", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { name, content, parentId, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Document name is required" });
      }

      const { createDoc } = await import("./google-drive");
      const doc = await createDoc(name, content || "", parentId, description);

      res.json(doc);
    } catch (error) {
      logger.error({ error }, "Error creating doc");
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // POST /api/drive/upload - Upload a file
  app.post("/api/drive/upload", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { name, content, mimeType, parentId, description } = req.body;

      if (!name || !content || !mimeType) {
        return res.status(400).json({ error: "name, content, and mimeType are required" });
      }

      const { uploadFile } = await import("./google-drive");

      // Decode base64 content if provided
      const buffer = Buffer.from(content, "base64");
      const file = await uploadFile(name, buffer, mimeType, parentId, description);

      res.json(file);
    } catch (error) {
      logger.error({ error }, "Error uploading file");
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // PATCH /api/drive/files/:fileId - Update file metadata
  app.patch("/api/drive/files/:fileId", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { fileId } = req.params;
      const { name, description, starred } = req.body;

      const { updateFileMetadata } = await import("./google-drive");
      const file = await updateFileMetadata(fileId, { name, description, starred });

      res.json(file);
    } catch (error) {
      logger.error({ error }, "Error updating file");
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  // POST /api/drive/files/:fileId/move - Move file to different folder
  app.post("/api/drive/files/:fileId/move", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { fileId } = req.params;
      const { parentId } = req.body;

      if (!parentId) {
        return res.status(400).json({ error: "parentId is required" });
      }

      const { moveFile } = await import("./google-drive");
      const file = await moveFile(fileId, parentId);

      res.json(file);
    } catch (error) {
      logger.error({ error }, "Error moving file");
      res.status(500).json({ error: "Failed to move file" });
    }
  });

  // DELETE /api/drive/files/:fileId - Delete (trash) a file
  app.delete("/api/drive/files/:fileId", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { fileId } = req.params;
      const { permanent } = req.query;

      if (permanent === "true") {
        const { permanentlyDeleteFile } = await import("./google-drive");
        await permanentlyDeleteFile(fileId);
      } else {
        const { deleteFile } = await import("./google-drive");
        await deleteFile(fileId);
      }

      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting file");
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // GET /api/drive/files/:fileId/download - Download file content
  app.get("/api/drive/files/:fileId/download", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { fileId } = req.params;

      const { getFile, downloadFile, exportDoc } = await import("./google-drive");

      // Get file metadata first to determine type
      const file = await getFile(fileId);

      let content: Buffer;

      // If it's a Google Doc, export it
      if (file.mimeType === "application/vnd.google-apps.document") {
        content = await exportDoc(fileId, "text/plain");
        res.setHeader("Content-Type", "text/plain");
      } else if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
        content = await exportDoc(fileId, "text/csv" as any);
        res.setHeader("Content-Type", "text/csv");
      } else {
        content = await downloadFile(fileId);
        res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
      }

      res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
      res.send(content);
    } catch (error) {
      logger.error({ error }, "Error downloading file");
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // POST /api/drive/sync-doc - Sync a knowledge base doc to Drive
  app.post("/api/drive/sync-doc", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { docId, title, content, ventureName } = req.body;

      if (!docId || !title) {
        return res.status(400).json({ error: "docId and title are required" });
      }

      const { createDoc, createVentureFolder, updateFileContent, getOrCreateKnowledgeBaseFolder } = await import("./google-drive");

      // Get or create venture folder if venture specified
      let parentId: string;
      if (ventureName) {
        parentId = await createVentureFolder(ventureName);
      } else {
        parentId = await getOrCreateKnowledgeBaseFolder();
      }

      // Check if doc already has an externalId (previously synced)
      const existingDoc = await storage.getDoc(docId);

      if (existingDoc?.externalId) {
        // Update existing Drive doc
        await updateFileContent(existingDoc.externalId, content || "", "text/plain");

        res.json({
          synced: true,
          driveFileId: existingDoc.externalId,
          action: "updated",
        });
      } else {
        // Create new Drive doc
        const driveDoc = await createDoc(title, content || "", parentId, `Synced from SB-OS - Doc ID: ${docId}`);

        // Update local doc with Drive ID
        await storage.updateDoc(docId, {
          externalId: driveDoc.id,
          metadata: {
            ...existingDoc?.metadata,
            driveWebViewLink: driveDoc.webViewLink,
            lastSyncedAt: new Date().toISOString(),
          },
        });

        res.json({
          synced: true,
          driveFileId: driveDoc.id,
          webViewLink: driveDoc.webViewLink,
          action: "created",
        });
      }
    } catch (error) {
      logger.error({ error }, "Error syncing doc to Drive");
      res.status(500).json({ error: "Failed to sync document" });
    }
  });

  // GET /api/drive/folders/knowledge-base - Get knowledge base folder ID
  app.get("/api/drive/folders/knowledge-base", async (req, res) => {
    try {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: "Google Drive not configured" });
      }

      const { getOrCreateKnowledgeBaseFolder } = await import("./google-drive");
      const folderId = await getOrCreateKnowledgeBaseFolder();

      res.json({ folderId });
    } catch (error) {
      logger.error({ error }, "Error getting knowledge base folder");
      res.status(500).json({ error: "Failed to get knowledge base folder" });
    }
  });

  // ============================================================================
  // SHOPPING ITEMS
  // ============================================================================

  // Get all shopping items (with optional filters)
  app.get("/api/shopping", async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        category: req.query.category as string,
      };

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );

      const items = await storage.getShoppingItems(cleanFilters);
      res.json(items);
    } catch (error) {
      logger.error({ error }, "Error fetching shopping items");
      res.status(500).json({ error: "Failed to fetch shopping items" });
    }
  });

  // Get single shopping item
  app.get("/api/shopping/:id", async (req, res) => {
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
  app.post("/api/shopping", async (req, res) => {
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
  app.patch("/api/shopping/:id", async (req, res) => {
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
  app.delete("/api/shopping/:id", async (req, res) => {
    try {
      await storage.deleteShoppingItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting shopping item");
      res.status(500).json({ error: "Failed to delete shopping item" });
    }
  });

  // ============================================================================
  // BOOKS
  // ============================================================================

  // Get all books (with optional filters)
  app.get("/api/books", async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
      };

      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      );

      const books = await storage.getBooks(cleanFilters);
      res.json(books);
    } catch (error) {
      logger.error({ error }, "Error fetching books");
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  // Get single book
  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      logger.error({ error }, "Error fetching book");
      res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  // Create book
  app.post("/api/books", async (req, res) => {
    try {
      const validatedData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(validatedData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid book data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating book");
        res.status(500).json({ error: "Failed to create book" });
      }
    }
  });

  // Update book
  app.patch("/api/books/:id", async (req, res) => {
    try {
      const updates = insertBookSchema.partial().parse(req.body);
      const book = await storage.updateBook(req.params.id, updates);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid book data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating book");
        res.status(500).json({ error: "Failed to update book" });
      }
    }
  });

  // Delete book
  app.delete("/api/books/:id", async (req, res) => {
    try {
      await storage.deleteBook(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting book");
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // ============================================================================
  // AI AGENT PROMPTS
  // ============================================================================

  // Get available AI models for selection
  app.get("/api/ai-models", async (_req, res) => {
    res.json(AVAILABLE_MODELS);
  });

  // Get AI agent prompt for a venture
  app.get("/api/ai-agent-prompts/venture/:ventureId", async (req, res) => {
    try {
      const prompt = await storage.getAiAgentPromptByVenture(req.params.ventureId);
      if (!prompt) {
        // Return a default configuration instead of 404
        // This allows the frontend to work without having configured an AI agent
        return res.json({
          id: null,
          ventureId: req.params.ventureId,
          systemPrompt: null,
          context: null,
          capabilities: [],
          quickActions: [],
          knowledgeSources: ['docs', 'tasks', 'projects'],
          actionPermissions: ['read'],
          contextRefreshHours: 24,
          maxContextTokens: 8000,
          preferredModel: null,
          enabled: true,
          createdAt: null,
          updatedAt: null,
        });
      }
      res.json(prompt);
    } catch (error) {
      logger.error({ error }, "Error fetching AI agent prompt");
      // Return default on error (e.g., if table doesn't exist)
      res.json({
        id: null,
        ventureId: req.params.ventureId,
        systemPrompt: null,
        context: null,
        capabilities: [],
        quickActions: [],
        knowledgeSources: ['docs', 'tasks', 'projects'],
        actionPermissions: ['read'],
        contextRefreshHours: 24,
        maxContextTokens: 8000,
        preferredModel: null,
        enabled: true,
        createdAt: null,
        updatedAt: null,
      });
    }
  });

  // Create AI agent prompt
  app.post("/api/ai-agent-prompts", async (req, res) => {
    try {
      const validatedData = insertAiAgentPromptSchema.parse(req.body);
      const prompt = await storage.createAiAgentPrompt(validatedData);
      res.status(201).json(prompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid AI agent prompt data", details: error.errors });
      } else {
        logger.error({ error }, "Error creating AI agent prompt");
        res.status(500).json({ error: "Failed to create AI agent prompt" });
      }
    }
  });

  // Update AI agent prompt
  app.patch("/api/ai-agent-prompts/:id", async (req, res) => {
    try {
      const updates = insertAiAgentPromptSchema.partial().parse(req.body);
      const prompt = await storage.updateAiAgentPrompt(req.params.id, updates);
      if (!prompt) {
        return res.status(404).json({ error: "AI agent prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid AI agent prompt data", details: error.errors });
      } else {
        logger.error({ error }, "Error updating AI agent prompt");
        res.status(500).json({ error: "Failed to update AI agent prompt" });
      }
    }
  });

  // Delete AI agent prompt
  app.delete("/api/ai-agent-prompts/:id", async (req, res) => {
    try {
      await storage.deleteAiAgentPrompt(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error deleting AI agent prompt");
      res.status(500).json({ error: "Failed to delete AI agent prompt" });
    }
  });

  // ============================================================================
  // CHAT API
  // ============================================================================

  // Helper to ensure default user exists for chat operations
  async function ensureDefaultUserExists(): Promise<void> {
    const existingUser = await storage.getUser(DEFAULT_USER_ID);
    if (!existingUser) {
      await storage.upsertUser({
        id: DEFAULT_USER_ID,
        email: "user@sb-os.com",
      });
    }
  }

  // Get chat history for current user
  app.get("/api/chat/history", async (req, res) => {
    try {
      await ensureDefaultUserExists();
      const userId = DEFAULT_USER_ID;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await storage.getChatHistory(userId, limit);

      // Return in chronological order (oldest first)
      res.json(messages.reverse());
    } catch (error) {
      logger.error({ error }, "Error fetching chat history");
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Send a chat message and get AI response
  app.post("/api/chat", aiRateLimiter, async (req, res) => {
    try {
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check if OpenRouter API key is configured
      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(503).json({
          error: "AI service not configured",
          message: "OpenRouter API key is not set."
        });
      }

      await ensureDefaultUserExists();
      const userId = DEFAULT_USER_ID;

      // Save user message
      const userMessage = await storage.createChatMessage({
        userId,
        role: "user" as const,
        content: message,
        metadata: null,
      });

      // Get user preferences for custom AI instructions
      const userPrefs = await storage.getUserPreferences(userId);
      const customInstructions = userPrefs?.aiInstructions || "";
      const aiContext = userPrefs?.aiContext || {};

      // Get recent chat history for context
      const recentHistory = await storage.getChatHistory(userId, 20);
      const historyMessages = recentHistory.reverse().map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

      // Call OpenRouter API with function calling
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const today = new Date().toISOString().split('T')[0];
      const systemPrompt = `You are SBOS Assistant, a powerful AI assistant for SB-OS - a personal productivity operating system.

CAPABILITIES:
- Full access to ventures, projects, tasks, captures, health entries, nutrition logs, and documents
- Can create, update, and query all data
- Helps with planning, tracking, and insights

USER CONTEXT:
${aiContext.userName ? `Name: ${aiContext.userName}` : ''}
${aiContext.role ? `Role: ${aiContext.role}` : ''}
${aiContext.goals?.length ? `Goals: ${aiContext.goals.join(', ')}` : ''}
${aiContext.preferences ? `Preferences: ${aiContext.preferences}` : ''}

${customInstructions ? `CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ''}
RULES:
- Be concise but helpful
- Use tools to fetch real data before answering questions about ventures, tasks, projects, etc.
- When creating items, confirm what was created
- Format responses nicely with markdown when appropriate
- Current date: ${today}`;

      // Define tools for database access
      const tools: any[] = [
        {
          type: "function",
          function: {
            name: "get_ventures",
            description: "Get all ventures (business initiatives). Use this when user asks about their ventures, businesses, or initiatives.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        },
        {
          type: "function",
          function: {
            name: "get_projects",
            description: "Get projects, optionally filtered by venture. Use when user asks about projects.",
            parameters: {
              type: "object",
              properties: {
                ventureId: { type: "string", description: "Optional venture ID to filter by" },
                status: { type: "string", description: "Optional status filter" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_tasks",
            description: "Get tasks with optional filters. Use when user asks about tasks, to-dos, or what they need to do.",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", description: "Filter by status: idea, next, in_progress, waiting, done, cancelled" },
                ventureId: { type: "string", description: "Filter by venture ID" },
                projectId: { type: "string", description: "Filter by project ID" },
                priority: { type: "string", description: "Filter by priority: P0, P1, P2, P3" },
                focusDate: { type: "string", description: "Filter by focus date (YYYY-MM-DD)" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_today_tasks",
            description: "Get tasks scheduled for today. Use when user asks 'what do I have today' or 'today's tasks'.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        },
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Create a new task. Use when user wants to add a task or to-do item.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title" },
                status: { type: "string", description: "Status: idea, next, in_progress, waiting, done" },
                priority: { type: "string", description: "Priority: P0, P1, P2, P3" },
                ventureId: { type: "string", description: "Venture ID to associate with" },
                projectId: { type: "string", description: "Project ID to associate with" },
                dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
                focusDate: { type: "string", description: "Focus date for scheduling (YYYY-MM-DD)" },
                notes: { type: "string", description: "Additional notes" }
              },
              required: ["title"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_task",
            description: "Update an existing task. Use when user wants to modify, complete, or change a task.",
            parameters: {
              type: "object",
              properties: {
                taskId: { type: "string", description: "Task ID to update" },
                title: { type: "string" },
                status: { type: "string" },
                priority: { type: "string" },
                notes: { type: "string" },
                dueDate: { type: "string" },
                focusDate: { type: "string" }
              },
              required: ["taskId"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_captures",
            description: "Get capture items (inbox/brain dump items). Use when user asks about their captures, inbox, or ideas.",
            parameters: {
              type: "object",
              properties: {
                clarified: { type: "boolean", description: "Filter by clarified status" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_capture",
            description: "Create a quick capture/inbox item. Use for quick thoughts, ideas, or items to process later.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Capture title/content" },
                type: { type: "string", description: "Type: idea, task, note, link, question" },
                notes: { type: "string", description: "Additional notes" }
              },
              required: ["title"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_health_entries",
            description: "Get health tracking entries. Use when user asks about health, sleep, energy, workouts.",
            parameters: {
              type: "object",
              properties: {
                startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                limit: { type: "number", description: "Max entries to return" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_nutrition_entries",
            description: "Get nutrition/meal entries. Use when user asks about meals, nutrition, calories.",
            parameters: {
              type: "object",
              properties: {
                startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                limit: { type: "number", description: "Max entries to return" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_docs",
            description: "Get documents (SOPs, prompts, specs, templates). Use when user asks about documents or knowledge base.",
            parameters: {
              type: "object",
              properties: {
                type: { type: "string", description: "Filter by type: sop, prompt, spec, template, playbook" },
                ventureId: { type: "string", description: "Filter by venture" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_summary",
            description: "Get a summary of the user's system - venture count, active projects, pending tasks, etc.",
            parameters: { type: "object", properties: {}, required: [] }
          }
        }
      ];

      // Tool execution function
      const executeTool = async (name: string, args: any): Promise<string> => {
        try {
          switch (name) {
            case "get_ventures": {
              const ventures = await storage.getVentures();
              return JSON.stringify(ventures.map(v => ({
                id: v.id, name: v.name, status: v.status, domain: v.domain, oneLiner: v.oneLiner
              })));
            }
            case "get_projects": {
              const projects = await storage.getProjects({ ventureId: args.ventureId });
              const filtered = args.status ? projects.filter(p => p.status === args.status) : projects;
              return JSON.stringify(filtered.map(p => ({
                id: p.id, name: p.name, status: p.status, ventureId: p.ventureId, priority: p.priority
              })));
            }
            case "get_tasks": {
              const tasks = await storage.getTasks(args);
              return JSON.stringify(tasks.map((t: any) => ({
                id: t.id, title: t.title, status: t.status, priority: t.priority,
                dueDate: t.dueDate, focusDate: t.focusDate, ventureId: t.ventureId
              })));
            }
            case "get_today_tasks": {
              const tasks = await storage.getTasksForToday(today);
              return JSON.stringify(tasks.map((t: any) => ({
                id: t.id, title: t.title, status: t.status, priority: t.priority, focusSlot: t.focusSlot
              })));
            }
            case "create_task": {
              const task = await storage.createTask(args);
              return JSON.stringify({ success: true, task: { id: task.id, title: task.title } });
            }
            case "update_task": {
              const { taskId, ...updates } = args;
              const task = await storage.updateTask(taskId, updates);
              return JSON.stringify({ success: true, task: task ? { id: task.id, title: task.title, status: task.status } : null });
            }
            case "get_captures": {
              const captures = await storage.getCaptures({ clarified: args.clarified });
              return JSON.stringify(captures.map((c: any) => ({
                id: c.id, title: c.title, type: c.type, clarified: c.clarified
              })));
            }
            case "create_capture": {
              const capture = await storage.createCapture(args);
              return JSON.stringify({ success: true, capture: { id: capture.id, title: capture.title } });
            }
            case "get_health_entries": {
              const entries = await storage.getHealthEntries({ dateGte: args.startDate, dateLte: args.endDate });
              return JSON.stringify(entries.slice(0, args.limit || 10));
            }
            case "get_nutrition_entries": {
              const entries = await storage.getNutritionEntries({ date: args.startDate });
              return JSON.stringify(entries.slice(0, args.limit || 10));
            }
            case "get_docs": {
              const docs = await storage.getDocs({ type: args.type, ventureId: args.ventureId });
              return JSON.stringify(docs.map((d: any) => ({
                id: d.id, title: d.title, type: d.type, status: d.status
              })));
            }
            case "get_summary": {
              const [ventures, projects, tasks, captures] = await Promise.all([
                storage.getVentures(),
                storage.getProjects(),
                storage.getTasks({}),
                storage.getCaptures()
              ]);
              const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
              const todayTasks = tasks.filter(t => t.focusDate === today);
              return JSON.stringify({
                ventures: ventures.length,
                activeVentures: ventures.filter(v => v.status === 'active').length,
                projects: projects.length,
                activeProjects: projects.filter(p => p.status === 'in_progress').length,
                totalTasks: tasks.length,
                activeTasks: activeTasks.length,
                todayTasks: todayTasks.length,
                unclarifiedCaptures: captures.filter(c => !c.clarified).length
              });
            }
            default:
              return JSON.stringify({ error: "Unknown tool" });
          }
        } catch (error) {
          logger.error({ error, tool: name }, "Tool execution error");
          return JSON.stringify({ error: "Tool execution failed" });
        }
      }

      // Initial completion with tools
      let messages: any[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ];

      let completion = await openai.chat.completions.create({
        model: "openai/gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 2000,
      });

      let responseMessage = completion.choices[0]?.message;

      // Handle tool calls (loop for multiple rounds if needed)
      let iterations = 0;
      while (responseMessage?.tool_calls && iterations < 5) {
        iterations++;
        const toolResults = await Promise.all(
          responseMessage.tool_calls.map(async (toolCall: any) => {
            const args = JSON.parse(toolCall.function.arguments || "{}");
            const result = await executeTool(toolCall.function.name, args);
            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: result,
            };
          })
        );

        messages = [
          ...messages,
          responseMessage,
          ...toolResults,
        ];

        completion = await openai.chat.completions.create({
          model: "openai/gpt-4o",
          messages,
          tools,
          tool_choice: "auto",
          max_tokens: 2000,
        });

        responseMessage = completion.choices[0]?.message;
      }

      const aiResponse = responseMessage?.content || "I'm sorry, I couldn't generate a response.";

      // Save AI response
      const assistantMessage = await storage.createChatMessage({
        userId,
        role: "assistant" as const,
        content: aiResponse,
        metadata: {
          model: "openai/gpt-4o",
          tokensUsed: completion.usage?.total_tokens,
        } as any,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      logger.error({ error }, "Error processing chat message");
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Clear chat history for current user
  app.delete("/api/chat/history", async (req, res) => {
    try {
      const userId = DEFAULT_USER_ID;
      await storage.deleteChatHistory(userId);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, "Error clearing chat history");
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // ============================================================================
  // VENTURE AI AGENT
  // ============================================================================

  // Send a chat message to a venture's AI agent
  app.post("/api/ventures/:ventureId/chat", aiRateLimiter, async (req, res) => {
    try {
      const { ventureId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check if OpenRouter API key is configured
      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(503).json({
          error: "AI service not configured",
          message: "OpenRouter API key is not set. Please configure the OPENROUTER_API_KEY environment variable."
        });
      }

      await ensureDefaultUserExists();
      const userId = DEFAULT_USER_ID;

      // Dynamically import to avoid circular dependencies
      const { createVentureAgent } = await import("./venture-agent");

      // Create and initialize the venture agent
      const agent = await createVentureAgent(ventureId, userId);

      // Process the message
      const result = await agent.chat(message);

      res.json({
        response: result.response,
        actions: result.actions,
        model: result.model,
        tokensUsed: result.tokensUsed,
      });
    } catch (error: any) {
      logger.error({ error, ventureId: req.params.ventureId }, "Error processing venture chat message");

      // Check for common error types and provide better messages
      const errorMessage = error.message || "Failed to process message";

      // Database table not existing
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        return res.status(503).json({
          error: "AI agent database not initialized",
          message: "The venture AI agent tables need to be created. Please run database migrations."
        });
      }

      // Venture not found
      if (errorMessage.includes('Venture not found')) {
        return res.status(404).json({ error: errorMessage });
      }

      // AI Service Errors (OpenRouter/OpenAI)
      if (errorMessage.includes('All AI models failed') || errorMessage.includes('401') || errorMessage.includes('429')) {
        return res.status(503).json({
          error: "AI Service Unavailable",
          message: "The AI service is currently unavailable or misconfigured. Please check your API key and credits.",
          details: errorMessage
        });
      }

      res.status(500).json({
        error: errorMessage,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        details: "Check server logs for full stack trace"
      });
    }
  });

  // Get chat history for a venture
  app.get("/api/ventures/:ventureId/chat/history", async (req, res) => {
    try {
      const { ventureId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      await ensureDefaultUserExists();
      const userId = DEFAULT_USER_ID;

      const history = await storage.getVentureConversations(ventureId, userId, limit);

      // Return in chronological order
      res.json(history.reverse());
    } catch (error) {
      // Return empty array on error - table may not exist yet
      logger.error({ error, ventureId: req.params.ventureId }, "Error fetching venture chat history (returning empty)");
      res.json([]);
    }
  });

  // Clear chat history for a venture
  app.delete("/api/ventures/:ventureId/chat/history", async (req, res) => {
    try {
      const { ventureId } = req.params;

      await ensureDefaultUserExists();
      const userId = DEFAULT_USER_ID;

      await storage.deleteVentureConversations(ventureId, userId);
      res.json({ success: true });
    } catch (error) {
      // Return success even on error - table may not exist yet
      logger.error({ error, ventureId: req.params.ventureId }, "Error clearing venture chat history (returning success)");
      res.json({ success: true });
    }
  });

  // Get venture AI agent actions (audit log)
  app.get("/api/ventures/:ventureId/ai/actions", async (req, res) => {
    try {
      const { ventureId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const actions = await storage.getVentureAgentActions(ventureId, limit);
      res.json(actions);
    } catch (error) {
      // Return empty array on error - table may not exist yet
      logger.error({ error, ventureId: req.params.ventureId }, "Error fetching venture AI actions (returning empty)");
      res.json([]);
    }
  });

  // Rebuild venture context cache
  app.post("/api/ventures/:ventureId/ai/rebuild-context", async (req, res) => {
    try {
      const { ventureId } = req.params;

      // Invalidate existing cache
      await storage.invalidateVentureContextCache(ventureId);

      // Dynamically import to avoid circular dependencies
      const { getCachedOrBuildContext } = await import("./venture-context-builder");

      // Build fresh context
      const context = await getCachedOrBuildContext(ventureId, 0); // 0 hours = always rebuild

      res.json({
        success: true,
        contextLength: context.length,
        estimatedTokens: Math.ceil(context.length / 4),
      });
    } catch (error) {
      logger.error({ error, ventureId: req.params.ventureId }, "Error rebuilding venture context");
      res.status(500).json({ error: "Failed to rebuild context" });
    }
  });

  // Get venture context status
  app.get("/api/ventures/:ventureId/ai/context-status", async (req, res) => {
    try {
      const { ventureId } = req.params;

      const cached = await storage.getVentureContextCache(ventureId, "full");

      if (!cached) {
        return res.json({
          hasCachedContext: false,
          isStale: true,
        });
      }

      const isStale = !cached.validUntil || new Date(cached.validUntil) < new Date();

      res.json({
        hasCachedContext: true,
        isStale,
        lastBuiltAt: cached.lastBuiltAt,
        validUntil: cached.validUntil,
        tokenCount: cached.tokenCount,
        metadata: cached.metadata,
      });
    } catch (error) {
      logger.error({ error, ventureId: req.params.ventureId }, "Error fetching venture context status");
      res.status(500).json({ error: "Failed to fetch context status" });
    }
  });

  // ============================================================================
  // PROJECT SCAFFOLDING - AI-powered project plan generation
  // ============================================================================

  // Get scaffolding options (categories, scopes, venture domains)
  app.get("/api/project-scaffolding/options", async (req, res) => {
    try {
      const { getProjectCategories, getScopeOptions, getVentureDomains } = await import("./project-scaffolding");
      res.json({
        categories: getProjectCategories(),
        scopes: getScopeOptions(),
        ventureDomains: getVentureDomains(),
      });
    } catch (error) {
      logger.error({ error }, "Error fetching scaffolding options");
      res.status(500).json({ error: "Failed to fetch scaffolding options" });
    }
  });

  // Generate a project plan from intake data (with optional new venture)
  app.post("/api/project-scaffolding/generate", aiRateLimiter, async (req, res) => {
    try {
      const { ventureId, newVenture, projectName, projectCategory, desiredOutcome, scope, keyConstraints, domainContext } = req.body;

      // Validate required fields
      if (!ventureId && !newVenture) {
        return res.status(400).json({ error: "Either ventureId or newVenture is required" });
      }
      if (!projectName) {
        return res.status(400).json({ error: "projectName is required" });
      }
      if (!desiredOutcome) {
        return res.status(400).json({ error: "desiredOutcome is required" });
      }
      if (!scope || !["small", "medium", "large"].includes(scope)) {
        return res.status(400).json({ error: "scope must be one of: small, medium, large" });
      }

      // If using existing venture, verify it exists
      if (ventureId) {
        const venture = await storage.getVenture(ventureId);
        if (!venture) {
          return res.status(404).json({ error: "Venture not found" });
        }
      }

      // Validate new venture data if provided
      if (newVenture) {
        if (!newVenture.ventureName) {
          return res.status(400).json({ error: "newVenture.ventureName is required" });
        }
        if (!newVenture.ventureDomain) {
          return res.status(400).json({ error: "newVenture.ventureDomain is required" });
        }
        if (!newVenture.ventureOneLiner) {
          return res.status(400).json({ error: "newVenture.ventureOneLiner is required" });
        }
      }

      const { generateProjectPlan } = await import("./project-scaffolding");

      const plan = await generateProjectPlan({
        ventureId,
        newVenture,
        projectName,
        projectCategory: projectCategory || "admin_general",
        desiredOutcome,
        scope,
        keyConstraints,
        domainContext,
      });

      res.json(plan);
    } catch (error: any) {
      logger.error({ error }, "Error generating project plan");

      if (error.message?.includes("All AI models failed")) {
        return res.status(503).json({
          error: "AI service temporarily unavailable",
          message: "Please try again in a moment",
        });
      }

      res.status(500).json({ error: "Failed to generate project plan" });
    }
  });

  // Commit a generated project plan to the database (creates venture if in plan)
  app.post("/api/project-scaffolding/commit", async (req, res) => {
    try {
      const { ventureId, plan, startDate, targetEndDate } = req.body;

      // Validate required fields
      if (!plan || !plan.project || !plan.phases) {
        return res.status(400).json({ error: "plan with project and phases is required" });
      }

      // Either ventureId must be provided OR plan must include venture
      if (!ventureId && !plan.venture) {
        return res.status(400).json({ error: "Either ventureId or plan.venture is required" });
      }

      // If using existing venture, verify it exists
      if (ventureId && !plan.venture) {
        const venture = await storage.getVenture(ventureId);
        if (!venture) {
          return res.status(404).json({ error: "Venture not found" });
        }
      }

      const { commitProjectPlan } = await import("./project-scaffolding");

      const result = await commitProjectPlan(ventureId || null, plan, {
        startDate,
        targetEndDate,
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error({ error }, "Error committing project plan");
      res.status(500).json({ error: "Failed to commit project plan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
