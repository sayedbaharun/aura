/**
 * Main Routes Index
 * Registers all route modules and creates the HTTP server
 */
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { logger } from "../logger";
import { requireAuth } from "../auth";
import uploadRoutes from "../upload-routes";

// Import all route modules
import authRoutes from "./auth";
import dashboardRoutes from "./dashboard";
import venturesRoutes from "./ventures";
import projectsRoutes from "./projects";
import phasesRoutes from "./phases";
import tasksRoutes from "./tasks";
import capturesRoutes from "./captures";
import daysRoutes from "./days";
import healthRoutes from "./health";
import nutritionRoutes from "./nutrition";
import docsRoutes from "./docs";
import attachmentsRoutes from "./attachments";
import settingsRoutes from "./settings";
import calendarRoutes from "./calendar";
import driveRoutes from "./drive";
import shoppingRoutes from "./shopping";
import booksRoutes from "./books";
import { strategiesRouter, checklistsRouter } from "./trading";
import ticktickRoutes from "./ticktick";
import aiChatRoutes from "./ai-chat";

export async function registerRoutes(app: Express): Promise<Server> {
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

    // Check database connectivity with lightweight ping instead of loading all ventures
    try {
      health.checks.database = await storage.ping();
      if (!health.checks.database) {
        health.status = 'degraded';
      }
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
  // AUTH ROUTES (No auth required for these endpoints)
  // ============================================================================
  app.use('/api/auth', authRoutes);

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
  // CORE ENTITIES
  // ============================================================================
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/ventures', venturesRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/phases', phasesRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/captures', capturesRoutes);
  app.use('/api/days', daysRoutes);

  // ============================================================================
  // HEALTH & NUTRITION
  // ============================================================================
  app.use('/api/health', healthRoutes);
  app.use('/api/nutrition', nutritionRoutes);

  // ============================================================================
  // KNOWLEDGE & DOCUMENTS
  // ============================================================================
  app.use('/api/docs', docsRoutes);
  app.use('/api/attachments', attachmentsRoutes);

  // ============================================================================
  // SETTINGS & USER PREFERENCES
  // ============================================================================
  app.use('/api/settings', settingsRoutes);

  // ============================================================================
  // EXTERNAL INTEGRATIONS
  // ============================================================================
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/drive', driveRoutes);
  app.use('/api/ticktick', ticktickRoutes);

  // ============================================================================
  // LIFE MANAGEMENT
  // ============================================================================
  app.use('/api/shopping', shoppingRoutes);
  app.use('/api/books', booksRoutes);

  // ============================================================================
  // TRADING
  // ============================================================================
  app.use('/api/trading-strategies', strategiesRouter);
  app.use('/api/trading-checklists', checklistsRouter);

  // ============================================================================
  // AI & CHAT
  // The AI chat router handles multiple endpoint groups:
  // - /api/ai-models -> /models
  // - /api/ai-agent-prompts/* -> /agent-prompts/*
  // - /api/chat/* -> /chat/*
  // - /api/ventures/:ventureId/chat/* -> /ventures/:ventureId/chat/*
  // - /api/ventures/:ventureId/ai/* -> /ventures/:ventureId/ai/*
  // - /api/project-scaffolding/* -> /project-scaffolding/*
  // ============================================================================
  app.use('/api', aiChatRoutes);

  // ============================================================================
  // FILE UPLOADS
  // ============================================================================
  app.use('/api', uploadRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
