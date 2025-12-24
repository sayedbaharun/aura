import { Router } from "express";
import { storage } from "../storage";
import { aiDocGenerator } from "../ai-doc-generator";
import { insertDocAiFeedbackSchema, insertDocAiTeachingSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Generate a structured field using AI
router.post("/generate-field", async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1),
      field: z.enum(['summary', 'keyPoints', 'applicableWhen']),
      docType: z.string(),
      docDomain: z.string().optional(),
      ventureId: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const result = await aiDocGenerator.generateField(data);

    res.json(result);
  } catch (error) {
    console.error("Error generating field:", error);
    res.status(500).json({ error: "Failed to generate field" });
  }
});

// Record user feedback on AI generation
router.post("/feedback", async (req, res) => {
  try {
    const data = insertDocAiFeedbackSchema.parse(req.body);

    // Calculate edit distance if we have both values
    let editDistance: number | undefined;
    if (data.aiSuggestion && data.userFinal) {
      editDistance = aiDocGenerator.calculateEditDistance(data.aiSuggestion, data.userFinal);
    }

    await storage.createDocAiFeedback({
      ...data,
      editDistance,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error recording feedback:", error);
    res.status(500).json({ error: "Failed to record feedback" });
  }
});

// Get examples for a field/type context
router.get("/examples", async (req, res) => {
  try {
    const { field, docType, docDomain, limit } = req.query;

    const examples = await storage.getDocAiExamples({
      fieldName: field as string,
      docType: docType as string,
      docDomain: docDomain as string | undefined,
      limit: limit ? parseInt(limit as string) : 5,
    });

    res.json({ examples });
  } catch (error) {
    console.error("Error getting examples:", error);
    res.status(500).json({ error: "Failed to get examples" });
  }
});

// Add a direct teaching
router.post("/teach", async (req, res) => {
  try {
    const data = insertDocAiTeachingSchema.parse(req.body);
    const teaching = await storage.createDocAiTeaching(data);

    res.json({ success: true, id: teaching.id });
  } catch (error) {
    console.error("Error saving teaching:", error);
    res.status(500).json({ error: "Failed to save teaching" });
  }
});

// Get AI performance metrics
router.get("/metrics", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const metrics = await storage.getDocAiMetrics(days);
    res.json(metrics);
  } catch (error) {
    console.error("Error getting metrics:", error);
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

export default router;
