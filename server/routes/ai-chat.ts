/**
 * AI Chat Routes
 * AI agent prompts, chat API, venture agents, and project scaffolding
 */
import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertAiAgentPromptSchema, insertTradingKnowledgeDocSchema } from "@shared/schema";
import { AVAILABLE_MODELS } from "../model-manager";
import multer from "multer";
import { z } from "zod";
import { DEFAULT_USER_ID } from "./constants";

const router = Router();

// Configure multer for knowledge doc file uploads (in-memory storage for base64 encoding)
const knowledgeDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs, text files, and images
    const allowedMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: PDF, TXT, MD, CSV, JPEG, PNG, GIF, WebP`));
    }
  },
});

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
  // Use session userId if available, otherwise fall back to IP
  keyGenerator: (req) => {
    const session = (req as any).session;
    if (session?.userId) {
      return session.userId;
    }
    // Use the express-rate-limit default IP handling
    return req.ip || "anonymous";
  },
  // Skip validation for keyGenerator since we handle it properly
  validate: { xForwardedForHeader: false },
});

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

// ============================================================================
// AI MODELS
// ============================================================================

// Get available AI models for selection
router.get("/models", async (_req: Request, res: Response) => {
  res.json(AVAILABLE_MODELS);
});

// ============================================================================
// AI AGENT PROMPTS
// ============================================================================

// Get AI agent prompt for a venture
router.get("/agent-prompts/venture/:ventureId", async (req: Request, res: Response) => {
  try {
    const prompt = await storage.getAiAgentPromptByVenture(req.params.ventureId);
    if (!prompt) {
      // Return a default configuration instead of 404
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
router.post("/agent-prompts", async (req: Request, res: Response) => {
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
router.patch("/agent-prompts/:id", async (req: Request, res: Response) => {
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
router.delete("/agent-prompts/:id", async (req: Request, res: Response) => {
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

// Get chat history for current user
router.get("/chat/history", async (req: Request, res: Response) => {
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
router.post("/chat", aiRateLimiter, async (req: Request, res: Response) => {
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
            const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'on_hold');
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
    };

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
router.delete("/chat/history", async (req: Request, res: Response) => {
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
router.post("/ventures/:ventureId/chat", aiRateLimiter, async (req: Request, res: Response) => {
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
    const { createVentureAgent } = await import("../venture-agent");

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

    const errorMessage = error.message || "Failed to process message";

    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return res.status(503).json({
        error: "AI agent database not initialized",
        message: "The venture AI agent tables need to be created. Please run database migrations."
      });
    }

    if (errorMessage.includes('Venture not found')) {
      return res.status(404).json({ error: errorMessage });
    }

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
router.get("/ventures/:ventureId/chat/history", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const history = await storage.getVentureConversations(ventureId, userId, limit);

    // Return in chronological order
    res.json(history.reverse());
  } catch (error) {
    logger.error({ error, ventureId: req.params.ventureId }, "Error fetching venture chat history (returning empty)");
    res.json([]);
  }
});

// Clear chat history for a venture
router.delete("/ventures/:ventureId/chat/history", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;

    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    await storage.deleteVentureConversations(ventureId, userId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error, ventureId: req.params.ventureId }, "Error clearing venture chat history (returning success)");
    res.json({ success: true });
  }
});

// Get venture AI agent actions (audit log)
router.get("/ventures/:ventureId/ai/actions", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const actions = await storage.getVentureAgentActions(ventureId, limit);
    res.json(actions);
  } catch (error) {
    logger.error({ error, ventureId: req.params.ventureId }, "Error fetching venture AI actions (returning empty)");
    res.json([]);
  }
});

// Rebuild venture context cache
router.post("/ventures/:ventureId/ai/rebuild-context", async (req: Request, res: Response) => {
  try {
    const { ventureId } = req.params;

    // Invalidate existing cache
    await storage.invalidateVentureContextCache(ventureId);

    // Dynamically import to avoid circular dependencies
    const { getCachedOrBuildContext } = await import("../venture-context-builder");

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
router.get("/ventures/:ventureId/ai/context-status", async (req: Request, res: Response) => {
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
// TRADING AI AGENT - CHAT SESSIONS
// ============================================================================

// Get all chat sessions for the user
router.get("/trading/chat/sessions", async (req: Request, res: Response) => {
  try {
    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const sessions = await storage.getTradingChatSessions(userId);
    res.json(sessions);
  } catch (error) {
    logger.error({ error }, "Error fetching trading chat sessions");
    res.json([]);
  }
});

// Create a new chat session
router.post("/trading/chat/sessions", async (req: Request, res: Response) => {
  try {
    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const { title } = req.body;

    const session = await storage.createTradingChatSession({
      userId,
      title: title || "New Chat",
    });

    res.status(201).json(session);
  } catch (error) {
    logger.error({ error }, "Error creating trading chat session");
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

// Update a chat session (rename)
router.patch("/trading/chat/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;

    const session = await storage.updateTradingChatSession(sessionId, { title });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    logger.error({ error }, "Error updating trading chat session");
    res.status(500).json({ error: "Failed to update chat session" });
  }
});

// Delete a chat session and its messages
router.delete("/trading/chat/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await storage.deleteTradingChatSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting trading chat session");
    res.status(500).json({ error: "Failed to delete chat session" });
  }
});

// ============================================================================
// TRADING AI AGENT - CHAT MESSAGES
// ============================================================================

// Send a chat message to the trading AI agent
router.post("/trading/chat", aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

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
    const { createTradingAgent } = await import("../trading-agent");

    // Create and initialize the trading agent
    const agent = await createTradingAgent(userId);

    // Process the message with session context
    const result = await agent.chat(message, sessionId);

    res.json({
      response: result.response,
      actions: result.actions,
      model: result.model,
      tokensUsed: result.tokensUsed,
    });
  } catch (error: any) {
    logger.error({ error }, "Error processing trading chat message");

    const errorMessage = error.message || "Failed to process message";

    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return res.status(503).json({
        error: "Trading AI agent database not initialized",
        message: "The trading AI agent tables need to be created. Please run database migrations."
      });
    }

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

// Get trading chat history for a session
router.get("/trading/chat/history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const sessionId = req.query.sessionId as string | undefined;

    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const history = await storage.getTradingConversations(userId, limit, sessionId);

    // Return in chronological order
    res.json(history.reverse());
  } catch (error) {
    logger.error({ error }, "Error fetching trading chat history (returning empty)");
    res.json([]);
  }
});

// Clear trading chat history for a session
router.delete("/trading/chat/history", async (req: Request, res: Response) => {
  try {
    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;
    const sessionId = req.query.sessionId as string | undefined;

    await storage.deleteTradingConversations(userId, sessionId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error clearing trading chat history (returning success)");
    res.json({ success: true });
  }
});

// Get trading agent config
router.get("/trading/agent/config", async (req: Request, res: Response) => {
  try {
    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const config = await storage.getTradingAgentConfig(userId);

    // Return default config if none exists
    if (!config) {
      return res.json({
        id: null,
        userId,
        systemPrompt: null,
        tradingStyle: null,
        instruments: null,
        timeframes: null,
        riskRules: null,
        tradingHours: null,
        quickActions: [],
        preferredModel: null,
        focusAreas: [],
        createdAt: null,
        updatedAt: null,
      });
    }

    res.json(config);
  } catch (error) {
    logger.error({ error }, "Error fetching trading agent config");
    res.status(500).json({ error: "Failed to fetch trading agent config" });
  }
});

// Update trading agent config
router.put("/trading/agent/config", async (req: Request, res: Response) => {
  try {
    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const config = await storage.upsertTradingAgentConfig(userId, req.body);
    res.json(config);
  } catch (error) {
    logger.error({ error }, "Error updating trading agent config");
    res.status(500).json({ error: "Failed to update trading agent config" });
  }
});

// ============================================================================
// TRADING KNOWLEDGE DOCUMENTS - Documents for AI agent training/context
// ============================================================================

// Get all trading knowledge documents for the user
router.get("/trading/knowledge-docs", async (req: Request, res: Response) => {
  try {
    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const { category, includeInContext } = req.query;
    const filters: { category?: string; includeInContext?: boolean } = {};

    if (category) filters.category = category as string;
    if (includeInContext !== undefined) {
      filters.includeInContext = includeInContext === "true";
    }

    const docs = await storage.getTradingKnowledgeDocs(userId, filters);

    // Don't send file data in list response for performance
    const docsWithoutData = docs.map(doc => ({
      ...doc,
      fileData: doc.fileData ? "[BASE64_DATA]" : null,
    }));

    res.json(docsWithoutData);
  } catch (error) {
    logger.error({ error }, "Error fetching trading knowledge docs");
    res.status(500).json({ error: "Failed to fetch trading knowledge docs" });
  }
});

// Get a single trading knowledge document
router.get("/trading/knowledge-docs/:id", async (req: Request, res: Response) => {
  try {
    const doc = await storage.getTradingKnowledgeDoc(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(doc);
  } catch (error) {
    logger.error({ error }, "Error fetching trading knowledge doc");
    res.status(500).json({ error: "Failed to fetch trading knowledge doc" });
  }
});

// Create a trading knowledge document with file upload
router.post(
  "/trading/knowledge-docs",
  knowledgeDocUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      await ensureDefaultUserExists();
      const userId = DEFAULT_USER_ID;

      const { title, description, category, tags, priority, includeInContext, extractedText } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const file = req.file;

      // Prepare document data
      const docData: any = {
        userId,
        title,
        description: description || null,
        category: category || "other",
        tags: tags || null,
        priority: priority ? parseInt(priority) : 0,
        includeInContext: includeInContext !== "false",
        extractedText: extractedText || null,
      };

      // Handle file upload if present
      if (file) {
        docData.fileName = file.originalname;
        docData.fileType = file.mimetype;
        docData.fileSize = file.size;
        docData.storageType = "base64";
        docData.fileData = file.buffer.toString("base64");

        // For text files, extract content automatically
        if (file.mimetype === "text/plain" || file.mimetype === "text/markdown" || file.mimetype === "text/csv") {
          docData.extractedText = file.buffer.toString("utf-8");
        }
      }

      const doc = await storage.createTradingKnowledgeDoc(docData);

      // Don't return file data in response
      res.status(201).json({
        ...doc,
        fileData: doc.fileData ? "[BASE64_DATA]" : null,
      });
    } catch (error) {
      logger.error({ error }, "Error creating trading knowledge doc");
      res.status(500).json({ error: "Failed to create trading knowledge doc" });
    }
  }
);

// Update a trading knowledge document
router.patch("/trading/knowledge-docs/:id", async (req: Request, res: Response) => {
  try {
    const { title, description, category, tags, priority, includeInContext, extractedText, summary } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (priority !== undefined) updates.priority = parseInt(priority);
    if (includeInContext !== undefined) updates.includeInContext = includeInContext;
    if (extractedText !== undefined) updates.extractedText = extractedText;
    if (summary !== undefined) updates.summary = summary;

    const doc = await storage.updateTradingKnowledgeDoc(req.params.id, updates);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      ...doc,
      fileData: doc.fileData ? "[BASE64_DATA]" : null,
    });
  } catch (error) {
    logger.error({ error }, "Error updating trading knowledge doc");
    res.status(500).json({ error: "Failed to update trading knowledge doc" });
  }
});

// Delete a trading knowledge document
router.delete("/trading/knowledge-docs/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteTradingKnowledgeDoc(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting trading knowledge doc");
    res.status(500).json({ error: "Failed to delete trading knowledge doc" });
  }
});

// Get documents formatted for AI context (text content only)
router.get("/trading/knowledge-docs/for-context", async (req: Request, res: Response) => {
  try {
    await ensureDefaultUserExists();
    const userId = DEFAULT_USER_ID;

    const docs = await storage.getTradingKnowledgeDocsForContext(userId);

    // Return only text content for AI context
    const contextDocs = docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      content: doc.extractedText || doc.summary || doc.description || "",
    })).filter(doc => doc.content); // Only return docs with content

    res.json(contextDocs);
  } catch (error) {
    logger.error({ error }, "Error fetching trading knowledge docs for context");
    res.status(500).json({ error: "Failed to fetch trading knowledge docs for context" });
  }
});

// ============================================================================
// PROJECT SCAFFOLDING - AI-powered project plan generation
// ============================================================================

// Get scaffolding options (categories, scopes, venture domains)
router.get("/project-scaffolding/options", async (req: Request, res: Response) => {
  try {
    const { getProjectCategories, getScopeOptions, getVentureDomains } = await import("../project-scaffolding");
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
router.post("/project-scaffolding/generate", aiRateLimiter, async (req: Request, res: Response) => {
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

    const { generateProjectPlan } = await import("../project-scaffolding");

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
router.post("/project-scaffolding/commit", async (req: Request, res: Response) => {
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

    const { commitProjectPlan } = await import("../project-scaffolding");

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

export default router;
