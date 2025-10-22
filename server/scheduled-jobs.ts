import { logger } from "./logger";
import { storage } from "./storage";
import * as proactiveEngine from "./proactive-engine";

/**
 * Scheduled Jobs System
 * Handles cron-style scheduling for briefings and proactive checks
 */

// Get authorized chat ID from environment (supports multiple IDs separated by comma)
const AUTHORIZED_CHAT_IDS = (process.env.TELEGRAM_CHAT_ID || "7964798688")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

const MORNING_BRIEFING_HOUR = 8; // 8 AM
const EVENING_SUMMARY_HOUR = 18; // 6 PM
const REAL_TIME_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let morningBriefingInterval: NodeJS.Timeout | null = null;
let eveningSummaryInterval: NodeJS.Timeout | null = null;
let realTimeCheckInterval: NodeJS.Timeout | null = null;

/**
 * Calculate milliseconds until next target hour
 */
function millisecondsUntilHour(targetHour: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);

  // If target hour has passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

/**
 * Schedule morning briefing
 */
function scheduleMorningBriefing(sendMessage: (chatId: string, message: string) => Promise<void>) {
  const msUntil = millisecondsUntilHour(MORNING_BRIEFING_HOUR);

  logger.info({
    targetHour: MORNING_BRIEFING_HOUR,
    msUntil,
    nextRun: new Date(Date.now() + msUntil).toISOString(),
  }, "📅 Scheduling morning briefing");

  // Clear existing interval
  if (morningBriefingInterval) {
    clearTimeout(morningBriefingInterval);
  }

  // Schedule first run
  morningBriefingInterval = setTimeout(async () => {
    try {
      logger.info("🌅 Running morning briefing for all users");
      
      // Send briefing to all authorized users
      for (const chatId of AUTHORIZED_CHAT_IDS) {
        try {
          const briefing = await proactiveEngine.generateMorningBriefing(chatId);
          const message = proactiveEngine.formatBriefing(briefing);
          await sendMessage(chatId, message);
        } catch (error: any) {
          logger.error({ chatId, error: error.message }, "❌ Morning briefing failed for user");
        }
      }

      // Reschedule for next day
      scheduleMorningBriefing(sendMessage);
    } catch (error: any) {
      logger.error({ error: error.message }, "❌ Morning briefing failed");
      // Retry in 1 hour
      morningBriefingInterval = setTimeout(() => scheduleMorningBriefing(sendMessage), 60 * 60 * 1000);
    }
  }, msUntil);
}

/**
 * Schedule evening summary
 */
function scheduleEveningSummary(sendMessage: (chatId: string, message: string) => Promise<void>) {
  const msUntil = millisecondsUntilHour(EVENING_SUMMARY_HOUR);

  logger.info({
    targetHour: EVENING_SUMMARY_HOUR,
    msUntil,
    nextRun: new Date(Date.now() + msUntil).toISOString(),
  }, "📅 Scheduling evening summary");

  // Clear existing interval
  if (eveningSummaryInterval) {
    clearTimeout(eveningSummaryInterval);
  }

  // Schedule first run
  eveningSummaryInterval = setTimeout(async () => {
    try {
      logger.info("🌙 Running evening summary for all users");
      
      // Send summary to all authorized users
      for (const chatId of AUTHORIZED_CHAT_IDS) {
        try {
          const summary = await proactiveEngine.generateEveningSummary(chatId);
          const message = proactiveEngine.formatBriefing(summary);
          await sendMessage(chatId, message);
        } catch (error: any) {
          logger.error({ chatId, error: error.message }, "❌ Evening summary failed for user");
        }
      }

      // Reschedule for next day
      scheduleEveningSummary(sendMessage);
    } catch (error: any) {
      logger.error({ error: error.message }, "❌ Evening summary failed");
      // Retry in 1 hour
      eveningSummaryInterval = setTimeout(() => scheduleEveningSummary(sendMessage), 60 * 60 * 1000);
    }
  }, msUntil);
}

