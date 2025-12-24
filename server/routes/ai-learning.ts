import { Router } from "express";
import { aiLearningService } from "../ai-learning";

const router = Router();

// Run pattern analysis (admin/cron endpoint)
router.post("/analyze-patterns", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    await aiLearningService.analyzeAndUpdatePatterns(days);
    res.json({ success: true, message: "Pattern analysis complete" });
  } catch (error) {
    console.error("Error analyzing patterns:", error);
    res.status(500).json({ error: "Failed to analyze patterns" });
  }
});

// Run promotion check (admin/cron endpoint)
router.post("/run-promotions", async (req, res) => {
  try {
    const promoted = await aiLearningService.runPromotionCheck();
    res.json({ success: true, promoted });
  } catch (error) {
    console.error("Error running promotions:", error);
    res.status(500).json({ error: "Failed to run promotions" });
  }
});

// Get performance metrics
router.get("/metrics", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const metrics = await aiLearningService.getMetrics(days);
    res.json(metrics);
  } catch (error) {
    console.error("Error getting metrics:", error);
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

// Health check
router.get("/health", async (req, res) => {
  try {
    const health = await aiLearningService.checkHealthAndAlert();
    res.json(health);
  } catch (error) {
    console.error("Error checking health:", error);
    res.status(500).json({ error: "Failed to check health" });
  }
});

// Manually promote a doc to examples
router.post("/promote/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const { field } = req.body;

    if (!field || !['summary', 'keyPoints', 'applicableWhen'].includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }

    await aiLearningService.promoteToExample(docId, field);
    res.json({ success: true });
  } catch (error) {
    console.error("Error promoting doc:", error);
    res.status(500).json({ error: "Failed to promote doc" });
  }
});

export default router;
