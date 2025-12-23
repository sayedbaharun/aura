import OpenAI from "openai";
import { storage } from "./storage";
import { logger } from "./logger";
import * as modelManager from "./model-manager";
import type { TradingStrategy, DailyTradingChecklist, Day, TradingAgentConfig, TradingKnowledgeDoc } from "@shared/schema";

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
 * Trading Agent - AI assistant specialized for trading analysis and journaling
 */
export class TradingAgent {
  private userId: string;
  private strategies: TradingStrategy[] = [];
  private todayChecklist: DailyTradingChecklist | null = null;
  private todayDay: Day | null = null;
  private config: TradingAgentConfig | null = null;
  private knowledgeDocs: TradingKnowledgeDoc[] = [];
  private userPreferredModel: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the agent with trading data
   */
  async initialize(): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];

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
      this.config = config;
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
   * Build the system prompt for the trading agent
   */
  private buildSystemPrompt(): string {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString("en-US", { hour12: false });

    // Determine active trading session
    const hour = new Date().getUTCHours();
    let activeSession = "No active session";
    if (hour >= 7 && hour < 16) activeSession = "London Session (7am-4pm UTC)";
    else if (hour >= 12 && hour < 21) activeSession = "New York Session (12pm-9pm UTC)";
    else if (hour >= 23 || hour < 8) activeSession = "Asian Session (11pm-8am UTC)";

    const strategyContext = this.strategies.length > 0
      ? `\nActive Strategies: ${this.strategies.map(s => s.name).join(", ")}`
      : "\nNo active trading strategies configured.";

    const checklistContext = this.todayChecklist
      ? `\nToday's Checklist: ${this.todayChecklist.data.strategyName} (${Object.keys(this.todayChecklist.data.values || {}).length} items completed)`
      : "\nNo trading checklist started for today.";

    const journalContext = this.todayDay?.tradingJournal
      ? `\nToday's Journal: ${(this.todayDay.tradingJournal as any)?.sessions?.length || 0} session(s) logged`
      : "\nNo trading journal entries for today.";

    // Build personalization section from config
    let personalization = "";
    if (this.config) {
      const parts: string[] = [];

      if (this.config.tradingStyle) {
        parts.push(`Trading Style: ${this.config.tradingStyle}`);
      }
      if (this.config.instruments) {
        parts.push(`Instruments: ${this.config.instruments}`);
      }
      if (this.config.timeframes) {
        parts.push(`Timeframes: ${this.config.timeframes}`);
      }
      if (this.config.tradingHours) {
        parts.push(`Trading Hours: ${this.config.tradingHours}`);
      }
      if (this.config.riskRules) {
        parts.push(`Risk Rules: ${this.config.riskRules}`);
      }
      if (this.config.focusAreas && this.config.focusAreas.length > 0) {
        parts.push(`Focus Areas: ${this.config.focusAreas.join(", ")}`);
      }

      if (parts.length > 0) {
        personalization = `\n\nTRADER PROFILE:\n${parts.map(p => `- ${p}`).join("\n")}`;
      }
    }

    // Build focus area emphasis
    let focusEmphasis = "";
    if (this.config?.focusAreas && this.config.focusAreas.length > 0) {
      focusEmphasis = `\n\nEMPHASIS AREAS (Pay special attention to these when helping the trader):
${this.config.focusAreas.map(area => `- ${area}`).join("\n")}`;
    }

    // Add custom system prompt if configured
    let customInstructions = "";
    if (this.config?.systemPrompt) {
      customInstructions = `\n\nCUSTOM INSTRUCTIONS FROM TRADER:\n${this.config.systemPrompt}`;
    }

    // Build knowledge base context from uploaded documents
    let knowledgeBaseContext = "";
    if (this.knowledgeDocs.length > 0) {
      const docsContent = this.knowledgeDocs
        .filter(doc => doc.extractedText || doc.summary || doc.description)
        .map(doc => {
          const content = doc.extractedText || doc.summary || doc.description || "";
          // Truncate very long content to avoid context overflow
          const truncatedContent = content.length > 2000 ? content.slice(0, 2000) + "..." : content;
          return `### ${doc.title} (${doc.category})\n${truncatedContent}`;
        })
        .join("\n\n");

      if (docsContent) {
        knowledgeBaseContext = `\n\nTRADER'S KNOWLEDGE BASE (Reference these when answering questions):
${docsContent}`;
      }
    }

    return `You are a professional trading assistant integrated into SB-OS - a personal operating system for a trader.

CURRENT CONTEXT:
- Date: ${today}
- Time: ${currentTime}
- Active Session: ${activeSession}
${strategyContext}
${checklistContext}
${journalContext}
${personalization}

YOUR CAPABILITIES:
1. **Performance Analysis**: Review trading history, calculate P&L, win rate, and identify patterns
2. **Strategy Management**: Help manage trading strategies, create new strategies, and manage checklists
3. **Trade Journaling**: Log trades (including multi-day positions with open/close dates), sessions, and lessons
4. **Pre-Trade Analysis**: Help evaluate setups against strategy criteria
5. **Post-Session Review**: Analyze trading sessions and extract lessons
6. **Psychology Support**: Help maintain trading discipline and emotional awareness
7. **Real-Time Research**: Search the internet for current market news, prices, economic data, and trading information
8. **Strategy Creation**: Create and save new trading strategies with custom checklist sections

IMPORTANT GUIDELINES:
- Always be objective and data-driven in analysis
- Emphasize risk management and position sizing
- Encourage journaling and reflection
- Never provide specific trade recommendations or financial advice
- Focus on process over outcomes
- Highlight both wins AND areas for improvement
- Remind about the importance of "no trade is a valid trade" when appropriate
${focusEmphasis}
${customInstructions}
${knowledgeBaseContext}

Current date/time: ${new Date().toISOString()}`;
  }

  /**
   * Get the tools available to this trading agent
   */
  private getTools(): OpenAI.Chat.ChatCompletionTool[] {
    return [
      {
        type: "function",
        function: {
          name: "get_trading_summary",
          description: "Get a summary of trading activity including strategies, recent checklists, and journal entries",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
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
          name: "get_trading_journal",
          description: "Get trading journal entries for a date range",
          parameters: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date (YYYY-MM-DD), defaults to 7 days ago" },
              endDate: { type: "string", description: "End date (YYYY-MM-DD), defaults to today" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "analyze_trading_performance",
          description: "Analyze trading performance metrics including P&L, win rate, average R, and patterns",
          parameters: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date for analysis (YYYY-MM-DD)" },
              endDate: { type: "string", description: "End date for analysis (YYYY-MM-DD)" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "log_trade",
          description: "Log a trade to today's checklist. Supports multi-day trades with open/close dates.",
          parameters: {
            type: "object",
            properties: {
              symbol: { type: "string", description: "Trading symbol (e.g., XAUUSD, EURUSD, BTCUSD)" },
              instrument: { type: "string", description: "Alias for symbol - trading instrument" },
              direction: { type: "string", enum: ["long", "short"], description: "Trade direction" },
              entryPrice: { type: "number", description: "Entry price" },
              exitPrice: { type: "number", description: "Exit price (optional if trade is open)" },
              stopLoss: { type: "number", description: "Stop loss price" },
              takeProfit: { type: "number", description: "Take profit price" },
              openDate: { type: "string", description: "Date trade was opened (YYYY-MM-DD), defaults to today" },
              closeDate: { type: "string", description: "Date trade was closed (YYYY-MM-DD), for multi-day trades" },
              pnl: { type: "number", description: "Profit/loss amount" },
              pnlPercent: { type: "number", description: "Profit/loss percentage" },
              notes: { type: "string", description: "Trade notes and observations" },
              setup: { type: "string", description: "Setup type that triggered the trade" },
              followedPlan: { type: "boolean", description: "Did you follow your trading plan?" },
            },
            required: ["direction"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "add_journal_session",
          description: "Add a trading session entry to the daily journal",
          parameters: {
            type: "object",
            properties: {
              sessionName: { type: "string", description: "Session name (e.g., London AM, NY Open)" },
              pnl: { type: "number", description: "Session P&L" },
              notes: { type: "string", description: "Session notes" },
              lessons: { type: "string", description: "Key lessons learned" },
              emotionalState: { type: "string", description: "Emotional state during session" },
              followedPlan: { type: "boolean", description: "Did you follow your plan?" },
            },
            required: ["sessionName"],
          },
        },
      },
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
          name: "evaluate_setup",
          description: "Evaluate a potential trade setup against strategy criteria",
          parameters: {
            type: "object",
            properties: {
              instrument: { type: "string", description: "Trading instrument" },
              direction: { type: "string", enum: ["long", "short"], description: "Proposed direction" },
              setup: { type: "string", description: "Setup type" },
              timeframe: { type: "string", description: "Chart timeframe" },
              notes: { type: "string", description: "Additional context about the setup" },
            },
            required: ["instrument", "direction", "setup"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the internet for real-time market information, news, economic data, or trading concepts. Use this to get current prices, news events, economic calendar data, or research trading strategies.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query for market info, news, or trading concepts" },
              type: { type: "string", enum: ["news", "price", "economic", "general"], description: "Type of information to search for" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_strategy",
          description: "Create a new trading strategy with checklist sections. The strategy will be saved and available for daily use.",
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
                    name: { type: "string", description: "Section name (e.g., Pre-Market Analysis, Entry Criteria)" },
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
        case "get_trading_summary": {
          const today = new Date().toISOString().split("T")[0];
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const [strategies, recentChecklists, todayDay] = await Promise.all([
            storage.getTradingStrategies({ isActive: true }),
            storage.getDailyTradingChecklists({ }),
            storage.getDayOrCreate(today),
          ]);

          // Calculate weekly stats
          const weekChecklists = recentChecklists.filter(c => c.date >= weekAgo);
          let totalTrades = 0;
          let totalPnl = 0;
          let wins = 0;

          for (const checklist of weekChecklists) {
            const trades = checklist.data.trades || [];
            totalTrades += trades.length;
            for (const trade of trades) {
              if (trade.pnl !== undefined) {
                totalPnl += trade.pnl;
                if (trade.pnl > 0) wins++;
              }
            }
          }

          return {
            result: JSON.stringify({
              activeStrategies: strategies.map(s => ({ id: s.id, name: s.name })),
              weeklyStats: {
                tradingDays: weekChecklists.length,
                totalTrades,
                totalPnl: Math.round(totalPnl * 100) / 100,
                winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0,
              },
              todayStatus: {
                hasChecklist: this.todayChecklist !== null,
                checklistStrategy: this.todayChecklist?.data.strategyName || null,
                tradesLogged: this.todayChecklist?.data.trades?.length || 0,
                journalSessions: (todayDay?.tradingJournal as any)?.sessions?.length || 0,
              },
            }),
          };
        }

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
                name: section.name,
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
            return { result: JSON.stringify({ hasChecklist: false, message: "No checklist started for today" }) };
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

        case "get_trading_journal": {
          const endDate = args.endDate || new Date().toISOString().split("T")[0];
          const startDate = args.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          // Get days with trading journal
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

        case "analyze_trading_performance": {
          const endDate = args.endDate || new Date().toISOString().split("T")[0];
          const startDate = args.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const checklists = await storage.getDailyTradingChecklists({});
          const periodChecklists = checklists.filter(c => c.date >= startDate && c.date <= endDate);

          let totalTrades = 0;
          let wins = 0;
          let losses = 0;
          let totalPnl = 0;
          let largestWin = 0;
          let largestLoss = 0;
          const pnlByDay: Record<string, number> = {};
          const tradesBySetup: Record<string, { count: number; pnl: number; wins: number }> = {};

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

              const setup = trade.setup || "Unknown";
              if (!tradesBySetup[setup]) {
                tradesBySetup[setup] = { count: 0, pnl: 0, wins: 0 };
              }
              tradesBySetup[setup].count++;
              tradesBySetup[setup].pnl += pnl;
              if (pnl > 0) tradesBySetup[setup].wins++;
            }
          }

          const winningDays = Object.values(pnlByDay).filter(p => p > 0).length;
          const losingDays = Object.values(pnlByDay).filter(p => p < 0).length;

          return {
            result: JSON.stringify({
              period: { startDate, endDate },
              tradingDays: periodChecklists.length,
              metrics: {
                totalTrades,
                wins,
                losses,
                winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0,
                totalPnl: Math.round(totalPnl * 100) / 100,
                averagePnl: totalTrades > 0 ? Math.round((totalPnl / totalTrades) * 100) / 100 : 0,
                largestWin: Math.round(largestWin * 100) / 100,
                largestLoss: Math.round(largestLoss * 100) / 100,
                winningDays,
                losingDays,
              },
              bySetup: Object.entries(tradesBySetup).map(([setup, data]) => ({
                setup,
                trades: data.count,
                totalPnl: Math.round(data.pnl * 100) / 100,
                winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
              })),
            }),
          };
        }

        case "log_trade": {
          const today = new Date().toISOString().split("T")[0];
          let checklist = await storage.getDailyTradingChecklistByDate(today);

          // Use symbol or instrument (symbol takes precedence)
          const tradeSymbol = args.symbol || args.instrument || "UNKNOWN";

          if (!checklist) {
            // Get default strategy to create checklist
            const defaultStrategy = await storage.getDefaultTradingStrategy();
            if (!defaultStrategy) {
              return { result: "No trading checklist for today and no default strategy. Please start a checklist first." };
            }

            const day = await storage.getDayOrCreate(today);
            checklist = await storage.createDailyTradingChecklist({
              dayId: day.id,
              date: today,
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

          const trade = {
            id: `trade_${Date.now()}`,
            time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
            symbol: tradeSymbol,
            direction: args.direction,
            entryPrice: args.entryPrice?.toString() || "",
            stopLoss: args.stopLoss?.toString() || "",
            takeProfit: args.takeProfit?.toString(),
            openDate: args.openDate || today,
            closeDate: args.closeDate,
            result: args.pnl !== undefined ? (args.pnl > 0 ? "win" : args.pnl < 0 ? "loss" : "breakeven") : "pending",
            pnl: args.pnl,
            notes: args.notes,
          };

          const existingTrades = checklist.data.trades || [];
          await storage.updateDailyTradingChecklist(checklist.id, {
            data: {
              ...checklist.data,
              trades: [...existingTrades, trade as any],
            },
          });

          const isMultiDay = args.closeDate && args.closeDate !== args.openDate;
          return {
            result: `Trade logged: ${args.direction.toUpperCase()} ${tradeSymbol}${isMultiDay ? ` (${args.openDate} to ${args.closeDate})` : ""}${args.pnl !== undefined ? ` P&L: ${args.pnl}` : ""}`,
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
            notes: args.notes,
            lessons: args.lessons,
            emotionalState: args.emotionalState,
            followedPlan: args.followedPlan,
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
            result: `Journal session added: ${args.sessionName}${args.pnl !== undefined ? ` (P&L: ${args.pnl})` : ""}`,
            action: {
              action: "add_journal_session",
              entityType: "journal_session",
              entityId: session.id,
              parameters: args,
              result: "success",
            },
          };
        }

        case "get_trading_docs": {
          const docs = await storage.getDocs({ domain: "trading" });
          let filtered = docs;

          if (args.query) {
            const query = args.query.toLowerCase();
            filtered = docs.filter(d =>
              d.title.toLowerCase().includes(query) ||
              d.body?.toLowerCase().includes(query) ||
              d.tags?.toLowerCase().includes(query)
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

        case "evaluate_setup": {
          // Get active strategy for context
          const defaultStrategy = await storage.getDefaultTradingStrategy();

          return {
            result: JSON.stringify({
              setup: {
                instrument: args.instrument,
                direction: args.direction,
                type: args.setup,
                timeframe: args.timeframe,
                notes: args.notes,
              },
              strategy: defaultStrategy ? {
                name: defaultStrategy.name,
                sections: defaultStrategy.config.sections?.map(s => s.name) || [],
              } : null,
              reminder: "Remember to check: 1) Does this align with your strategy criteria? 2) Is risk/reward favorable? 3) What's your emotional state? 4) Is this a high-probability setup?",
            }),
          };
        }

        case "web_search": {
          // Use OpenRouter to search the web via Perplexity or similar
          const searchQuery = args.query;
          const searchType = args.type || "general";

          // Use configured research model if set, otherwise try Perplexity models in order
          const configuredResearchModel = this.config?.researchModel;
          const webSearchModels = configuredResearchModel
            ? [configuredResearchModel, "perplexity/sonar-pro", "perplexity/sonar"]
            : ["perplexity/sonar-pro", "perplexity/sonar", "perplexity/sonar-reasoning"];

          let searchResult: string | null = null;
          let lastError: any = null;

          for (const model of webSearchModels) {
            try {
              logger.info({ model, query: searchQuery, isConfigured: model === configuredResearchModel }, "Attempting web search");

              // Use a web-enabled model for search
              const searchResponse = await openai.chat.completions.create({
                model,
                messages: [
                  {
                    role: "system",
                    content: `You are a trading research assistant. Search for current, real-time information about: ${searchType === "news" ? "market news and events" : searchType === "price" ? "current prices and market data" : searchType === "economic" ? "economic calendar and data releases" : "trading and market information"}. Provide factual, up-to-date information with sources when available.`,
                  },
                  {
                    role: "user",
                    content: searchQuery,
                  },
                ],
                max_tokens: 1000,
              });

              searchResult = searchResponse.choices[0]?.message?.content || "No results found";
              logger.info({ model }, "Web search successful");
              break; // Success, exit the loop
            } catch (modelError: any) {
              logger.warn({ model, error: modelError.message }, "Web search model failed, trying next");
              lastError = modelError;
              continue; // Try next model
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
            logger.error({ lastError }, "All web search models failed");
            return {
              result: `Web search is currently unavailable. Please check market data sources directly or try again later. Error: ${lastError?.message || "Unknown error"}`,
              action: {
                action: "web_search",
                parameters: args,
                result: "failed",
                errorMessage: lastError?.message || "All web search models unavailable",
              },
            };
          }
        }

        case "create_strategy": {
          // Create a new trading strategy
          const { name, description, isDefault, sections } = args;

          // Build the strategy config
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

          // Update strategies cache
          this.strategies = await storage.getTradingStrategies({ isActive: true });

          return {
            result: JSON.stringify({
              success: true,
              strategy: {
                id: strategy.id,
                name: strategy.name,
                description: strategy.description,
                sections: config.sections.map(s => ({
                  name: s.name,
                  itemCount: s.items.length,
                })),
              },
              message: `Trading strategy "${name}" created successfully with ${sections.length} sections.`,
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
   * Process a user message and generate a response
   */
  async chat(userMessage: string, sessionId?: string): Promise<{
    response: string;
    actions: TradingAgentAction[];
    tokensUsed?: number;
    model?: string;
  }> {
    if (!this.strategies.length) {
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
      // Use preferred model: trading config > user global preference > default
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

      // If no tool calls, we have our final response
      if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
        finalResponse = choice.message.content || "I'm here to help with your trading. How can I assist?";
        break;
      }

      // Add assistant message with tool calls
      conversationMessages.push(choice.message);

      // Process tool calls
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
