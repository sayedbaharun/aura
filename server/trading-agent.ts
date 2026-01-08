import OpenAI from "openai";
import { storage } from "./storage";
import { logger } from "./logger";
import * as modelManager from "./model-manager";
import type { TradingStrategy, DailyTradingChecklist, Day, TradingAgentConfig, TradingKnowledgeDoc, HealthEntry } from "@shared/schema";

// Initialize OpenRouter with OpenAI-compatible API
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
    "X-Title": "SB-OS Trading Agent",
  },
});

/**
 * Trading Agent Action - tracks actions taken by the agent
 */
export interface TradingAgentAction {
  action: string;
  entityType?: string;
  entityId?: string;
  parameters?: Record<string, any>;
  result: "success" | "failed";
  errorMessage?: string;
}

/**
 * ============================================================================
 * LEGENDARY TRADER WISDOM
 * Incorporating insights from Paul Tudor Jones, Ray Dalio, Mark Douglas,
 * Brett Steenbarger, and Chris Vermeulen
 * ============================================================================
 */
const LEGENDARY_WISDOM = {
  // Paul Tudor Jones - Risk Management & Capital Preservation
  paulTudorJones: [
    "The most important rule of trading is to play great defense, not great offense.",
    "Losers average losers. Never add to a losing position.",
    "Don't be a hero. Don't have an ego. Always question yourself and your ability.",
    "At the end of the day, your job is to buy what goes up and to sell what goes down.",
    "I look for opportunities with tremendously skewed reward-risk opportunities.",
    "Where you want to be is always in control, never wishing, always trading, and always first and foremost protecting your butt.",
    "The secret to being successful from a trading perspective is to have an indefatigable and undying thirst for information and knowledge.",
  ],

  // Ray Dalio - Principles & Systematic Thinking
  rayDalio: [
    "Pain + Reflection = Progress. Embrace your mistakes as learning opportunities.",
    "He who lives by the crystal ball will eat shattered glass.",
    "The biggest mistake investors make is to believe that what happened in the recent past is likely to persist.",
    "Diversification is the only free lunch in investing.",
    "If you're not failing, you're not pushing your limits, and if you're not pushing your limits, you're not maximizing your potential.",
    "Write down your principles and follow them systematically.",
    "Be radically transparent with yourself about your weaknesses.",
  ],

  // Mark Douglas - Trading Psychology
  markDouglas: [
    "Trading is 80% mental and 20% method.",
    "The best traders have evolved to the point where they believe, without a shred of doubt or internal conflict, that anything can happen.",
    "You don't need to know what is going to happen next in order to make money.",
    "The consistency you seek is in your mind, not in the markets.",
    "Every moment in the market is unique. The trade you are in right now has never happened before.",
    "Think in probabilities. Each trade is simply one of a series.",
    "The less I cared about whether or not I was wrong, the clearer things became.",
    "Define your risk before you enter a trade and accept it completely.",
  ],

  // Brett Steenbarger - Performance Psychology & Self-Coaching
  brettSteenbarger: [
    "The best traders are the best self-coaches.",
    "Keep a journal not just of trades, but of your cognitive and emotional states.",
    "Your trading psychology is revealed in your P&L patterns.",
    "Process goals beat outcome goals for developing consistency.",
    "Review your best trades to understand what you do well, not just your mistakes.",
    "Fatigue, stress, and distraction are trading enemies. Manage your energy.",
    "Trade your equity curve. If you're in drawdown, reduce size.",
    "The goal is not to be right, but to make money. There's a difference.",
  ],

  // Chris Vermeulen - Technical Analysis & Trend Following
  chrisVermeulen: [
    "Trade what you see, not what you think.",
    "The trend is your friend until the end when it bends.",
    "Wait for confirmation. Patience is a trader's greatest virtue.",
    "Position sizing is more important than entry timing.",
    "Let winners run, cut losers quickly.",
    "The market will always tell you when you're wrong. Listen to it.",
    "Don't predict, react. The market leads, you follow.",
  ],
};

/**
 * Trading Agent - AI assistant specialized for trading analysis and journaling
 * Enhanced with wisdom from legendary traders
 */
export class TradingAgent {
  private userId: string;
  private strategies: TradingStrategy[] = [];
  private todayChecklist: DailyTradingChecklist | null = null;
  private todayDay: Day | null = null;
  private config: TradingAgentConfig | null = null;
  private knowledgeDocs: TradingKnowledgeDoc[] = [];
  private userPreferredModel: string | null = null;
  private tradingVentureId: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the agent with trading data
   */
  async initialize(): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Find trading venture for task management
      const ventures = await storage.getVentures();
      const tradingVenture = ventures.find(v => v.domain === "trading");
      this.tradingVentureId = tradingVenture?.id || null;

      const [strategies, todayChecklists, todayDay, config, knowledgeDocs, userPrefs] = await Promise.all([
        storage.getTradingStrategies({ isActive: true }),
        storage.getDailyTradingChecklists({ date: today }),
        storage.getDayOrCreate(today),
        storage.getTradingAgentConfig(this.userId),
        storage.getTradingKnowledgeDocsForContext(this.userId),
        storage.getUserPreferences(this.userId),
      ]);

