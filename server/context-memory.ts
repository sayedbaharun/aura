import { storage } from "./storage";
import { logger } from "./logger";
import type { InteractionHistory, UserProfile } from "@shared/schema";
import OpenAI from "openai";

/**
 * Context Memory System - Advanced learning and pattern detection
 * Builds user profiles, detects patterns, and provides RAG context injection
 */

export interface PatternAnalysis {
  preferredMeetingTimes: Array<{ day: string; hour: number; count: number }>;
  commonAttendees: string[];
  frequentMeetingTypes: Record<string, number>;
  peakProductivityHours: Array<{ start: number; end: number }>;
  emailResponsePatterns: {
    urgentKeywords: string[];
    actionKeywords: string[];
  };
  noteCategorization: {
    commonTags: string[];
    categoryDistribution: Record<string, number>;
  };
}

export interface ContextSummary {
  recentInteractions: string;
  userPreferences: string;
  patterns: string;
  relevantHistory: string;
}

/**
 * Initialize or get user profile
 */
export async function getOrCreateUserProfile(chatId: string): Promise<UserProfile> {
  let profile = await storage.getUserProfile(chatId);
  
  if (!profile) {
    logger.info({ chatId }, "Creating new user profile");
    profile = await storage.createUserProfile({
      chatId,
      preferredLanguage: "en",
      totalInteractions: 0,
    });
  }
  
  return profile;
}

/**
 * Analyze interaction patterns and update user profile
 */
export async function analyzeAndUpdateProfile(chatId: string): Promise<void> {
  try {
    // Get last 200 interactions for pattern analysis
    const interactions = await storage.getInteractionHistory(chatId, 200);
    
    if (interactions.length < 5) {
      logger.info({ chatId }, "Not enough interactions for pattern analysis");
      return;
    }

    const analysis = analyzePatterns(interactions);
    
    // Update profile with detected patterns
    await storage.updateUserProfile(chatId, {
      preferredMeetingTimes: analysis.preferredMeetingTimes,
      frequentMeetingTypes: analysis.frequentMeetingTypes,
      commonAttendees: analysis.commonAttendees,
      peakProductivityHours: analysis.peakProductivityHours,
      emailResponsePatterns: analysis.emailResponsePatterns,
      noteCategorization: analysis.noteCategorization,
    });
    
    logger.info({
      chatId,
      interactionsAnalyzed: interactions.length,
      patternsDetected: Object.keys(analysis).length,
    }, "✅ User profile updated with pattern analysis");
  } catch (error: any) {
    logger.error({ chatId, error: error.message }, "❌ Failed to analyze patterns");
  }
}

/**
 * Analyze patterns from interaction history
 */
function analyzePatterns(interactions: InteractionHistory[]): PatternAnalysis {
  const analysis: PatternAnalysis = {
    preferredMeetingTimes: [],
    commonAttendees: [],
    frequentMeetingTypes: {},
    peakProductivityHours: [],
    emailResponsePatterns: {
      urgentKeywords: [],
      actionKeywords: [],
    },
    noteCategorization: {
      commonTags: [],
      categoryDistribution: {},
    },
  };

  // Analyze meeting times
  const meetingTimes: Record<string, number> = {};
  const attendeeCounts: Record<string, number> = {};
  const meetingTypes: Record<string, number> = {};

  for (const interaction of interactions) {
    // Extract meeting times for calendar actions
    if (interaction.action === "book" && interaction.metadata) {
      const metadata = interaction.metadata as any;
      
      if (interaction.dayOfWeek !== null && interaction.timeOfDay !== null) {
        const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][interaction.dayOfWeek];
        const key = `${dayName}-${interaction.timeOfDay}`;
        meetingTimes[key] = (meetingTimes[key] || 0) + 1;
      }

      // Track attendees
      if (metadata.attendees && Array.isArray(metadata.attendees)) {
        for (const attendee of metadata.attendees) {
          attendeeCounts[attendee] = (attendeeCounts[attendee] || 0) + 1;
        }
      }

      // Track meeting types (extract from title or metadata)
      if (metadata.title) {
        const title = metadata.title.toLowerCase();
        if (title.includes("1:1") || title.includes("one-on-one")) {
          meetingTypes["1:1"] = (meetingTypes["1:1"] || 0) + 1;
        } else if (title.includes("team") || title.includes("standup")) {
          meetingTypes["team"] = (meetingTypes["team"] || 0) + 1;
        } else if (title.includes("client") || title.includes("customer")) {
          meetingTypes["client"] = (meetingTypes["client"] || 0) + 1;
        } else {
          meetingTypes["general"] = (meetingTypes["general"] || 0) + 1;
        }
      }
    }

    // Analyze note categorization
    if (interaction.action === "create_note" && interaction.metadata) {
      const metadata = interaction.metadata as any;
      
      if (metadata.category) {
        analysis.noteCategorization.categoryDistribution[metadata.category] = 
          (analysis.noteCategorization.categoryDistribution[metadata.category] || 0) + 1;
      }

      if (metadata.tags && Array.isArray(metadata.tags)) {
        analysis.noteCategorization.commonTags.push(...metadata.tags);
      }
    }
  }

  // Convert meeting times to structured format
  const sortedTimes = Object.entries(meetingTimes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  analysis.preferredMeetingTimes = sortedTimes.map(([key, count]) => {
    const [day, hour] = key.split("-");
    return { day, hour: parseInt(hour), count };
  });

  // Get top 5 common attendees
  analysis.commonAttendees = Object.entries(attendeeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([email]) => email);

  // Set meeting types
  analysis.frequentMeetingTypes = meetingTypes;

  // Detect peak productivity hours (when user creates most notes or schedules focus time)
  const hourActivity: Record<number, number> = {};
  for (const interaction of interactions) {
    if (interaction.timeOfDay !== null && 
        (interaction.action === "create_note" || interaction.action === "focus_time")) {
      hourActivity[interaction.timeOfDay] = (hourActivity[interaction.timeOfDay] || 0) + 1;
    }
  }

  const peakHours = Object.entries(hourActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([hour]) => parseInt(hour));

  if (peakHours.length > 0) {
    analysis.peakProductivityHours = peakHours.map(hour => ({
      start: hour,
      end: Math.min(hour + 2, 23),
    }));
  }

  // Get unique common tags (top 10)
  const tagCounts: Record<string, number> = {};
  for (const tag of analysis.noteCategorization.commonTags) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  analysis.noteCategorization.commonTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  return analysis;
}

