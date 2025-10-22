import { storage } from "./storage";
import { logger } from "./logger";
import * as calendar from "./google-calendar";
import * as gmail from "./gmail";
import type { ProactiveSuggestion, QuickNote, Appointment } from "@shared/schema";

/**
 * Proactive Suggestion Engine
 * Generates daily briefings, detects issues, and creates smart suggestions
 */

export interface DailyBriefing {
  greeting: string;
  calendarSummary: string;
  emailSummary: string;
  notesSummary: string;
  alerts: string[];
  suggestions: string[];
}

export interface ConflictAlert {
  type: "double_booking" | "missing_meet_link" | "no_agenda" | "back_to_back";
  eventId: string;
  eventTitle: string;
  message: string;
  priority: "high" | "normal" | "low";
}

/**
 * Generate morning briefing
 */
export async function generateMorningBriefing(chatId: string): Promise<DailyBriefing> {
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's calendar events
    const calendarEvents = await calendar.listEvents(now, endOfDay, 50);

    // Get unread emails
    const emails = await gmail.listMessages({ maxResults: 5, query: "is:unread" });

    // Get high-priority notes
    const notes = await storage.getQuickNotes(chatId, 10);
    const highPriorityNotes = notes.filter((n) => n.priority === "high");

    // Detect conflicts and issues
    const alerts = await detectIssues(chatId, calendarEvents);

    // Generate suggestions
    const suggestions = await generateSuggestions(chatId, calendarEvents, notes);

    // Build briefing
    const briefing: DailyBriefing = {
      greeting: getGreeting(now.getHours()),
      calendarSummary: buildCalendarSummary(calendarEvents),
      emailSummary: buildEmailSummary(emails),
      notesSummary: buildNotesSummary(highPriorityNotes),
      alerts: alerts.map((a) => a.message),
      suggestions: suggestions.map((s) => s.content),
    };

    // Store suggestions for tracking
    for (const suggestion of suggestions) {
      await storage.createProactiveSuggestion({
        chatId,
        suggestionType: "briefing",
        priority: "normal",
        content: suggestion.content,
        trigger: "morning_briefing",
        metadata: suggestion.metadata,
        scheduledFor: now,
      });
    }

    logger.info({ chatId, alertCount: alerts.length }, "✅ Morning briefing generated");
    return briefing;
  } catch (error: any) {
    logger.error({ chatId, error: error.message }, "❌ Failed to generate morning briefing");
    throw error;
  }
}

/**
 * Generate evening summary
 */
export async function generateEveningSummary(chatId: string): Promise<DailyBriefing> {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Get tomorrow's events
    const upcomingEvents = await calendar.listEvents(tomorrow, endOfTomorrow, 50);

    // Get today's completed interactions
    const todayInteractions = await storage.getRecentInteractions(chatId, 24);

    // Get pending notes
    const notes = await storage.getQuickNotes(chatId, 10);
    const pendingTasks = notes.filter(
      (n) => n.noteType === "task" && n.priority !== "low"
    );

    const briefing: DailyBriefing = {
      greeting: "🌙 Evening Summary",
      calendarSummary: `Tomorrow: ${buildCalendarSummary(upcomingEvents)}`,
      emailSummary: "", // Not checking emails in evening
      notesSummary: buildNotesSummary(pendingTasks),
      alerts: [],
      suggestions: [
        `You had ${todayInteractions.length} interactions today.`,
        pendingTasks.length > 0
          ? `You have ${pendingTasks.length} pending tasks to review.`
          : "All tasks complete! 🎉",
      ],
    };

    logger.info({ chatId }, "✅ Evening summary generated");
    return briefing;
  } catch (error: any) {
    logger.error({ chatId, error: error.message }, "❌ Failed to generate evening summary");
    throw error;
  }
}

/**
 * Detect calendar conflicts and issues
 */
export async function detectIssues(
  chatId: string,
  events: any[]
): Promise<ConflictAlert[]> {
  const alerts: ConflictAlert[] = [];

  if (!events || events.length === 0) {
    return alerts;
  }

  // Sort events by start time
  const sortedEvents = events.sort((a, b) => {
    const aStart = new Date(a.start.dateTime || a.start.date);
    const bStart = new Date(b.start.dateTime || b.start.date);
    return aStart.getTime() - bStart.getTime();
  });

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);

    // Check for missing Google Meet link
    if (!event.hangoutLink && !event.conferenceData) {
      alerts.push({
        type: "missing_meet_link",
        eventId: event.id,
        eventTitle: event.summary,
        message: `⚠️ "${event.summary}" at ${eventStart.toLocaleTimeString()} has no video link`,
        priority: "normal",
      });
    }

    // Check for back-to-back meetings
    if (i > 0) {
      const prevEvent = sortedEvents[i - 1];
      const prevEnd = new Date(prevEvent.end.dateTime || prevEvent.end.date);

      if (Math.abs(eventStart.getTime() - prevEnd.getTime()) < 5 * 60 * 1000) {
        // Less than 5 min gap
        alerts.push({
          type: "back_to_back",
          eventId: event.id,
          eventTitle: event.summary,
          message: `⏱️ Back-to-back: "${prevEvent.summary}" → "${event.summary}" with no break`,
          priority: "low",
        });
      }
    }

    // Check for double booking (overlapping events)
    if (i < sortedEvents.length - 1) {
      const nextEvent = sortedEvents[i + 1];
      const nextStart = new Date(nextEvent.start.dateTime || nextEvent.start.date);

      if (nextStart < eventEnd) {
        alerts.push({
          type: "double_booking",
          eventId: event.id,
          eventTitle: event.summary,
          message: `🚨 CONFLICT: "${event.summary}" overlaps with "${nextEvent.summary}"`,
          priority: "high",
        });
      }
    }
  }

  return alerts;
}