/**
 * Schedule real-time proactive checks (every hour)
 */
function scheduleRealTimeChecks(sendMessage: (chatId: string, message: string) => Promise<void>) {
  logger.info({
    intervalMs: REAL_TIME_CHECK_INTERVAL_MS,
  }, "⏰ Scheduling hourly proactive checks");

  // Clear existing interval
  if (realTimeCheckInterval) {
    clearInterval(realTimeCheckInterval);
  }

  // Run immediately once for all users, then every hour
  (async () => {
    for (const chatId of AUTHORIZED_CHAT_IDS) {
      try {
        await proactiveEngine.checkRealTimeTriggers(chatId);
        
        // Check for pending suggestions and send them
        const pendingSuggestions = await storage.getPendingSuggestions(chatId);
        for (const suggestion of pendingSuggestions) {
          if (suggestion.status === "pending" && !suggestion.sentAt) {
            await sendMessage(chatId, suggestion.content);
            await storage.markSuggestionSent(suggestion.id);
          }
        }
      } catch (error: any) {
        logger.error({ chatId, error: error.message }, "❌ Real-time check failed for user");
      }
    }
  })();

  // Schedule recurring checks for all users
  realTimeCheckInterval = setInterval(async () => {
    for (const chatId of AUTHORIZED_CHAT_IDS) {
      try {
        await proactiveEngine.checkRealTimeTriggers(chatId);
        
        // Check for pending suggestions
        const pendingSuggestions = await storage.getPendingSuggestions(chatId);
        for (const suggestion of pendingSuggestions) {
          if (suggestion.status === "pending" && !suggestion.sentAt) {
            await sendMessage(chatId, suggestion.content);
            await storage.markSuggestionSent(suggestion.id);
          }
        }
      } catch (error: any) {
        logger.error({ chatId, error: error.message }, "❌ Real-time check failed for user");
      }
    }
  }, REAL_TIME_CHECK_INTERVAL_MS);
}

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduledJobs(sendMessage: (chatId: string, message: string) => Promise<void>) {
  logger.info("🚀 Initializing scheduled jobs system");

  // Schedule all jobs
  scheduleMorningBriefing(sendMessage);
  scheduleEveningSummary(sendMessage);
  scheduleRealTimeChecks(sendMessage);

  logger.info("✅ All scheduled jobs initialized");
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs() {
  logger.info("🛑 Stopping all scheduled jobs");

  if (morningBriefingInterval) {
    clearTimeout(morningBriefingInterval);
    morningBriefingInterval = null;
  }

  if (eveningSummaryInterval) {
    clearTimeout(eveningSummaryInterval);
    eveningSummaryInterval = null;
  }

  if (realTimeCheckInterval) {
    clearInterval(realTimeCheckInterval);
    realTimeCheckInterval = null;
  }

  logger.info("✅ All scheduled jobs stopped");
}

/**
 * Manually trigger morning briefing (for testing)
 */
export async function triggerMorningBriefing(sendMessage: (chatId: string, message: string) => Promise<void>, chatId?: string) {
  const targetChatId = chatId || AUTHORIZED_CHAT_IDS[0];
  logger.info({ chatId: targetChatId }, "🧪 Manually triggering morning briefing");
  const briefing = await proactiveEngine.generateMorningBriefing(targetChatId);
  const message = proactiveEngine.formatBriefing(briefing);
  await sendMessage(targetChatId, message);
}

/**
 * Manually trigger evening summary (for testing)
 */
export async function triggerEveningSummary(sendMessage: (chatId: string, message: string) => Promise<void>, chatId?: string) {
  const targetChatId = chatId || AUTHORIZED_CHAT_IDS[0];
  logger.info({ chatId: targetChatId }, "🧪 Manually triggering evening summary");
  const summary = await proactiveEngine.generateEveningSummary(targetChatId);
  const message = proactiveEngine.formatBriefing(summary);
  await sendMessage(targetChatId, message);
}