/**
 * Build context summary for RAG injection
 */
export async function buildContextSummary(chatId: string): Promise<ContextSummary> {
  try {
    const profile = await storage.getUserProfile(chatId);
    const recentInteractions = await storage.getRecentInteractions(chatId, 24); // Last 24 hours

    let summary: ContextSummary = {
      recentInteractions: "",
      userPreferences: "",
      patterns: "",
      relevantHistory: "",
    };

    // Build recent interactions summary
    if (recentInteractions.length > 0) {
      const interactionSummary = recentInteractions
        .slice(0, 5)
        .map((i) => `- ${i.action}: ${i.userInput || "N/A"}`)
        .join("\n");
      summary.recentInteractions = `Recent activity (last 24h):\n${interactionSummary}`;
    }

    // Build user preferences summary
    if (profile) {
      const prefs: string[] = [];

      if (profile.preferredMeetingDuration) {
        prefs.push(`Preferred meeting duration: ${profile.preferredMeetingDuration} minutes`);
      }

      if (profile.commonAttendees && profile.commonAttendees.length > 0) {
        prefs.push(`Common meeting attendees: ${profile.commonAttendees.slice(0, 3).join(", ")}`);
      }

      if (profile.workingHours) {
        const hours = profile.workingHours as any;
        prefs.push(`Working hours: ${hours.start} - ${hours.end}`);
      }

      if (prefs.length > 0) {
        summary.userPreferences = `User preferences:\n- ${prefs.join("\n- ")}`;
      }
    }

    // Build patterns summary
    if (profile?.preferredMeetingTimes) {
      const times = profile.preferredMeetingTimes as any[];
      if (times && times.length > 0) {
        const timeStr = times
          .slice(0, 3)
          .map((t: any) => `${t.day} at ${t.hour}:00`)
          .join(", ");
        summary.patterns = `Detected patterns:\n- User typically schedules meetings on ${timeStr}`;
      }
    }

    return summary;
  } catch (error: any) {
    logger.error({ chatId, error: error.message }, "❌ Failed to build context summary");
    return {
      recentInteractions: "",
      userPreferences: "",
      patterns: "",
      relevantHistory: "",
    };
  }
}

/**
 * Inject context into AI messages for RAG
 */
export async function injectContext(
  chatId: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
  try {
    const context = await buildContextSummary(chatId);

    // Build context string
    const contextParts: string[] = [];
    if (context.recentInteractions) contextParts.push(context.recentInteractions);
    if (context.userPreferences) contextParts.push(context.userPreferences);
    if (context.patterns) contextParts.push(context.patterns);

    if (contextParts.length === 0) {
      return messages; // No context to inject
    }

    const contextString = `\n\n<user_context>\n${contextParts.join("\n\n")}\n</user_context>`;

    // Inject context into system message or first user message
    const modifiedMessages = [...messages];
    const systemMessage = modifiedMessages.find((m) => m.role === "system");

    if (systemMessage && "content" in systemMessage && typeof systemMessage.content === "string") {
      systemMessage.content += contextString;
    } else {
      // Add as a new system message
      modifiedMessages.unshift({
        role: "system",
        content: `You are Aura, an AI personal assistant. Here's what I know about the user:${contextString}`,
      });
    }

    logger.info({ chatId, contextLength: contextString.length }, "✅ Context injected for RAG");
    return modifiedMessages;
  } catch (error: any) {
    logger.error({ chatId, error: error.message }, "❌ Failed to inject context");
    return messages; // Return original messages on error
  }
}

/**
 * Track interaction for pattern learning
 */
export async function trackInteraction(
  chatId: string,
  interactionType: string,
  action: string,
  userInput: string | null,
  aiResponse: string | null,
  metadata: any,
  success: boolean,
  modelUsed: string,
  tokenCount?: number
): Promise<void> {
  try {
    const now = new Date();
    
    await storage.createInteractionHistory({
      chatId,
      interactionType,
      action,
      userInput: userInput || undefined,
      aiResponse: aiResponse || undefined,
      metadata,
      success,
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      modelUsed,
      tokenCount,
    });

    // Increment interaction count in profile
    await storage.incrementInteractionCount(chatId);

    // Trigger profile update every 10 interactions
    const profile = await storage.getUserProfile(chatId);
    if (profile && profile.totalInteractions % 10 === 0) {
      // Run pattern analysis asynchronously (don't await)
      analyzeAndUpdateProfile(chatId).catch((error) => {
        logger.error({ chatId, error: error.message }, "Background pattern analysis failed");
      });
    }
  } catch (error: any) {
    logger.error({ chatId, error: error.message }, "❌ Failed to track interaction");
  }
}
