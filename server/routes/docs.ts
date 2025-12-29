/**
 * Docs Routes
 * CRUD operations for documents (SOPs, prompts, specs, etc.) with hierarchy
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertDocSchema, insertAttachmentSchema } from "@shared/schema";
import { z } from "zod";
import { calculateDocQuality, getQualitySuggestions } from "../doc-quality";

const router = Router();

// Get all docs (with filters)
// Pagination: add ?limit=N&offset=M to paginate. Without these, returns array (backwards compatible)
router.get("/", async (req: Request, res: Response) => {
  try {
    const wantsPagination = req.query.limit !== undefined || req.query.offset !== undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const filters: Record<string, any> = {
      ventureId: req.query.venture_id as string,
      projectId: req.query.project_id as string,
      type: req.query.type as string,
      domain: req.query.domain as string,
      status: req.query.status as string,
      limit,
      offset,
    };

    // Handle parentId - can be 'null' string for root level docs
    if (req.query.parent_id !== undefined) {
      filters.parentId = req.query.parent_id === 'null' ? null : req.query.parent_id as string;
    }

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => value !== undefined || key === 'parentId')
    );

    const docs = await storage.getDocs(cleanFilters);

    if (wantsPagination) {
      res.json({
        data: docs,
        pagination: {
          limit,
          offset,
          count: docs.length,
          hasMore: docs.length === limit,
        }
      });
    } else {
      res.json(docs);
    }
  } catch (error) {
    logger.error({ error }, "Error fetching docs");
    res.status(500).json({ error: "Failed to fetch docs" });
  }
});

// Search docs
router.get("/search", async (req: Request, res: Response) => {
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

// Get doc tree for a venture
router.get("/tree/:ventureId", async (req: Request, res: Response) => {
  try {
    const docs = await storage.getDocTree(req.params.ventureId);
    res.json(docs);
  } catch (error) {
    logger.error({ error }, "Error fetching doc tree");
    res.status(500).json({ error: "Failed to fetch doc tree" });
  }
});

// Get direct children of a doc
router.get("/children/:parentId", async (req: Request, res: Response) => {
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

// ============================================================================
// QUALITY SCORING ENDPOINTS
// NOTE: These must be defined BEFORE /:id to avoid route matching conflicts
// ============================================================================

// Get docs needing review
router.get("/quality/review-queue", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const docs = await storage.getDocsNeedingReview(limit);
    res.json({ docs });
  } catch (error) {
    logger.error({ error }, "Error getting review queue");
    res.status(500).json({ error: "Failed to get review queue" });
  }
});

// Get quality metrics
router.get("/quality/metrics", async (req: Request, res: Response) => {
  try {
    const metrics = await storage.getDocQualityMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error({ error }, "Error getting metrics");
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

// Get single doc
router.get("/:id", async (req: Request, res: Response) => {
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

// Get attachments for a doc
router.get("/:docId/attachments", async (req: Request, res: Response) => {
  try {
    const attachments = await storage.getAttachments(req.params.docId);
    res.json(attachments);
  } catch (error) {
    logger.error({ error }, "Error fetching attachments");
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// Create doc
router.post("/", async (req: Request, res: Response) => {
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

// Reorder docs (for drag and drop)
router.post("/reorder", async (req: Request, res: Response) => {
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

// Update doc
router.patch("/:id", async (req: Request, res: Response) => {
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
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteDoc(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting doc");
    res.status(500).json({ error: "Failed to delete doc" });
  }
});

// Delete doc recursively (with all children)
router.delete("/:id/recursive", async (req: Request, res: Response) => {
  try {
    await storage.deleteDocRecursive(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting doc recursively");
    res.status(500).json({ error: "Failed to delete doc" });
  }
});

// ============================================================================
// QUALITY SCORING ENDPOINTS
// ============================================================================

// Recalculate quality score for a doc
router.post("/:id/recalculate-quality", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await storage.updateDocQualityScore(id);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Error recalculating quality");
    res.status(500).json({ error: "Failed to recalculate quality" });
  }
});

// Get quality breakdown for a doc
router.get("/:id/quality", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await storage.getDoc(id);
    if (!doc) {
      return res.status(404).json({ error: "Doc not found" });
    }
    const breakdown = calculateDocQuality(doc);
    const suggestions = getQualitySuggestions(doc);
    res.json({ ...breakdown, suggestions });
  } catch (error) {
    logger.error({ error }, "Error getting quality");
    res.status(500).json({ error: "Failed to get quality" });
  }
});

// Mark doc as reviewed
router.post("/:id/mark-reviewed", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await storage.markDocReviewed(id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error marking reviewed");
    res.status(500).json({ error: "Failed to mark reviewed" });
  }
});

export default router;
