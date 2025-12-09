/**
 * Projects Routes
 * CRUD operations for projects within ventures
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Nullable fields that need sanitization
const NULLABLE_FIELDS = ['startDate', 'targetEndDate', 'actualEndDate', 'outcome', 'notes', 'budget', 'externalId'];

// Sanitize body - convert empty strings to null for optional fields
function sanitizeBody(body: Record<string, any>): Record<string, any> {
  const sanitized = { ...body };
  for (const field of NULLABLE_FIELDS) {
    if (sanitized[field] === '') {
      sanitized[field] = null;
    }
  }
  return sanitized;
}

// Get all projects (optionally filter by venture)
// Pagination: add ?limit=N&offset=M to paginate. Without these, returns array (backwards compatible)
router.get("/", async (req: Request, res: Response) => {
  try {
    const wantsPagination = req.query.limit !== undefined || req.query.offset !== undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const ventureId = req.query.venture_id as string;
    const filters: Record<string, any> = { limit, offset };
    if (ventureId) filters.ventureId = ventureId;

    const projects = await storage.getProjects(filters);

    if (wantsPagination) {
      res.json({
        data: projects,
        pagination: {
          limit,
          offset,
          count: projects.length,
          hasMore: projects.length === limit,
        }
      });
    } else {
      res.json(projects);
    }
  } catch (error) {
    logger.error({ error }, "Error fetching projects");
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Get single project
router.get("/:id", async (req: Request, res: Response) => {
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
router.post("/", async (req: Request, res: Response) => {
  try {
    const sanitizedBody = sanitizeBody(req.body);
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
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    logger.info({ projectId: req.params.id, body: req.body }, "Updating project");
    const sanitizedBody = sanitizeBody(req.body);
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
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteProject(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting project");
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