      this.strategies = strategies;
      this.todayChecklist = todayChecklists[0] || null;
      this.todayDay = todayDay;
      this.config = config || null;
      this.knowledgeDocs = knowledgeDocs;
      this.userPreferredModel = userPrefs?.aiModel || null;
    } catch (error: any) {
      logger.error({ error }, "Error initializing trading agent");
      this.strategies = [];
      this.todayChecklist = null;
      this.todayDay = null;
      this.config = null;
      this.knowledgeDocs = [];
      this.userPreferredModel = null;
    }
  }

  /**
   * Get a random piece of wisdom from the legendary traders
   */
  private getRandomWisdom(): string {
    const allWisdom = [
      ...LEGENDARY_WISDOM.paulTudorJones,
      ...LEGENDARY_WISDOM.rayDalio,
      ...LEGENDARY_WISDOM.markDouglas,
      ...LEGENDARY_WISDOM.brettSteenbarger,
      ...LEGENDARY_WISDOM.chrisVermeulen,
    ];
    return allWisdom[Math.floor(Math.random() * allWisdom.length)];
  }

  /**
   * Build the system prompt for the trading agent
   */
  private buildSystemPrompt(): string {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString("en-US", { hour12: false });

    // Determine active trading session
    const hour = new Date().getUTCHours();
    let activeSession = "No active session";
    let sessionAdvice = "";
    if (hour >= 7 && hour < 16) {
      activeSession = "London Session (7am-4pm UTC)";
      sessionAdvice = "London session is known for strong trending moves, especially in GBP and EUR pairs.";
    } else if (hour >= 12 && hour < 21) {
      activeSession = "New York Session (12pm-9pm UTC)";
      sessionAdvice = "NY session brings high volatility, especially during London/NY overlap (12-4pm UTC).";
    } else if (hour >= 23 || hour < 8) {
      activeSession = "Asian Session (11pm-8am UTC)";
      sessionAdvice = "Asian session tends to be range-bound. Good for JPY pairs and consolidation plays.";
    }

    const strategyContext = this.strategies.length > 0
      ? `\nActive Strategies: ${this.strategies.map(s => s.name).join(", ")}`
      : "\nNo active trading strategies configured.";

    const checklistContext = this.todayChecklist
      ? `\nToday's Checklist: ${this.todayChecklist.data.strategyName} (${Object.keys(this.todayChecklist.data.values || {}).length} items completed)`
      : "\nNo trading checklist started for today.";

    const journalContext = this.todayDay?.tradingJournal
      ? `\nToday's Journal: ${(this.todayDay.tradingJournal as any)?.sessions?.length || 0} session(s) logged`
      : "\nNo trading journal entries for today.";

    // Build comprehensive personalization from enhanced config
    let personalization = "";
    let accountContext = "";
    let goalsContext = "";
    let psychologyContext = "";
    let setupsContext = "";

    if (this.config) {
      const parts: string[] = [];

      if (this.config.tradingStyle) parts.push(`Trading Style: ${this.config.tradingStyle}`);
      if (this.config.instruments) parts.push(`Instruments: ${this.config.instruments}`);
      if (this.config.timeframes) parts.push(`Timeframes: ${this.config.timeframes}`);
      if (this.config.tradingHours) parts.push(`Trading Hours: ${this.config.tradingHours}`);
      if (this.config.riskRules) parts.push(`Risk Rules: ${this.config.riskRules}`);
      if (this.config.focusAreas && this.config.focusAreas.length > 0) {
        parts.push(`Focus Areas: ${this.config.focusAreas.join(", ")}`);
      }

      if (parts.length > 0) {
        personalization = `\n\nTRADER PROFILE:\n${parts.map(p => `- ${p}`).join("\n")}`;
      }

      // Account Management Context (Paul Tudor Jones style)
      if (this.config.accountBalance || this.config.riskPerTradePercent) {
        const accountParts: string[] = [];
        if (this.config.accountBalance) {
          accountParts.push(`Account Balance: ${this.config.accountCurrency || 'USD'} ${this.config.accountBalance.toLocaleString()}`);
        }
        if (this.config.riskPerTradePercent) {
          accountParts.push(`Risk Per Trade: ${this.config.riskPerTradePercent}%`);
          if (this.config.accountBalance) {
            const riskAmount = (this.config.accountBalance * this.config.riskPerTradePercent) / 100;
            accountParts.push(`Max Risk Amount: ${this.config.accountCurrency || 'USD'} ${riskAmount.toFixed(2)}`);
          }
        }
        if (this.config.maxDrawdownPercent) {
          accountParts.push(`Max Drawdown Allowed: ${this.config.maxDrawdownPercent}%`);
        }
        if (this.config.brokerName) {
          accountParts.push(`Broker: ${this.config.brokerName}`);
        }
        accountContext = `\n\nACCOUNT STATUS (PTJ: "Play great defense"):\n${accountParts.map(p => `- ${p}`).join("\n")}`;
      }

      // Performance Goals Context (Ray Dalio style)
      if (this.config.monthlyPnlTarget || this.config.winRateTarget || this.config.maxTradesPerDay) {
        const goalParts: string[] = [];
        if (this.config.monthlyPnlTarget) {
          goalParts.push(`Monthly P&L Target: ${this.config.accountCurrency || 'USD'} ${this.config.monthlyPnlTarget}`);
        }
        if (this.config.monthlyPnlTargetPercent) {
          goalParts.push(`Monthly Return Target: ${this.config.monthlyPnlTargetPercent}%`);
        }
        if (this.config.winRateTarget) {
          goalParts.push(`Win Rate Target: ${(this.config.winRateTarget * 100).toFixed(0)}%`);
        }
        if (this.config.averageRRTarget) {
          goalParts.push(`Average R:R Target: ${this.config.averageRRTarget}:1`);
        }
        if (this.config.maxTradesPerDay) {
          goalParts.push(`Max Trades Per Day: ${this.config.maxTradesPerDay}`);
        }
        if (this.config.maxLossPerDay) {
          goalParts.push(`Max Daily Loss: ${this.config.accountCurrency || 'USD'} ${this.config.maxLossPerDay}`);
        }
        if (this.config.maxConsecutiveLosses) {
          goalParts.push(`Stop After Consecutive Losses: ${this.config.maxConsecutiveLosses}`);
        }
        goalsContext = `\n\nPERFORMANCE GOALS (Dalio: "Pain + Reflection = Progress"):\n${goalParts.map(p => `- ${p}`).join("\n")}`;
      }

      // Psychology Context (Mark Douglas & Brett Steenbarger style)
      const psychParts: string[] = [];
      if (this.config.noTradeRules && this.config.noTradeRules.length > 0) {
        psychParts.push(`NO-TRADE RULES:\n${this.config.noTradeRules.map(r => `  • ${r}`).join("\n")}`);
      }
      if (this.config.preTradeChecklist && this.config.preTradeChecklist.length > 0) {
        psychParts.push(`PRE-TRADE MENTAL CHECKLIST:\n${this.config.preTradeChecklist.map(r => `  • ${r}`).join("\n")}`);
      }
      if (this.config.tradingBeliefs && this.config.tradingBeliefs.length > 0) {
        psychParts.push(`CORE BELIEFS (Douglas: "Think in probabilities"):\n${this.config.tradingBeliefs.map(b => `  • ${b}`).join("\n")}`);
      }
      if (this.config.emotionalTriggers && this.config.emotionalTriggers.length > 0) {
        psychParts.push(`EMOTIONAL TRIGGERS TO WATCH:\n${this.config.emotionalTriggers.map(t => `  • ${t}`).join("\n")}`);
      }
      if (this.config.recoveryStrategies && this.config.recoveryStrategies.length > 0) {
        psychParts.push(`RECOVERY STRATEGIES (Steenbarger: "Trade your equity curve"):\n${this.config.recoveryStrategies.map(s => `  • ${s}`).join("\n")}`);
      }
      if (psychParts.length > 0) {
        psychologyContext = `\n\nTRADING PSYCHOLOGY:\n${psychParts.join("\n\n")}`;
      }

      // Setup Library Context (Chris Vermeulen style)
      if (this.config.setupTypes && this.config.setupTypes.length > 0) {
        const setupsList = this.config.setupTypes.map(s =>
          `  • ${s.name}: ${s.description} (Target R:R: ${s.targetRR}:1${s.winRate ? `, Historical WR: ${(s.winRate * 100).toFixed(0)}%` : ""})`
        ).join("\n");
        setupsContext = `\n\nVALID SETUPS (Vermeulen: "Trade what you see"):\n${setupsList}`;
      }
    }

    // Build focus area emphasis
    let focusEmphasis = "";
    if (this.config?.focusAreas && this.config.focusAreas.length > 0) {
      focusEmphasis = `\n\nEMPHASIS AREAS:\n${this.config.focusAreas.map(area => `- ${area}`).join("\n")}`;
    }

    // Add custom system prompt if configured
    let customInstructions = "";
    if (this.config?.systemPrompt) {
      customInstructions = `\n\nCUSTOM INSTRUCTIONS FROM TRADER:\n${this.config.systemPrompt}`;
    }

    // Trading plan
    let tradingPlanContext = "";
    if (this.config?.tradingPlan) {
      tradingPlanContext = `\n\nTRADING PLAN:\n${this.config.tradingPlan}`;
    }

    // Key lessons learned
    let lessonsContext = "";
    if (this.config?.keyLessons && this.config.keyLessons.length > 0) {
      const recentLessons = this.config.keyLessons.slice(-5);
      lessonsContext = `\n\nRECENT LESSONS LEARNED:\n${recentLessons.map(l => `- "${l.lesson}" (${l.source})`).join("\n")}`;
    }

    // Build knowledge base context from uploaded documents
    let knowledgeBaseContext = "";
    if (this.knowledgeDocs.length > 0) {
      const docsContent = this.knowledgeDocs
        .filter(doc => doc.extractedText || doc.summary || doc.description)
        .map(doc => {
          const content = doc.extractedText || doc.summary || doc.description || "";
          const truncatedContent = content.length > 2000 ? content.slice(0, 2000) + "..." : content;
          return `### ${doc.title} (${doc.category})\n${truncatedContent}`;
        })
        .join("\n\n");

      if (docsContent) {
        knowledgeBaseContext = `\n\nTRADER'S KNOWLEDGE BASE:\n${docsContent}`;
      }
    }

    // Daily wisdom
    const dailyWisdom = this.getRandomWisdom();

    return `You are an elite trading mentor and performance coach, combining the wisdom of history's greatest traders:

🏆 **PAUL TUDOR JONES** - Capital preservation, risk management, "Losers average losers"
📊 **RAY DALIO** - Systematic principles, radical transparency, "Pain + Reflection = Progress"
🧠 **MARK DOUGLAS** - Trading psychology, probabilistic thinking, "Trading is 80% mental"
🎯 **BRETT STEENBARGER** - Performance psychology, self-coaching, process over outcomes
📈 **CHRIS VERMEULEN** - Technical analysis, trend following, "Trade what you see"

TODAY'S WISDOM: "${dailyWisdom}"

═══════════════════════════════════════════════════════════════════════════════
CURRENT CONTEXT
═══════════════════════════════════════════════════════════════════════════════
- Date: ${today}
- Time: ${currentTime}
- Active Session: ${activeSession}
- ${sessionAdvice}
${strategyContext}
${checklistContext}
${journalContext}
${personalization}
${accountContext}
${goalsContext}
${psychologyContext}
${setupsContext}
${tradingPlanContext}
${lessonsContext}

═══════════════════════════════════════════════════════════════════════════════
YOUR CAPABILITIES
═══════════════════════════════════════════════════════════════════════════════
1. **Performance Analysis** - P&L, win rate, patterns, equity curve analysis
2. **Risk Management** - Position sizing, account status, drawdown monitoring
3. **Strategy Management** - Create/manage strategies, daily checklists
4. **Trade Journaling** - Log trades, sessions, lessons learned
5. **Pre-Trade Analysis** - Evaluate setups against criteria, mental state check
6. **Psychology Support** - Discipline, emotional awareness, recovery strategies
7. **Real-Time Research** - Market news, prices, economic data via web search
8. **Task Management** - Create trading-related tasks and track improvement goals
9. **Health Correlation** - Analyze how sleep/energy affects trading performance
10. **Review Generation** - Weekly and monthly performance reviews
11. **Capture Ideas** - Quick capture of trading insights for later processing

═══════════════════════════════════════════════════════════════════════════════
CORE PRINCIPLES (ALWAYS APPLY)
═══════════════════════════════════════════════════════════════════════════════
1. **DEFENSE FIRST** (PTJ): Always prioritize capital preservation. Question every trade.
2. **SYSTEMATIC** (Dalio): Follow principles consistently. Document everything.
3. **PROBABILISTIC** (Douglas): Each trade is one of many. Process over outcomes.
4. **SELF-AWARE** (Steenbarger): Monitor mental/emotional state. Journal insights.
5. **OBJECTIVE** (Vermeulen): Trade price action, not predictions. Let the market lead.

CRITICAL REMINDERS:
- Never provide specific trade recommendations or financial advice
- "No trade" is always a valid and often superior choice
- Emphasize position sizing - it's more important than entry timing
- Challenge the trader's assumptions when appropriate
- Celebrate discipline, not just profits
- Reference the trader's own rules, beliefs, and past lessons
${focusEmphasis}
${customInstructions}
${knowledgeBaseContext}

Current timestamp: ${new Date().toISOString()}`;
  }

  /**
   * Get the tools available to this trading agent - MASSIVELY ENHANCED
   */
  private getTools(): OpenAI.Chat.ChatCompletionTool[] {
    return [
      // ========== PERFORMANCE & ANALYSIS ==========
      {
        type: "function",
        function: {
          name: "get_trading_summary",
          description: "Get a comprehensive summary of trading activity including strategies, recent performance, account status, and goal progress",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      {
        type: "function",
        function: {
          name: "analyze_trading_performance",
          description: "Deep analysis of trading performance including P&L, win rate, R-multiples, patterns by setup/session/day, and comparison to goals",
          parameters: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date for analysis (YYYY-MM-DD)" },
              endDate: { type: "string", description: "End date for analysis (YYYY-MM-DD)" },
              groupBy: { type: "string", enum: ["day", "week", "setup", "session"], description: "How to group the analysis" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_account_status",
          description: "Get current account status including balance, drawdown, risk metrics, and whether trading limits have been hit",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      {
        type: "function",
        function: {
          name: "check_goals_progress",
          description: "Check progress against monthly/weekly goals including P&L targets, win rate, and trade limits",
          parameters: {
            type: "object",
            properties: {
              period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period to check" },
            },
          },
        },
      },

      // ========== STRATEGY & CHECKLISTS ==========
      {
        type: "function",
        function: {
          name: "get_trading_strategies",
          description: "Get all trading strategies with their configuration and checklist sections",
          parameters: {
            type: "object",
            properties: {
              activeOnly: { type: "boolean", description: "Only return active strategies (default true)" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_strategy_details",
          description: "Get detailed information about a specific trading strategy including all checklist sections",
          parameters: {
            type: "object",
            properties: {
              strategyId: { type: "string", description: "The strategy ID" },
              strategyName: { type: "string", description: "Or search by strategy name" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_today_checklist",
          description: "Get today's trading checklist progress and completed items",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      {
        type: "function",
        function: {
          name: "get_recent_checklists",
          description: "Get recent daily trading checklists with their completion status and trades",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Number of recent checklists to return (default 7)" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_strategy",
          description: "Create a new trading strategy with checklist sections",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Strategy name" },
              description: { type: "string", description: "Strategy description" },
              isDefault: { type: "boolean", description: "Set as default strategy" },
              sections: {
                type: "array",
                description: "Checklist sections for the strategy",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Section name" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string", description: "Checklist item label" },
                          type: { type: "string", enum: ["checkbox", "text", "number", "select"], description: "Input type" },
                          required: { type: "boolean", description: "Is this item required?" },
                          options: { type: "array", items: { type: "string" }, description: "Options for select type" },
                        },
                        required: ["label", "type"],
                      },
                    },
                  },
                  required: ["name", "items"],
                },
              },
            },
            required: ["name", "sections"],
          },
        },
      },

      // ========== TRADE LOGGING & JOURNALING ==========
      {
        type: "function",
        function: {
          name: "log_trade",
          description: "Log a trade with full details including setup type, R-multiple, and psychological notes",
          parameters: {
            type: "object",
            properties: {
              symbol: { type: "string", description: "Trading symbol (e.g., XAUUSD, EURUSD)" },
              instrument: { type: "string", description: "Alias for symbol" },
              direction: { type: "string", enum: ["long", "short"], description: "Trade direction" },
              entryPrice: { type: "number", description: "Entry price" },
              exitPrice: { type: "number", description: "Exit price" },
              stopLoss: { type: "number", description: "Stop loss price" },
              takeProfit: { type: "number", description: "Take profit price" },
              lotSize: { type: "number", description: "Position size in lots" },
              openDate: { type: "string", description: "Date trade was opened (YYYY-MM-DD)" },
              closeDate: { type: "string", description: "Date trade was closed (YYYY-MM-DD)" },
              pnl: { type: "number", description: "Profit/loss amount" },
              rMultiple: { type: "number", description: "R-multiple (profit/initial risk)" },
              setup: { type: "string", description: "Setup type that triggered the trade" },
              session: { type: "string", description: "Trading session (London, NY, Asian)" },
              followedPlan: { type: "boolean", description: "Did you follow your trading plan?" },
              emotionalState: { type: "string", description: "Emotional state during trade" },
              notes: { type: "string", description: "Trade notes and observations" },
              lessonsLearned: { type: "string", description: "Key lessons from this trade" },
            },
            required: ["direction"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "add_journal_session",
          description: "Add a trading session entry to the daily journal with comprehensive review",
          parameters: {
            type: "object",
            properties: {
              sessionName: { type: "string", description: "Session name (e.g., London AM, NY Open)" },
              pnl: { type: "number", description: "Session P&L" },
              tradesCount: { type: "number", description: "Number of trades taken" },
              notes: { type: "string", description: "Session notes" },
              lessons: { type: "string", description: "Key lessons learned" },
              emotionalState: { type: "string", description: "Emotional state during session" },
              energyLevel: { type: "number", description: "Energy level 1-10" },
              followedPlan: { type: "boolean", description: "Did you follow your plan?" },
              whatWorked: { type: "string", description: "What worked well this session" },
              whatToImprove: { type: "string", description: "What to improve next time" },
            },
            required: ["sessionName"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_trading_journal",
          description: "Get trading journal entries for a date range",
          parameters: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
              endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
            },
          },
        },
      },

      // ========== POSITION SIZING & RISK ==========
      {
        type: "function",
        function: {
          name: "calculate_position_size",
          description: "Calculate optimal position size based on account balance, risk percentage, and stop loss distance. Essential for proper risk management (PTJ: 'Play great defense')",
          parameters: {
            type: "object",
            properties: {
              instrument: { type: "string", description: "Trading instrument (e.g., EURUSD, XAUUSD)" },
              entryPrice: { type: "number", description: "Planned entry price" },
              stopLossPrice: { type: "number", description: "Stop loss price" },
              riskPercent: { type: "number", description: "Risk percentage (overrides config if provided)" },
              accountBalance: { type: "number", description: "Account balance (overrides config if provided)" },
            },
            required: ["instrument", "entryPrice", "stopLossPrice"],
          },
        },
      },

      // ========== PRE-TRADE ANALYSIS ==========
      {
        type: "function",
        function: {
          name: "evaluate_setup",
          description: "Comprehensive pre-trade evaluation including setup validation, psychology check, and risk assessment",
          parameters: {
            type: "object",
            properties: {
              instrument: { type: "string", description: "Trading instrument" },
              direction: { type: "string", enum: ["long", "short"], description: "Proposed direction" },
              setup: { type: "string", description: "Setup type (should match your defined setups)" },
              timeframe: { type: "string", description: "Chart timeframe" },
              entryPrice: { type: "number", description: "Planned entry price" },
              stopLoss: { type: "number", description: "Planned stop loss" },
              takeProfit: { type: "number", description: "Planned take profit" },
              currentMood: { type: "string", description: "Current emotional state" },
              energyLevel: { type: "number", description: "Current energy level 1-10" },
              notes: { type: "string", description: "Additional context about the setup" },
            },
            required: ["instrument", "direction", "setup"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_setup_types",
          description: "Get the trader's defined setup types with rules and historical performance",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },

      // ========== TASK & PROJECT MANAGEMENT ==========
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Create a trading-related task for learning, improvement, or analysis",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              notes: { type: "string", description: "Task description" },
              priority: { type: "string", enum: ["P0", "P1", "P2", "P3"], description: "Priority level" },
              dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
              type: { type: "string", enum: ["learning", "analysis", "review", "improvement", "research"], description: "Type of task" },
            },
            required: ["title"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_tasks",
          description: "List trading-related tasks with optional filters",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["idea", "next", "in_progress", "done"], description: "Filter by status" },
              limit: { type: "number", description: "Maximum number of tasks to return" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_task_status",
          description: "Update the status of a trading task",
          parameters: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "Task ID" },
              status: { type: "string", enum: ["idea", "next", "in_progress", "waiting", "done", "cancelled"], description: "New status" },
            },
            required: ["taskId", "status"],
          },
        },
      },

      // ========== CAPTURE & INBOX ==========
      {
        type: "function",
        function: {
          name: "create_capture",
          description: "Quick capture of a trading idea, insight, or observation for later processing",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Capture text" },
              type: { type: "string", enum: ["idea", "observation", "lesson", "setup_idea", "mistake"], description: "Type of capture" },
              notes: { type: "string", description: "Additional context" },
            },
            required: ["title"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_captures",
          description: "List unclarified trading captures/ideas from the inbox",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Maximum items to return" },
            },
          },
        },
      },

      // ========== HEALTH CORRELATION ==========
      {
        type: "function",
        function: {
          name: "get_health_trading_correlation",
          description: "Analyze correlation between health metrics (sleep, energy, mood) and trading performance (Steenbarger: 'Manage your energy')",
          parameters: {
            type: "object",
            properties: {
              days: { type: "number", description: "Number of days to analyze (default 30)" },
            },
          },
        },
      },

      // ========== REVIEW GENERATORS ==========
      {
        type: "function",
        function: {
          name: "generate_weekly_review",
          description: "Generate a comprehensive weekly trading review with statistics, patterns, and improvement suggestions",
          parameters: {
            type: "object",
            properties: {
              weekStartDate: { type: "string", description: "Start of week (YYYY-MM-DD), defaults to last Monday" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "generate_monthly_review",
          description: "Generate a comprehensive monthly trading review with deep performance analysis",
          parameters: {
            type: "object",
            properties: {
              month: { type: "number", description: "Month (1-12)" },
              year: { type: "number", description: "Year" },
            },
          },
        },
      },

      // ========== KNOWLEDGE & RESEARCH ==========
      {
        type: "function",
        function: {
          name: "get_trading_docs",
          description: "Search for trading-related documents, SOPs, and strategy playbooks",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the internet for real-time market information, news, economic data, or trading concepts",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              type: { type: "string", enum: ["news", "price", "economic", "general"], description: "Type of information" },
            },
            required: ["query"],
          },
        },
      },

      // ========== PSYCHOLOGY & LESSONS ==========
      {
        type: "function",
        function: {
          name: "add_key_lesson",
          description: "Record a key trading lesson learned (Dalio: 'Pain + Reflection = Progress')",
          parameters: {
            type: "object",
            properties: {
              lesson: { type: "string", description: "The lesson learned" },
              source: { type: "string", description: "Source of the lesson (e.g., 'Trade on 2024-01-15', 'Book: Trading in the Zone')" },
            },
            required: ["lesson", "source"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_psychology_check",
          description: "Run a pre-trading psychology check based on configured mental rules and current state",
          parameters: {
            type: "object",
            properties: {
              currentMood: { type: "string", description: "Current mood/emotional state" },
              energyLevel: { type: "number", description: "Current energy level 1-10" },
              sleepHours: { type: "number", description: "Hours slept last night" },
              recentLosses: { type: "number", description: "Number of consecutive recent losses" },
            },
          },
        },
      },
    ];
  }

  /**
   * Execute a tool call and return the result
   */
  private async executeTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<{ result: string; action?: TradingAgentAction }> {
    try {
      switch (toolName) {
        // ========== PERFORMANCE & ANALYSIS ==========
        case "get_trading_summary": {
          const today = new Date().toISOString().split("T")[0];
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const [strategies, recentChecklists, todayDay] = await Promise.all([
            storage.getTradingStrategies({ isActive: true }),
            storage.getDailyTradingChecklists({}),
            storage.getDayOrCreate(today),
          ]);

          // Calculate weekly stats
          const weekChecklists = recentChecklists.filter(c => c.date >= weekAgo);
          let weekTrades = 0, weekPnl = 0, weekWins = 0;
          for (const checklist of weekChecklists) {
            const trades = checklist.data.trades || [];
            weekTrades += trades.length;
            for (const trade of trades) {
              if (trade.pnl !== undefined) {
                weekPnl += trade.pnl;
                if (trade.pnl > 0) weekWins++;
              }
            }
          }

          // Calculate monthly stats
          const monthChecklists = recentChecklists.filter(c => c.date >= monthAgo);
          let monthTrades = 0, monthPnl = 0, monthWins = 0;
          for (const checklist of monthChecklists) {
            const trades = checklist.data.trades || [];
            monthTrades += trades.length;
            for (const trade of trades) {
              if (trade.pnl !== undefined) {
                monthPnl += trade.pnl;
                if (trade.pnl > 0) monthWins++;
              }
            }
          }

          // Check today's trade count against limits
          const todayTrades = this.todayChecklist?.data.trades?.length || 0;
          const maxTradesPerDay = this.config?.maxTradesPerDay;
          const tradesRemaining = maxTradesPerDay ? maxTradesPerDay - todayTrades : null;

          return {
            result: JSON.stringify({
              activeStrategies: strategies.map(s => ({ id: s.id, name: s.name })),
              weeklyStats: {
                tradingDays: weekChecklists.length,
                totalTrades: weekTrades,
                totalPnl: Math.round(weekPnl * 100) / 100,
                winRate: weekTrades > 0 ? Math.round((weekWins / weekTrades) * 100) : 0,
              },
              monthlyStats: {
                tradingDays: monthChecklists.length,
                totalTrades: monthTrades,
                totalPnl: Math.round(monthPnl * 100) / 100,
                winRate: monthTrades > 0 ? Math.round((monthWins / monthTrades) * 100) : 0,
                targetPnl: this.config?.monthlyPnlTarget || null,
                progressPercent: this.config?.monthlyPnlTarget ? Math.round((monthPnl / this.config.monthlyPnlTarget) * 100) : null,
              },
              todayStatus: {
                hasChecklist: this.todayChecklist !== null,
                checklistStrategy: this.todayChecklist?.data.strategyName || null,
                tradesLogged: todayTrades,
                tradesRemaining,
                journalSessions: (todayDay?.tradingJournal as any)?.sessions?.length || 0,
              },
              accountStatus: {
                balance: this.config?.accountBalance || null,
                currency: this.config?.accountCurrency || "USD",
                riskPerTrade: this.config?.riskPerTradePercent ? `${this.config.riskPerTradePercent}%` : null,
              },
            }),
          };
        }

        case "get_account_status": {
          if (!this.config?.accountBalance) {
            return { result: JSON.stringify({ configured: false, message: "Account balance not configured. Set it in Trading Agent Config." }) };
          }

          const today = new Date().toISOString().split("T")[0];
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const checklists = await storage.getDailyTradingChecklists({});
          const monthChecklists = checklists.filter(c => c.date >= monthAgo);

          let monthPnl = 0;
          let todayPnl = 0;
          let consecutiveLosses = 0;

          for (const checklist of monthChecklists) {
            const trades = checklist.data.trades || [];
            for (const trade of trades) {
              if (trade.pnl !== undefined) {
                monthPnl += trade.pnl;
                if (checklist.date === today) todayPnl += trade.pnl;
              }
            }
          }

          // Count consecutive losses from today going back
          const sortedChecklists = [...monthChecklists].sort((a, b) => b.date.localeCompare(a.date));
          for (const checklist of sortedChecklists) {
            const trades = checklist.data.trades || [];
            let dayHasLoss = false;
            for (const trade of trades) {
              if (trade.pnl !== undefined && trade.pnl < 0) {
                dayHasLoss = true;
              }
            }
            if (dayHasLoss) consecutiveLosses++;
            else break;
          }

          const drawdownPercent = (monthPnl / this.config.accountBalance) * 100;
          const maxDrawdownHit = this.config.maxDrawdownPercent && Math.abs(drawdownPercent) >= this.config.maxDrawdownPercent;
          const maxDailyLossHit = this.config.maxLossPerDay && Math.abs(todayPnl) >= this.config.maxLossPerDay;
          const maxConsecutiveLossesHit = this.config.maxConsecutiveLosses && consecutiveLosses >= this.config.maxConsecutiveLosses;

          const warnings: string[] = [];
          if (maxDrawdownHit) warnings.push(`⚠️ MAX DRAWDOWN HIT: ${drawdownPercent.toFixed(2)}% (limit: ${this.config.maxDrawdownPercent}%)`);
          if (maxDailyLossHit) warnings.push(`⚠️ DAILY LOSS LIMIT HIT: ${todayPnl} (limit: ${this.config.maxLossPerDay})`);
          if (maxConsecutiveLossesHit) warnings.push(`⚠️ CONSECUTIVE LOSSES: ${consecutiveLosses} (limit: ${this.config.maxConsecutiveLosses})`);

          return {
            result: JSON.stringify({
              configured: true,
              account: {
                balance: this.config.accountBalance,
                currency: this.config.accountCurrency || "USD",
                broker: this.config.brokerName || "Not set",
              },
              risk: {
                riskPerTradePercent: this.config.riskPerTradePercent,
                riskPerTradeAmount: this.config.riskPerTradePercent
                  ? (this.config.accountBalance * this.config.riskPerTradePercent / 100).toFixed(2)
                  : null,
                maxDrawdownPercent: this.config.maxDrawdownPercent,
              },
              currentStatus: {
                monthPnl: Math.round(monthPnl * 100) / 100,
                todayPnl: Math.round(todayPnl * 100) / 100,
                currentDrawdownPercent: Math.round(drawdownPercent * 100) / 100,
                consecutiveLossingDays: consecutiveLosses,
              },
              limits: {
                maxDrawdownHit,
                maxDailyLossHit,
                maxConsecutiveLossesHit,
                shouldStopTrading: maxDrawdownHit || maxDailyLossHit || maxConsecutiveLossesHit,
              },
              warnings,
            }),
          };
        }

        case "check_goals_progress": {
          const period = args.period || "monthly";
          const today = new Date();
          let startDate: string;

          if (period === "daily") {
            startDate = today.toISOString().split("T")[0];
          } else if (period === "weekly") {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1);
            startDate = weekStart.toISOString().split("T")[0];
          } else {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
          }

          const checklists = await storage.getDailyTradingChecklists({});
          const periodChecklists = checklists.filter(c => c.date >= startDate);

          let totalTrades = 0, totalPnl = 0, wins = 0;
          for (const checklist of periodChecklists) {
            const trades = checklist.data.trades || [];
            totalTrades += trades.length;
            for (const trade of trades) {
              if (trade.pnl !== undefined) {
                totalPnl += trade.pnl;
                if (trade.pnl > 0) wins++;
              }
            }
          }

          const winRate = totalTrades > 0 ? wins / totalTrades : 0;
          const goals: any = {};

          if (this.config?.monthlyPnlTarget && period === "monthly") {
            goals.pnlTarget = {
              target: this.config.monthlyPnlTarget,
              current: Math.round(totalPnl * 100) / 100,
              progress: Math.round((totalPnl / this.config.monthlyPnlTarget) * 100),
              status: totalPnl >= this.config.monthlyPnlTarget ? "✅ Achieved" : "🔄 In Progress",
            };
          }

          if (this.config?.winRateTarget) {
            goals.winRate = {
              target: `${(this.config.winRateTarget * 100).toFixed(0)}%`,
              current: `${(winRate * 100).toFixed(0)}%`,
              status: winRate >= this.config.winRateTarget ? "✅ On Target" : "⚠️ Below Target",
            };
          }

          if (this.config?.maxTradesPerDay && period === "daily") {
            const todayTrades = this.todayChecklist?.data.trades?.length || 0;
            goals.tradeLimit = {
              limit: this.config.maxTradesPerDay,
              taken: todayTrades,
              remaining: this.config.maxTradesPerDay - todayTrades,
              status: todayTrades >= this.config.maxTradesPerDay ? "🛑 Limit Reached" : "✅ Within Limit",
            };
          }

          return {
            result: JSON.stringify({
              period,
              startDate,
              stats: {
                tradingDays: periodChecklists.length,
                totalTrades,
                totalPnl: Math.round(totalPnl * 100) / 100,
                winRate: `${(winRate * 100).toFixed(0)}%`,
              },
              goals,
            }),
          };
        }

        case "analyze_trading_performance": {
          const endDate = args.endDate || new Date().toISOString().split("T")[0];
          const startDate = args.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const groupBy = args.groupBy || "day";

          const checklists = await storage.getDailyTradingChecklists({});
          const periodChecklists = checklists.filter(c => c.date >= startDate && c.date <= endDate);

          let totalTrades = 0, wins = 0, losses = 0, totalPnl = 0;
          let largestWin = 0, largestLoss = 0;
          let totalR = 0, rCount = 0;
          const pnlByDay: Record<string, number> = {};
          const tradesBySetup: Record<string, { count: number; pnl: number; wins: number }> = {};
          const tradesBySession: Record<string, { count: number; pnl: number; wins: number }> = {};

          for (const checklist of periodChecklists) {
            const trades = checklist.data.trades || [];
            pnlByDay[checklist.date] = 0;

            for (const trade of trades) {
              totalTrades++;
              const pnl = trade.pnl || 0;
              totalPnl += pnl;
              pnlByDay[checklist.date] += pnl;

              if (pnl > 0) {
                wins++;
                if (pnl > largestWin) largestWin = pnl;
              } else if (pnl < 0) {
                losses++;
                if (pnl < largestLoss) largestLoss = pnl;
              }

              // Track by setup
              const setup = (trade as any).setup || "Unknown";
              if (!tradesBySetup[setup]) tradesBySetup[setup] = { count: 0, pnl: 0, wins: 0 };
              tradesBySetup[setup].count++;
              tradesBySetup[setup].pnl += pnl;
              if (pnl > 0) tradesBySetup[setup].wins++;

              // Track by session
              const session = (trade as any).session || "Unknown";
              if (!tradesBySession[session]) tradesBySession[session] = { count: 0, pnl: 0, wins: 0 };
              tradesBySession[session].count++;
              tradesBySession[session].pnl += pnl;
              if (pnl > 0) tradesBySession[session].wins++;

              // R-multiple tracking
              if ((trade as any).rMultiple !== undefined) {
                totalR += (trade as any).rMultiple;
                rCount++;
              }
            }
          }

          const winningDays = Object.values(pnlByDay).filter(p => p > 0).length;
          const losingDays = Object.values(pnlByDay).filter(p => p < 0).length;
          const profitFactor = losses > 0 && largestLoss !== 0
            ? Math.abs(wins > 0 ? largestWin * wins : 0) / Math.abs(largestLoss * losses)
            : 0;

          return {
            result: JSON.stringify({
              period: { startDate, endDate },
              tradingDays: periodChecklists.length,
              metrics: {
                totalTrades,
                wins,
                losses,
                winRate: totalTrades > 0 ? `${Math.round((wins / totalTrades) * 100)}%` : "N/A",
                totalPnl: Math.round(totalPnl * 100) / 100,
                averagePnl: totalTrades > 0 ? Math.round((totalPnl / totalTrades) * 100) / 100 : 0,
                averageR: rCount > 0 ? Math.round((totalR / rCount) * 100) / 100 : "N/A",
                largestWin: Math.round(largestWin * 100) / 100,
                largestLoss: Math.round(largestLoss * 100) / 100,
                winningDays,
                losingDays,
                profitFactor: Math.round(profitFactor * 100) / 100,
              },
              bySetup: Object.entries(tradesBySetup).map(([setup, data]) => ({
                setup,
                trades: data.count,
                totalPnl: Math.round(data.pnl * 100) / 100,
                winRate: data.count > 0 ? `${Math.round((data.wins / data.count) * 100)}%` : "N/A",
              })).sort((a, b) => b.totalPnl - a.totalPnl),
              bySession: Object.entries(tradesBySession).map(([session, data]) => ({
                session,
                trades: data.count,
                totalPnl: Math.round(data.pnl * 100) / 100,
                winRate: data.count > 0 ? `${Math.round((data.wins / data.count) * 100)}%` : "N/A",
              })),
              insights: this.generatePerformanceInsights(totalTrades, wins, totalPnl, tradesBySetup),
            }),
          };
        }

        // ========== STRATEGY & CHECKLISTS ==========
        case "get_trading_strategies": {
          const activeOnly = args.activeOnly !== false;
          const strategies = await storage.getTradingStrategies({ isActive: activeOnly ? true : undefined });

          return {
            result: JSON.stringify(strategies.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description,
              isActive: s.isActive,
              isDefault: s.isDefault,
              sectionCount: s.config.sections?.length || 0,
            }))),
          };
        }

        case "get_strategy_details": {
          let strategy = null;
          if (args.strategyId) {
            strategy = await storage.getTradingStrategy(args.strategyId);
          } else if (args.strategyName) {
            const strategies = await storage.getTradingStrategies({ isActive: true });
            strategy = strategies.find(s =>
              s.name.toLowerCase().includes(args.strategyName.toLowerCase())
            );
          }

          if (!strategy) {
            return { result: "Strategy not found" };
          }

          return {
            result: JSON.stringify({
              id: strategy.id,
              name: strategy.name,
              description: strategy.description,
              isActive: strategy.isActive,
              isDefault: strategy.isDefault,
              sections: strategy.config.sections?.map(section => ({
                name: section.title,
                description: section.description,
                itemCount: section.items?.length || 0,
                items: section.items?.map(item => ({
                  id: item.id,
                  label: item.label,
                  type: item.type,
                  required: item.required,
                })),
              })),
            }),
          };
        }

        case "get_today_checklist": {
          const today = new Date().toISOString().split("T")[0];
          const checklists = await storage.getDailyTradingChecklists({ date: today });
          const checklist = checklists[0];

          if (!checklist) {
            return { result: JSON.stringify({ hasChecklist: false, message: "No checklist started for today. Start one to begin tracking!" }) };
          }

          return {
            result: JSON.stringify({
              hasChecklist: true,
              id: checklist.id,
              date: checklist.date,
              strategy: checklist.data.strategyName,
              instrument: checklist.data.instrument,
              completedItems: Object.keys(checklist.data.values || {}).length,
              trades: checklist.data.trades || [],
              endOfSessionReview: checklist.data.endOfSessionReview || null,
            }),
          };
        }

        case "get_recent_checklists": {
          const limit = args.limit || 7;
          const checklists = await storage.getDailyTradingChecklists({});
          const recent = checklists.slice(0, limit);

          return {
            result: JSON.stringify(recent.map(c => ({
              id: c.id,
              date: c.date,
              strategy: c.data.strategyName,
              instrument: c.data.instrument,
              tradesCount: c.data.trades?.length || 0,
              totalPnl: c.data.trades?.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0,
              hasReview: !!c.data.endOfSessionReview,
            }))),
          };
        }

        case "create_strategy": {
          const { name, description, isDefault, sections } = args;

          const config = {
            sections: sections.map((section: any, sectionIndex: number) => ({
              id: `section_${Date.now()}_${sectionIndex}`,
              name: section.name,
              items: section.items.map((item: any, itemIndex: number) => ({
                id: `item_${Date.now()}_${sectionIndex}_${itemIndex}`,
                label: item.label,
                type: item.type || "checkbox",
                required: item.required || false,
                options: item.options || [],
              })),
            })),
          };

          const strategy = await storage.createTradingStrategy({
            name,
            description: description || "",
            isActive: true,
            isDefault: isDefault || false,
            config,
          });

          this.strategies = await storage.getTradingStrategies({ isActive: true });

          return {
            result: JSON.stringify({
              success: true,
              strategy: {
                id: strategy.id,
                name: strategy.name,
                sections: config.sections.map((s: any) => ({ name: s.title, itemCount: s.items.length })),
              },
              message: `Trading strategy "${name}" created successfully!`,
            }),
            action: {
              action: "create_strategy",
              entityType: "trading_strategy",
              entityId: strategy.id,
              parameters: { name, sectionCount: sections.length },
              result: "success",
            },
          };
        }

        // ========== TRADE LOGGING & JOURNALING ==========
        case "log_trade": {
          const today = new Date().toISOString().split("T")[0];
          let checklist = await storage.getDailyTradingChecklistByDate(today);
          const tradeSymbol = args.symbol || args.instrument || "UNKNOWN";

          if (!checklist) {
            const defaultStrategy = await storage.getDefaultTradingStrategy();
            if (!defaultStrategy) {
              return { result: "No trading checklist for today and no default strategy. Please start a checklist first." };
            }

            const day = await storage.getDayOrCreate(today);
            checklist = await storage.createDailyTradingChecklist({
              dayId: day.id,
              date: today as unknown as Date,
              strategyId: defaultStrategy.id,
              data: {
                strategyId: defaultStrategy.id,
                strategyName: defaultStrategy.name,
                instrument: tradeSymbol,
                values: {},
                trades: [],
              },
            });
          }

          // Check trade limits
          const existingTrades = checklist.data.trades || [];
          if (this.config?.maxTradesPerDay && existingTrades.length >= this.config.maxTradesPerDay) {
            return {
              result: `⚠️ Trade NOT logged. Daily trade limit reached (${this.config.maxTradesPerDay} trades). Paul Tudor Jones says: "The most important rule is to play great defense."`,
            };
          }

          const trade = {
            id: `trade_${Date.now()}`,
            time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
            symbol: tradeSymbol,
            direction: args.direction,
            entryPrice: args.entryPrice?.toString() || "",
            exitPrice: args.exitPrice?.toString() || "",
            stopLoss: args.stopLoss?.toString() || "",
            takeProfit: args.takeProfit?.toString(),
            lotSize: args.lotSize,
            openDate: args.openDate || today,
            closeDate: args.closeDate,
            result: args.pnl !== undefined ? (args.pnl > 0 ? "win" : args.pnl < 0 ? "loss" : "breakeven") : "pending",
            pnl: args.pnl,
            rMultiple: args.rMultiple,
            setup: args.setup,
            session: args.session,
            followedPlan: args.followedPlan,
            emotionalState: args.emotionalState,
            notes: args.notes,
            lessonsLearned: args.lessonsLearned,
          };

          await storage.updateDailyTradingChecklist(checklist.id, {
            data: {
              ...checklist.data,
              trades: [...existingTrades, trade as any],
            },
          });

          const tradesRemaining = this.config?.maxTradesPerDay
            ? this.config.maxTradesPerDay - existingTrades.length - 1
            : null;

          return {
            result: `Trade logged: ${args.direction.toUpperCase()} ${tradeSymbol}${args.pnl !== undefined ? ` | P&L: ${args.pnl}` : ""}${args.rMultiple !== undefined ? ` | ${args.rMultiple}R` : ""}${tradesRemaining !== null ? ` | Trades remaining today: ${tradesRemaining}` : ""}`,
            action: {
              action: "log_trade",
              entityType: "trade",
              entityId: trade.id,
              parameters: args,
              result: "success",
            },
          };
        }

        case "add_journal_session": {
          const today = new Date().toISOString().split("T")[0];
          const day = await storage.getDayOrCreate(today);

          const session = {
            id: `session_${Date.now()}`,
            timestamp: new Date().toISOString(),
            sessionName: args.sessionName,
            pnl: args.pnl,
            tradesCount: args.tradesCount,
            notes: args.notes,
            lessons: args.lessons,
            emotionalState: args.emotionalState,
            energyLevel: args.energyLevel,
            followedPlan: args.followedPlan,
            whatWorked: args.whatWorked,
            whatToImprove: args.whatToImprove,
          };

          const existingJournal = (day.tradingJournal as any) || { sessions: [] };
          const sessions = existingJournal.sessions || [];

          await storage.updateDay(day.id, {
            tradingJournal: {
              ...existingJournal,
              sessions: [...sessions, session],
            } as any,
          });

          return {
            result: `Journal session added: ${args.sessionName}${args.pnl !== undefined ? ` (P&L: ${args.pnl})` : ""}. ${args.lessons ? `Key lesson: "${args.lessons}"` : ""}`,
            action: {
              action: "add_journal_session",
              entityType: "journal_session",
              entityId: session.id,
              parameters: args,
              result: "success",
            },
          };
        }

        case "get_trading_journal": {
          const endDate = args.endDate || new Date().toISOString().split("T")[0];
          const startDate = args.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const days = await storage.getDays({ dateGte: startDate, dateLte: endDate });
          const journalEntries = days
            .filter(d => d.tradingJournal && (d.tradingJournal as any).sessions?.length > 0)
            .map(d => ({
              date: d.date,
              sessions: (d.tradingJournal as any).sessions,
            }));

          return {
            result: JSON.stringify(journalEntries),
          };
        }

        // ========== POSITION SIZING ==========
        case "calculate_position_size": {
          const { instrument, entryPrice, stopLossPrice } = args;
          const accountBalance = args.accountBalance || this.config?.accountBalance;
          const riskPercent = args.riskPercent || this.config?.riskPerTradePercent;

          if (!accountBalance) {
            return { result: "Account balance not configured. Set it in Trading Agent Config or provide it in the request." };
          }
          if (!riskPercent) {
            return { result: "Risk percentage not configured. Set it in Trading Agent Config or provide it in the request." };
          }

          const riskAmount = (accountBalance * riskPercent) / 100;
          const stopLossDistance = Math.abs(entryPrice - stopLossPrice);

          // Calculate pip value based on instrument (simplified)
          let pipValue = 10; // Default for most forex pairs (1 lot = $10/pip)
          if (instrument.includes("JPY")) {
            pipValue = 1000 / entryPrice; // Approximate for JPY pairs
          } else if (instrument.includes("XAU") || instrument.includes("GOLD")) {
            pipValue = 1; // Gold: $1 per 0.01 move per 0.01 lot
          }

          const stopLossPips = instrument.includes("JPY")
            ? stopLossDistance * 100
            : stopLossDistance * 10000;

          const positionSize = riskAmount / (stopLossPips * pipValue);
          const roundedLots = Math.floor(positionSize * 100) / 100;

          return {
            result: JSON.stringify({
              calculation: {
                accountBalance,
                riskPercent: `${riskPercent}%`,
                riskAmount: `$${riskAmount.toFixed(2)}`,
                stopLossDistance: stopLossDistance.toFixed(5),
                stopLossPips: stopLossPips.toFixed(1),
              },
              recommendation: {
                positionSize: `${roundedLots.toFixed(2)} lots`,
                maxRisk: `$${riskAmount.toFixed(2)}`,
              },
              reminder: "PTJ: 'Where you want to be is always in control, never wishing, always trading, and always first and foremost protecting your butt.'",
            }),
          };
        }

        // ========== PRE-TRADE ANALYSIS ==========
        case "evaluate_setup": {
          const { instrument, direction, setup, timeframe, entryPrice, stopLoss, takeProfit, currentMood, energyLevel, notes } = args;

          // Check setup against defined setups
          const definedSetups = this.config?.setupTypes || [];
          const matchingSetup = definedSetups.find(s =>
            s.name.toLowerCase() === setup.toLowerCase()
          );

          // Check no-trade rules
          const noTradeRules = this.config?.noTradeRules || [];
          const violatedRules: string[] = [];

          if (energyLevel && energyLevel < 5) {
            violatedRules.push("Low energy level - consider not trading");
          }
          if (currentMood && ["stressed", "anxious", "frustrated", "angry", "fearful"].includes(currentMood.toLowerCase())) {
            violatedRules.push(`Emotional state (${currentMood}) may impair decision-making`);
          }

          // Check pre-trade checklist
          const preTradeChecklist = this.config?.preTradeChecklist || [];

          // Calculate R:R if prices provided
          let rrRatio = null;
          if (entryPrice && stopLoss && takeProfit) {
            const risk = Math.abs(entryPrice - stopLoss);
            const reward = Math.abs(takeProfit - entryPrice);
            rrRatio = reward / risk;
          }

          // Account status check
          const todayTrades = this.todayChecklist?.data.trades?.length || 0;
          const atTradeLimit = this.config?.maxTradesPerDay && todayTrades >= this.config.maxTradesPerDay;

          return {
            result: JSON.stringify({
              setup: {
                instrument,
                direction,
                type: setup,
                timeframe,
                isDefinedSetup: !!matchingSetup,
                setupDetails: matchingSetup || null,
              },
              riskReward: rrRatio ? {
                ratio: `${rrRatio.toFixed(2)}:1`,
                meetsTarget: this.config?.averageRRTarget ? rrRatio >= this.config.averageRRTarget : null,
              } : null,
              psychologyCheck: {
                currentMood,
                energyLevel,
                violatedRules,
                passesCheck: violatedRules.length === 0,
              },
              accountCheck: {
                tradesToday: todayTrades,
                atTradeLimit,
                canTrade: !atTradeLimit,
              },
              preTradeChecklist: preTradeChecklist.length > 0 ? preTradeChecklist : [
                "Is this a valid setup from my playbook?",
                "Does the R:R meet my minimum criteria?",
                "Am I in the right mental state?",
                "Have I defined my exit before entry?",
                "Am I trading what I see, not what I think?",
              ],
              recommendation: atTradeLimit
                ? "🛑 STOP: Daily trade limit reached. No trade is a valid trade."
                : violatedRules.length > 0
                  ? `⚠️ CAUTION: ${violatedRules.length} concern(s) identified. Review before proceeding.`
                  : matchingSetup
                    ? "✅ Setup matches your playbook. Proceed with discipline."
                    : "⚠️ Setup not in your defined playbook. Consider if this is worth trading.",
              wisdom: "Mark Douglas: 'Define your risk before you enter a trade and accept it completely.'",
            }),
          };
        }

        case "get_setup_types": {
          const setupTypes = this.config?.setupTypes || [];

          if (setupTypes.length === 0) {
            return {
              result: JSON.stringify({
                configured: false,
                message: "No setup types configured. Define your valid setups in Trading Agent Config to improve trade evaluation.",
                suggestion: "Good setups to define: FVG, Order Block, Breaker, BOS, ChoCH, etc.",
              }),
            };
          }

          return {
            result: JSON.stringify({
              configured: true,
              setups: setupTypes.map(s => ({
                name: s.name,
                description: s.description,
                rules: s.rules,
                invalidation: s.invalidation,
                targetRR: `${s.targetRR}:1`,
                historicalWinRate: s.winRate ? `${(s.winRate * 100).toFixed(0)}%` : "Not tracked",
              })),
              reminder: "Chris Vermeulen: 'Trade what you see, not what you think.'",
            }),
          };
        }

        // ========== TASK MANAGEMENT ==========
        case "create_task": {
          const { title, notes, priority, dueDate, type } = args;

          // Create task in trading venture if exists
          const task = await storage.createTask({
            title,
            notes: notes || "",
            priority: priority || "P2",
            status: "todo",
            type: type || "learning",
            ventureId: this.tradingVentureId || undefined,
            dueDate: dueDate || null,
            domain: "work",
          });

          return {
            result: `Trading task created: "${title}"${dueDate ? ` (due: ${dueDate})` : ""}`,
            action: {
              action: "create_task",
              entityType: "task",
              entityId: task.id.toString(),
              parameters: args,
              result: "success",
            },
          };
        }

        case "list_tasks": {
          const { status, limit } = args;
          const filters: any = {};

          if (this.tradingVentureId) {
            filters.ventureId = this.tradingVentureId;
          }
          if (status) {
            filters.status = status;
          }

          const tasks = await storage.getTasks(filters);
          const tradingTasks = tasks.slice(0, limit || 10);

          return {
            result: JSON.stringify(tradingTasks.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate,
              type: t.type,
            }))),
          };
        }

        case "update_task_status": {
          const { taskId, status } = args;

          await storage.updateTask(taskId, { status });

          return {
            result: `Task status updated to: ${status}`,
            action: {
              action: "update_task_status",
              entityType: "task",
              entityId: taskId,
              parameters: args,
              result: "success",
            },
          };
        }

        // ========== CAPTURE & INBOX ==========
        case "create_capture": {
          const { title, type, notes } = args;

          const capture = await storage.createCapture({
            title,
            type: type || "idea",
            notes: notes || "",
            source: "brain",
            domain: "work",
            ventureId: this.tradingVentureId || undefined,
            clarified: false,
          });

          return {
            result: `Captured: "${title}" - Process this later in your inbox.`,
            action: {
              action: "create_capture",
              entityType: "capture",
              entityId: capture.id.toString(),
              parameters: args,
              result: "success",
            },
          };
        }

        case "list_captures": {
          const { limit } = args;
          const captures = await storage.getCaptures({ clarified: false });

          // Filter to trading-related captures
          const tradingCaptures = this.tradingVentureId
            ? captures.filter(c => c.ventureId === this.tradingVentureId)
            : captures;

          return {
            result: JSON.stringify(tradingCaptures.slice(0, limit || 10).map(c => ({
              id: c.id,
              title: c.title,
              type: c.type,
              notes: c.notes,
              createdAt: c.createdAt,
            }))),
          };
        }

        // ========== HEALTH CORRELATION ==========
        case "get_health_trading_correlation": {
          const days = args.days || 30;
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const [healthEntries, checklists] = await Promise.all([
            storage.getHealthEntries({ dateGte: startDate }),
            storage.getDailyTradingChecklists({}),
          ]);

          const periodChecklists = checklists.filter(c => c.date >= startDate);

          // Build correlation data
          const correlationData: Array<{
            date: string;
            sleepHours: number | null;
            energyLevel: number | null;
            mood: string | null;
            pnl: number;
            trades: number;
            winRate: number;
          }> = [];

          for (const checklist of periodChecklists) {
            const healthEntry = healthEntries.find(h => h.date === checklist.date);
            const trades = checklist.data.trades || [];
            const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
            const wins = trades.filter(t => (t.pnl || 0) > 0).length;

            correlationData.push({
              date: checklist.date,
              sleepHours: healthEntry?.sleepHours || null,
              energyLevel: healthEntry?.energyLevel || null,
              mood: healthEntry?.mood || null,
              pnl,
              trades: trades.length,
              winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0,
            });
          }

          // Calculate correlations
          const goodSleepDays = correlationData.filter(d => d.sleepHours && d.sleepHours >= 7);
          const badSleepDays = correlationData.filter(d => d.sleepHours && d.sleepHours < 6);
          const highEnergyDays = correlationData.filter(d => d.energyLevel && d.energyLevel >= 4);
          const lowEnergyDays = correlationData.filter(d => d.energyLevel && d.energyLevel <= 2);

          const avgPnlGoodSleep = goodSleepDays.length > 0
            ? goodSleepDays.reduce((sum, d) => sum + d.pnl, 0) / goodSleepDays.length : 0;
          const avgPnlBadSleep = badSleepDays.length > 0
            ? badSleepDays.reduce((sum, d) => sum + d.pnl, 0) / badSleepDays.length : 0;
          const avgPnlHighEnergy = highEnergyDays.length > 0
            ? highEnergyDays.reduce((sum, d) => sum + d.pnl, 0) / highEnergyDays.length : 0;
          const avgPnlLowEnergy = lowEnergyDays.length > 0
            ? lowEnergyDays.reduce((sum, d) => sum + d.pnl, 0) / lowEnergyDays.length : 0;

          return {
            result: JSON.stringify({
              period: `Last ${days} days`,
              dataPoints: correlationData.length,
              insights: {
                sleepCorrelation: {
                  goodSleepDays: goodSleepDays.length,
                  avgPnlGoodSleep: Math.round(avgPnlGoodSleep * 100) / 100,
                  badSleepDays: badSleepDays.length,
                  avgPnlBadSleep: Math.round(avgPnlBadSleep * 100) / 100,
                  impact: avgPnlGoodSleep > avgPnlBadSleep
                    ? `Good sleep correlates with +$${Math.round(avgPnlGoodSleep - avgPnlBadSleep)} better performance`
                    : "Insufficient data for sleep correlation",
                },
                energyCorrelation: {
                  highEnergyDays: highEnergyDays.length,
                  avgPnlHighEnergy: Math.round(avgPnlHighEnergy * 100) / 100,
                  lowEnergyDays: lowEnergyDays.length,
                  avgPnlLowEnergy: Math.round(avgPnlLowEnergy * 100) / 100,
                  impact: avgPnlHighEnergy > avgPnlLowEnergy
                    ? `High energy correlates with +$${Math.round(avgPnlHighEnergy - avgPnlLowEnergy)} better performance`
                    : "Insufficient data for energy correlation",
                },
              },
              recommendation: "Brett Steenbarger: 'Fatigue, stress, and distraction are trading enemies. Manage your energy.'",
              detailedData: correlationData.slice(0, 10),
            }),
          };
        }

        // ========== REVIEW GENERATORS ==========
        case "generate_weekly_review": {
          const today = new Date();
          let weekStart: Date;

          if (args.weekStartDate) {
            weekStart = new Date(args.weekStartDate);
          } else {
            weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
            weekStart.setDate(weekStart.getDate() - 7); // Last week
          }

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          const startDate = weekStart.toISOString().split("T")[0];
          const endDate = weekEnd.toISOString().split("T")[0];

          const checklists = await storage.getDailyTradingChecklists({});
          const weekChecklists = checklists.filter(c => c.date >= startDate && c.date <= endDate);

          let totalTrades = 0, wins = 0, totalPnl = 0;
          const tradesByDay: Record<string, number> = {};
          const lessonsList: string[] = [];

          for (const checklist of weekChecklists) {
            const trades = checklist.data.trades || [];
            tradesByDay[checklist.date] = trades.length;
            totalTrades += trades.length;

            for (const trade of trades) {
              if (trade.pnl !== undefined) {
                totalPnl += trade.pnl;
                if (trade.pnl > 0) wins++;
              }
              if ((trade as any).lessonsLearned) {
                lessonsList.push((trade as any).lessonsLearned);
              }
            }

            if ((checklist.data.endOfSessionReview as any)?.lessons) {
              lessonsList.push((checklist.data.endOfSessionReview as any).lessons);
            }
          }

          const tradingDays = weekChecklists.length;
          const avgTradesPerDay = tradingDays > 0 ? totalTrades / tradingDays : 0;
          const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

          // Check against goals
          const meetsWinRateTarget = this.config?.winRateTarget
            ? winRate >= this.config.winRateTarget * 100
            : null;

          return {
            result: JSON.stringify({
              period: { start: startDate, end: endDate },
              summary: {
                tradingDays,
                totalTrades,
                avgTradesPerDay: Math.round(avgTradesPerDay * 10) / 10,
                wins,
                losses: totalTrades - wins,
                winRate: `${Math.round(winRate)}%`,
                totalPnl: Math.round(totalPnl * 100) / 100,
                meetsWinRateTarget,
              },
              dailyBreakdown: tradesByDay,
              lessonsLearned: lessonsList.length > 0 ? lessonsList : ["No lessons recorded this week"],
              reviewQuestions: this.config?.reviewQuestions?.weekly || [
                "What worked well this week?",
                "What patterns led to losses?",
                "Did I follow my trading plan?",
                "What will I do differently next week?",
                "What's my key focus for next week?",
              ],
              dalioReminder: "Ray Dalio: 'Pain + Reflection = Progress'",
            }),
          };
        }

        case "generate_monthly_review": {
          const today = new Date();
          const month = args.month || today.getMonth() + 1;
          const year = args.year || today.getFullYear();

          const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
          const endDate = new Date(year, month, 0).toISOString().split("T")[0];

          const checklists = await storage.getDailyTradingChecklists({});
          const monthChecklists = checklists.filter(c => c.date >= startDate && c.date <= endDate);

          let totalTrades = 0, wins = 0, totalPnl = 0;
          let largestWin = 0, largestLoss = 0;
          const tradesBySetup: Record<string, { count: number; pnl: number; wins: number }> = {};
          const tradesByWeek: Record<string, { trades: number; pnl: number }> = {};

          for (const checklist of monthChecklists) {
            const trades = checklist.data.trades || [];
            const weekNum = Math.ceil(new Date(checklist.date).getDate() / 7);
            const weekKey = `Week ${weekNum}`;

            if (!tradesByWeek[weekKey]) tradesByWeek[weekKey] = { trades: 0, pnl: 0 };
            tradesByWeek[weekKey].trades += trades.length;

            totalTrades += trades.length;

            for (const trade of trades) {
              const pnl = trade.pnl || 0;
              totalPnl += pnl;
              tradesByWeek[weekKey].pnl += pnl;

              if (pnl > 0) {
                wins++;
                if (pnl > largestWin) largestWin = pnl;
              } else if (pnl < largestLoss) {
                largestLoss = pnl;
              }

              const setup = (trade as any).setup || "Unknown";
              if (!tradesBySetup[setup]) tradesBySetup[setup] = { count: 0, pnl: 0, wins: 0 };
              tradesBySetup[setup].count++;
              tradesBySetup[setup].pnl += pnl;
              if (pnl > 0) tradesBySetup[setup].wins++;
            }
          }

          const tradingDays = monthChecklists.length;
          const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

          // Goal progress
          const goalProgress: any = {};
          if (this.config?.monthlyPnlTarget) {
            goalProgress.pnlTarget = {
              target: this.config.monthlyPnlTarget,
              actual: Math.round(totalPnl * 100) / 100,
              achieved: totalPnl >= this.config.monthlyPnlTarget,
              percentOfTarget: Math.round((totalPnl / this.config.monthlyPnlTarget) * 100),
            };
          }
          if (this.config?.winRateTarget) {
            goalProgress.winRateTarget = {
              target: `${(this.config.winRateTarget * 100).toFixed(0)}%`,
              actual: `${Math.round(winRate)}%`,
              achieved: winRate / 100 >= this.config.winRateTarget,
            };
          }

          // Best and worst setups
          const setupRankings = Object.entries(tradesBySetup)
            .map(([setup, data]) => ({
              setup,
              trades: data.count,
              pnl: Math.round(data.pnl * 100) / 100,
              winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
            }))
            .sort((a, b) => b.pnl - a.pnl);

          return {
            result: JSON.stringify({
              period: { month, year, start: startDate, end: endDate },
              summary: {
                tradingDays,
                totalTrades,
                avgTradesPerDay: tradingDays > 0 ? Math.round((totalTrades / tradingDays) * 10) / 10 : 0,
                wins,
                losses: totalTrades - wins,
                winRate: `${Math.round(winRate)}%`,
                totalPnl: Math.round(totalPnl * 100) / 100,
                largestWin: Math.round(largestWin * 100) / 100,
                largestLoss: Math.round(largestLoss * 100) / 100,
              },
              goalProgress,
              weeklyBreakdown: tradesByWeek,
              setupPerformance: {
                best: setupRankings[0] || null,
                worst: setupRankings[setupRankings.length - 1] || null,
                all: setupRankings,
              },
              reviewQuestions: this.config?.reviewQuestions?.monthly || [
                "What was my biggest win this month (trade and lesson)?",
                "What was my biggest mistake and what did I learn?",
                "Which setups performed best/worst?",
                "Did I achieve my monthly goals? Why or why not?",
                "What habits served me well?",
                "What habits need to change?",
                "What's my #1 focus for next month?",
              ],
              dalioReminder: "Ray Dalio: 'Write down your principles and follow them systematically.'",
            }),
          };
        }

        // ========== KNOWLEDGE & RESEARCH ==========
        case "get_trading_docs": {
          const docs = await storage.getDocs({ domain: "trading" });
          let filtered = docs;

          if (args.query) {
            const query = args.query.toLowerCase();
            filtered = docs.filter(d =>
              d.title.toLowerCase().includes(query) ||
              d.body?.toLowerCase().includes(query) ||
              (Array.isArray(d.tags) ? d.tags.join(' ').toLowerCase() : (d.tags as string)?.toLowerCase())?.includes(query)
            );
          }

          return {
            result: JSON.stringify(filtered.slice(0, 10).map(d => ({
              id: d.id,
              title: d.title,
              type: d.type,
              excerpt: d.body?.slice(0, 200) || "",
            }))),
          };
        }

        case "web_search": {
          const searchQuery = args.query;
          const searchType = args.type || "general";

          const configuredResearchModel = this.config?.researchModel;
          const webSearchModels = configuredResearchModel
            ? [configuredResearchModel, "perplexity/sonar-pro", "perplexity/sonar"]
            : ["perplexity/sonar-pro", "perplexity/sonar", "perplexity/sonar-reasoning"];

          let searchResult: string | null = null;
          let lastError: any = null;

          for (const model of webSearchModels) {
            try {
              logger.info({ model, query: searchQuery }, "Attempting web search");

              const searchResponse = await openai.chat.completions.create({
                model,
                messages: [
                  {
                    role: "system",
                    content: `You are a trading research assistant. Search for current, real-time information about: ${searchType === "news" ? "market news and events" : searchType === "price" ? "current prices and market data" : searchType === "economic" ? "economic calendar and data releases" : "trading and market information"}. Provide factual, up-to-date information with sources when available.`,
                  },
                  { role: "user", content: searchQuery },
                ],
                max_tokens: 1000,
              });

              searchResult = searchResponse.choices[0]?.message?.content || "No results found";
              break;
            } catch (modelError: any) {
              logger.warn({ model, error: modelError.message }, "Web search model failed");
              lastError = modelError;
              continue;
            }
          }

          if (searchResult) {
            return {
              result: JSON.stringify({
                query: searchQuery,
                type: searchType,
                results: searchResult,
                timestamp: new Date().toISOString(),
              }),
              action: {
                action: "web_search",
                parameters: { query: searchQuery, type: searchType },
                result: "success",
              },
            };
          } else {
            return {
              result: `Web search unavailable. Error: ${lastError?.message || "Unknown error"}`,
              action: {
                action: "web_search",
                parameters: args,
                result: "failed",
                errorMessage: lastError?.message,
              },
            };
          }
        }

        // ========== PSYCHOLOGY & LESSONS ==========
        case "add_key_lesson": {
          const { lesson, source } = args;

          if (!this.config) {
            return { result: "Trading agent config not initialized. Cannot save lesson." };
          }

          const existingLessons = this.config.keyLessons || [];
          const newLesson = {
            lesson,
            source,
            dateAdded: new Date().toISOString().split("T")[0],
          };

          await storage.upsertTradingAgentConfig(this.userId, {
            keyLessons: [...existingLessons, newLesson],
          });

          return {
            result: `Lesson recorded: "${lesson}" (from: ${source}). Ray Dalio: "Pain + Reflection = Progress."`,
            action: {
              action: "add_key_lesson",
              entityType: "lesson",
              parameters: args,
              result: "success",
            },
          };
        }

        case "get_psychology_check": {
          const { currentMood, energyLevel, sleepHours, recentLosses } = args;

          const issues: string[] = [];
          const noTradeRules = this.config?.noTradeRules || [];
          const preTradeChecklist = this.config?.preTradeChecklist || [];
          const emotionalTriggers = this.config?.emotionalTriggers || [];
          const recoveryStrategies = this.config?.recoveryStrategies || [];

          // Check conditions
          if (sleepHours && sleepHours < 6) {
            issues.push(`🛑 LOW SLEEP: ${sleepHours} hours. Trading performance is impaired.`);
          }
          if (energyLevel && energyLevel < 4) {
            issues.push(`⚠️ LOW ENERGY: Level ${energyLevel}/10. Consider if trading is wise today.`);
          }
          if (currentMood && emotionalTriggers.some(t => currentMood.toLowerCase().includes(t.toLowerCase()))) {
            issues.push(`⚠️ EMOTIONAL TRIGGER DETECTED: "${currentMood}" matches your known triggers.`);
          }
          if (recentLosses && this.config?.maxConsecutiveLosses && recentLosses >= this.config.maxConsecutiveLosses) {
            issues.push(`🛑 CONSECUTIVE LOSSES: ${recentLosses} losses. Your rule says stop at ${this.config.maxConsecutiveLosses}.`);
          }

          const canTrade = issues.filter(i => i.startsWith("🛑")).length === 0;
          const hasWarnings = issues.filter(i => i.startsWith("⚠️")).length > 0;

          return {
            result: JSON.stringify({
              status: !canTrade ? "STOP" : hasWarnings ? "CAUTION" : "CLEAR",
              canTrade,
              issues,
              noTradeRules: noTradeRules.length > 0 ? noTradeRules : ["No custom no-trade rules defined"],
              preTradeChecklist: preTradeChecklist.length > 0 ? preTradeChecklist : [
                "Am I well-rested?",
                "Am I emotionally centered?",
                "Have I done my pre-market analysis?",
                "Do I have a clear plan for today?",
                "Am I trading to trade, or do I have valid setups?",
              ],
              recoveryStrategies: !canTrade || hasWarnings ? (recoveryStrategies.length > 0 ? recoveryStrategies : [
                "Take a break from the screens",
                "Go for a walk",
                "Review your trading plan",
                "Journal your feelings",
                "Remember: No trade is a valid trade",
              ]) : [],
              wisdom: {
                douglas: "Mark Douglas: 'The consistency you seek is in your mind, not in the markets.'",
                steenbarger: "Brett Steenbarger: 'Trade your equity curve. If you're in drawdown, reduce size.'",
              },
            }),
          };
        }

        default:
          return { result: `Unknown tool: ${toolName}` };
      }
    } catch (error: any) {
      logger.error({ toolName, args, error }, "Trading tool execution failed");
      return {
        result: `Error executing ${toolName}: ${error.message}`,
        action: {
          action: toolName,
          parameters: args,
          result: "failed",
          errorMessage: error.message,
        },
      };
    }
  }

  /**
   * Generate performance insights based on data
   */
  private generatePerformanceInsights(
    totalTrades: number,
    wins: number,
    totalPnl: number,
    tradesBySetup: Record<string, { count: number; pnl: number; wins: number }>
  ): string[] {
    const insights: string[] = [];
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    if (winRate >= 60) {
      insights.push("✅ Strong win rate. Focus on maintaining consistency.");
    } else if (winRate >= 50) {
      insights.push("📊 Win rate is acceptable. Look for ways to improve entry quality.");
    } else if (winRate < 40 && totalTrades >= 10) {
      insights.push("⚠️ Win rate below 40%. Review your setup selection criteria.");
    }

    // Best and worst setups
    const setupEntries = Object.entries(tradesBySetup);
    if (setupEntries.length > 1) {
      const sorted = setupEntries.sort((a, b) => b[1].pnl - a[1].pnl);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];

      if (best[1].pnl > 0) {
        insights.push(`🏆 Best setup: ${best[0]} (+$${best[1].pnl.toFixed(2)})`);
      }
      if (worst[1].pnl < 0) {
        insights.push(`📉 Weakest setup: ${worst[0]} ($${worst[1].pnl.toFixed(2)}). Consider removing or refining.`);
      }
    }

    if (totalPnl < 0 && totalTrades >= 5) {
      insights.push("💡 In drawdown. Brett Steenbarger advises: 'Trade your equity curve. Reduce size when in drawdown.'");
    }

    return insights;
  }

  /**
   * Process a user message and generate a response
   */
  async chat(userMessage: string, sessionId?: string): Promise<{
    response: string;
    actions: TradingAgentAction[];
    tokensUsed?: number;
    model?: string;
  }> {
    if (!this.strategies.length && !this.config) {
      await this.initialize();
    }

    const actions: TradingAgentAction[] = [];

    // Get conversation history for this session
    const history = await storage.getTradingConversations(this.userId, 10, sessionId);

    // Build messages for AI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: this.buildSystemPrompt() },
      ...history.reverse().map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    // Save user message
    await storage.createTradingConversation({
      userId: this.userId,
      sessionId: sessionId || null,
      role: "user",
      content: userMessage,
    });

    // Get tools
    const tools = this.getTools();

    // Multi-turn tool calling loop
    let conversationMessages = [...messages];
    let finalResponse = "";
    let tokensUsed = 0;
    let modelUsed = "";
    const maxTurns = 5;

    for (let turn = 0; turn < maxTurns; turn++) {
      const preferredModel = this.config?.preferredModel || this.userPreferredModel || undefined;
      const { response, metrics } = await modelManager.chatCompletion(
        { messages: conversationMessages, tools, temperature: 0.7 },
        "complex",
        preferredModel
      );

      tokensUsed += metrics.tokensUsed || 0;
      modelUsed = metrics.modelUsed;

      const choice = response.choices[0];
      if (!choice?.message) {
        throw new Error("No response from AI");
      }

      if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
        finalResponse = choice.message.content || "I'm here to help with your trading. How can I assist?";
        break;
      }

      conversationMessages.push(choice.message);

      const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type !== "function") continue;

        const args = JSON.parse(toolCall.function.arguments);
        const { result, action } = await this.executeTool(toolCall.function.name, args);

        if (action) {
          actions.push(action);
        }

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      conversationMessages.push(...toolResults);
    }

    // Save assistant response
    await storage.createTradingConversation({
      userId: this.userId,
      sessionId: sessionId || null,
      role: "assistant",
      content: finalResponse,
      metadata: {
        model: modelUsed,
        tokensUsed,
        actionsTaken: actions.map(a => a.action),
      } as any,
    });

    return {
      response: finalResponse,
      actions,
      tokensUsed,
      model: modelUsed,
    };
  }
}

/**
 * Factory function to create and initialize a trading agent
 */
export async function createTradingAgent(userId: string): Promise<TradingAgent> {
  const agent = new TradingAgent(userId);
  await agent.initialize();
  return agent;
}