/**
 * Generate smart suggestions based on patterns
 */
async function generateSuggestions(
  chatId: string,
  events: any[],
  notes: QuickNote[]
): Promise<Array<{ content: string; metadata: any }>> {
  const suggestions: Array<{ content: string; metadata: any }> = [];

  // Suggest focus time if no blocks this week
  const focusTimeEvents = events.filter((e) =>
    e.summary && e.summary.toLowerCase().includes("focus")
  );

  if (focusTimeEvents.length === 0) {
    suggestions.push({
      content: "💡 You haven't blocked any focus time this week. Want me to add some?",
      metadata: { type: "focus_time_suggestion" },
    });
  }

  // Suggest reviewing old notes
  const oldNotes = notes.filter((n) => {
    const age = Date.now() - new Date(n.createdAt).getTime();
    return age > 7 * 24 * 60 * 60 * 1000; // Older than 7 days
  });

  if (oldNotes.length > 5) {
    suggestions.push({
      content: `📝 You have ${oldNotes.length} notes older than a week. Want to review them?`,
      metadata: { type: "note_review", noteCount: oldNotes.length },
    });
  }

  // Check for heavy meeting day
  if (events.length >= 5) {
    suggestions.push({
      content: `📅 You have ${events.length} meetings today. Consider rescheduling non-urgent ones.`,
      metadata: { type: "meeting_optimization", meetingCount: events.length },
    });
  }

  return suggestions;
}

/**
 * Build calendar summary text
 */
function buildCalendarSummary(events: any[]): string {
  if (!events || events.length === 0) {
    return "No meetings scheduled today! ✨";
  }

  const summary = events
    .slice(0, 5)
    .map((event) => {
      const start = new Date(event.start.dateTime || event.start.date);
      const time = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `• ${time} - ${event.summary}`;
    })
    .join("\n");

  const remaining = events.length > 5 ? `\n... and ${events.length - 5} more` : "";
  return `${events.length} meetings today:\n${summary}${remaining}`;
}

/**
 * Build email summary text
 */
function buildEmailSummary(emails: any): string {
  if (!emails || !emails.messages || emails.messages.length === 0) {
    return "Inbox zero! 🎉";
  }

  const count = emails.resultSizeEstimate || emails.messages.length;
  return `${count} unread emails`;
}

/**
 * Build notes summary text
 */
function buildNotesSummary(notes: QuickNote[]): string {
  if (!notes || notes.length === 0) {
    return "No pending notes";
  }

  const summary = notes
    .slice(0, 3)
    .map((note) => `• [${note.priority.toUpperCase()}] ${note.content.substring(0, 50)}`)
    .join("\n");

  const remaining = notes.length > 3 ? `\n... and ${notes.length - 3} more` : "";
  return `${notes.length} high-priority notes:\n${summary}${remaining}`;
}

/**
 * Get greeting based on time of day
 */
function getGreeting(hour: number): string {
  if (hour < 12) {
    return "🌅 Good Morning!";
  } else if (hour < 18) {
    return "☀️ Good Afternoon!";
  } else {
    return "🌆 Good Evening!";
  }
}

/**
 * Format briefing for Telegram
 */
export function formatBriefing(briefing: DailyBriefing): string {
  const sections: string[] = [briefing.greeting];

  if (briefing.calendarSummary) {
    sections.push(`\n📅 ${briefing.calendarSummary}`);
  }

  if (briefing.emailSummary) {
    sections.push(`\n📧 ${briefing.emailSummary}`);
  }

  if (briefing.notesSummary) {
    sections.push(`\n📝 ${briefing.notesSummary}`);
  }

  if (briefing.alerts.length > 0) {
    sections.push(`\n${briefing.alerts.join("\n")}`);
  }

  if (briefing.suggestions.length > 0) {
    sections.push(`\n${briefing.suggestions.join("\n")}`);
  }

  return sections.join("\n");
}

/**
 * Check for real-time triggers (called periodically)
 */
export async function checkRealTimeTriggers(chatId: string): Promise<void> {
  try {
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);

    // Get upcoming events
    const upcomingEvents = await calendar.listEvents(now, in30Min, 50);

    for (const event of upcomingEvents) {
      if (!event.start || (!event.start.dateTime && !event.start.date)) continue;
      const eventStart = new Date(event.start.dateTime || event.start.date || "");
      const minutesUntil = (eventStart.getTime() - now.getTime()) / (60 * 1000);

      // Alert if meeting in 30 min with no prep
      if (minutesUntil <= 30 && minutesUntil > 25) {
        if (!event.hangoutLink && !event.conferenceData) {
          await storage.createProactiveSuggestion({
            chatId,
            suggestionType: "conflict_alert",
            priority: "high",
            content: `⚠️ "${event.summary}" starts in 30 minutes but has no video link! Want me to add one?`,
            trigger: "missing_link_alert",
            relatedEventId: event.id,
            scheduledFor: now,
          });
        }
      }
    }
  } catch (error: any) {
    logger.error({ chatId, error: error.message }, "❌ Real-time trigger check failed");
  }
}
