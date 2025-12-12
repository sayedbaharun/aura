/**
 * Strategic Foresight Routes
 * Scenario planning, indicators, trend signals, analyses, and what-if questions
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import {
  insertVentureScenarioSchema,
  insertScenarioIndicatorSchema,
  insertTrendSignalSchema,
  insertStrategicAnalysisSchema,
  insertWhatIfQuestionSchema,
  insertForesightConversationSchema,
} from "@shared/schema";

// ============================================================================
// VENTURE SCENARIOS ROUTER
// ============================================================================

const scenariosRouter = Router({ mergeParams: true });

// Get all scenarios for a venture
scenariosRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const { status, quadrant, timeHorizon } = req.query;

    const scenarios = await storage.getVentureScenarios(ventureId, {
      status: status as string | undefined,
      quadrant: quadrant as string | undefined,
      timeHorizon: timeHorizon as string | undefined,
    });
    res.json(scenarios);
  } catch (error) {
    logger.error({ error }, "Error fetching venture scenarios");
    res.status(500).json({ error: "Failed to fetch scenarios" });
  }
});

// Get a single scenario
scenariosRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const scenario = await storage.getVentureScenario(req.params.id);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }
    res.json(scenario);
  } catch (error) {
    logger.error({ error }, "Error fetching scenario");
    res.status(500).json({ error: "Failed to fetch scenario" });
  }
});

// Create a scenario
scenariosRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const parsed = insertVentureScenarioSchema.safeParse({ ...req.body, ventureId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }
    const scenario = await storage.createVentureScenario(parsed.data);
    res.status(201).json(scenario);
  } catch (error) {
    logger.error({ error }, "Error creating scenario");
    res.status(500).json({ error: "Failed to create scenario" });
  }
});

// Update a scenario
scenariosRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const scenario = await storage.updateVentureScenario(req.params.id, req.body);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }
    res.json(scenario);
  } catch (error) {
    logger.error({ error }, "Error updating scenario");
    res.status(500).json({ error: "Failed to update scenario" });
  }
});

// Delete a scenario
scenariosRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteVentureScenario(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting scenario");
    res.status(500).json({ error: "Failed to delete scenario" });
  }
});

// ============================================================================
// SCENARIO INDICATORS ROUTER
// ============================================================================

const indicatorsRouter = Router({ mergeParams: true });

// Get all indicators for a venture
indicatorsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const { scenarioId, status, category } = req.query;

    const indicators = await storage.getScenarioIndicators({
      ventureId,
      scenarioId: scenarioId as string | undefined,
      status: status as string | undefined,
      category: category as string | undefined,
    });
    res.json(indicators);
  } catch (error) {
    logger.error({ error }, "Error fetching indicators");
    res.status(500).json({ error: "Failed to fetch indicators" });
  }
});

// Get a single indicator
indicatorsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const indicator = await storage.getScenarioIndicator(req.params.id);
    if (!indicator) {
      return res.status(404).json({ error: "Indicator not found" });
    }
    res.json(indicator);
  } catch (error) {
    logger.error({ error }, "Error fetching indicator");
    res.status(500).json({ error: "Failed to fetch indicator" });
  }
});

// Create an indicator
indicatorsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const parsed = insertScenarioIndicatorSchema.safeParse({ ...req.body, ventureId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }
    const indicator = await storage.createScenarioIndicator(parsed.data);
    res.status(201).json(indicator);
  } catch (error) {
    logger.error({ error }, "Error creating indicator");
    res.status(500).json({ error: "Failed to create indicator" });
  }
});

// Update an indicator
indicatorsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const indicator = await storage.updateScenarioIndicator(req.params.id, req.body);
    if (!indicator) {
      return res.status(404).json({ error: "Indicator not found" });
    }
    res.json(indicator);
  } catch (error) {
    logger.error({ error }, "Error updating indicator");
    res.status(500).json({ error: "Failed to update indicator" });
  }
});

// Delete an indicator
indicatorsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteScenarioIndicator(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting indicator");
    res.status(500).json({ error: "Failed to delete indicator" });
  }
});

// ============================================================================
// TREND SIGNALS ROUTER
// ============================================================================

const signalsRouter = Router({ mergeParams: true });

// Get all signals for a venture
signalsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const { status, category, strength } = req.query;

    const signals = await storage.getTrendSignals(ventureId, {
      status: status as string | undefined,
      category: category as string | undefined,
      strength: strength as string | undefined,
    });
    res.json(signals);
  } catch (error) {
    logger.error({ error }, "Error fetching signals");
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

// Get a single signal
signalsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const signal = await storage.getTrendSignal(req.params.id);
    if (!signal) {
      return res.status(404).json({ error: "Signal not found" });
    }
    res.json(signal);
  } catch (error) {
    logger.error({ error }, "Error fetching signal");
    res.status(500).json({ error: "Failed to fetch signal" });
  }
});

// Create a signal
signalsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const parsed = insertTrendSignalSchema.safeParse({ ...req.body, ventureId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }
    const signal = await storage.createTrendSignal(parsed.data);
    res.status(201).json(signal);
  } catch (error) {
    logger.error({ error }, "Error creating signal");
    res.status(500).json({ error: "Failed to create signal" });
  }
});

// Update a signal
signalsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const signal = await storage.updateTrendSignal(req.params.id, req.body);
    if (!signal) {
      return res.status(404).json({ error: "Signal not found" });
    }
    res.json(signal);
  } catch (error) {
    logger.error({ error }, "Error updating signal");
    res.status(500).json({ error: "Failed to update signal" });
  }
});

// Delete a signal
signalsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteTrendSignal(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting signal");
    res.status(500).json({ error: "Failed to delete signal" });
  }
});

// ============================================================================
// STRATEGIC ANALYSES ROUTER
// ============================================================================

const analysesRouter = Router({ mergeParams: true });

// Get all analyses for a venture
analysesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const { framework, status } = req.query;

    const analyses = await storage.getStrategicAnalyses(ventureId, {
      framework: framework as string | undefined,
      status: status as string | undefined,
    });
    res.json(analyses);
  } catch (error) {
    logger.error({ error }, "Error fetching analyses");
    res.status(500).json({ error: "Failed to fetch analyses" });
  }
});

// Get a single analysis
analysesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const analysis = await storage.getStrategicAnalysis(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    res.json(analysis);
  } catch (error) {
    logger.error({ error }, "Error fetching analysis");
    res.status(500).json({ error: "Failed to fetch analysis" });
  }
});

// Create an analysis
analysesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const parsed = insertStrategicAnalysisSchema.safeParse({ ...req.body, ventureId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }
    const analysis = await storage.createStrategicAnalysis(parsed.data);
    res.status(201).json(analysis);
  } catch (error) {
    logger.error({ error }, "Error creating analysis");
    res.status(500).json({ error: "Failed to create analysis" });
  }
});

// Update an analysis
analysesRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const analysis = await storage.updateStrategicAnalysis(req.params.id, req.body);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    res.json(analysis);
  } catch (error) {
    logger.error({ error }, "Error updating analysis");
    res.status(500).json({ error: "Failed to update analysis" });
  }
});

// Delete an analysis
analysesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteStrategicAnalysis(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting analysis");
    res.status(500).json({ error: "Failed to delete analysis" });
  }
});

// ============================================================================
// WHAT-IF QUESTIONS ROUTER
// ============================================================================

const whatIfsRouter = Router({ mergeParams: true });

// Get all what-if questions for a venture
whatIfsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const { category, explored } = req.query;

    const questions = await storage.getWhatIfQuestions(ventureId, {
      category: category as string | undefined,
      explored: explored === "true" ? true : explored === "false" ? false : undefined,
    });
    res.json(questions);
  } catch (error) {
    logger.error({ error }, "Error fetching what-if questions");
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// Get a single what-if question
whatIfsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const question = await storage.getWhatIfQuestion(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(question);
  } catch (error) {
    logger.error({ error }, "Error fetching question");
    res.status(500).json({ error: "Failed to fetch question" });
  }
});

// Create a what-if question
whatIfsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const parsed = insertWhatIfQuestionSchema.safeParse({ ...req.body, ventureId });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }
    const question = await storage.createWhatIfQuestion(parsed.data);
    res.status(201).json(question);
  } catch (error) {
    logger.error({ error }, "Error creating question");
    res.status(500).json({ error: "Failed to create question" });
  }
});

// Update a what-if question
whatIfsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const question = await storage.updateWhatIfQuestion(req.params.id, req.body);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(question);
  } catch (error) {
    logger.error({ error }, "Error updating question");
    res.status(500).json({ error: "Failed to update question" });
  }
});

// Delete a what-if question
whatIfsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteWhatIfQuestion(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting question");
    res.status(500).json({ error: "Failed to delete question" });
  }
});

// ============================================================================
// FORESIGHT SUMMARY & CONVERSATIONS ROUTER
// ============================================================================

const foresightRouter = Router({ mergeParams: true });

// Get foresight dashboard summary
foresightRouter.get("/summary", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const summary = await storage.getForesightSummary(ventureId);
    res.json(summary);
  } catch (error) {
    logger.error({ error }, "Error fetching foresight summary");
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Get foresight chat history
foresightRouter.get("/chat/history", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const conversations = await storage.getForesightConversations(ventureId, limit);
    res.json(conversations);
  } catch (error) {
    logger.error({ error }, "Error fetching foresight chat history");
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// Clear foresight chat history
foresightRouter.delete("/chat/history", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    await storage.clearForesightConversations(ventureId);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error clearing foresight chat history");
    res.status(500).json({ error: "Failed to clear chat history" });
  }
});

// ============================================================================
// MOUNT SUB-ROUTERS
// ============================================================================

// Mount all sub-routers on the main foresight router
foresightRouter.use("/scenarios", scenariosRouter);
foresightRouter.use("/indicators", indicatorsRouter);
foresightRouter.use("/signals", signalsRouter);
foresightRouter.use("/analyses", analysesRouter);
foresightRouter.use("/what-ifs", whatIfsRouter);

export default foresightRouter;
