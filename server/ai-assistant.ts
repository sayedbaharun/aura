import OpenAI from "openai";
import { storage } from "./storage";
import * as calendar from "./google-calendar";
import * as gmail from "./gmail";
import * as notion from "./notion";
import { logBooking, logCancellation, logReschedule, logViewSchedule } from "./audit-logger";
import { logger } from "./logger";
import { retryOpenAI } from "./retry-utils";
import * as modelManager from "./model-manager";
import * as contextMemory from "./context-memory";

// Initialize OpenAI with direct API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Integrated AI completion with context injection, multi-model fallback, and interaction tracking
 */
async function aiCompletionWithTracking(
  chatId: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.ChatCompletionTool[],
  userInput?: string,
  complexity: modelManager.TaskComplexity = "complex"
): Promise<OpenAI.Chat.ChatCompletion> {
  try {
    // 1. Inject RAG context from user history
    const messagesWithContext = await contextMemory.injectContext(chatId, messages);

    // 2. Call model manager with fallback
    const { response, metrics } = await modelManager.chatCompletion(
      {
        messages: messagesWithContext,
        tools,
        temperature: 0.7,
      },
      complexity
    );

    // 3. Track interaction for pattern learning
    await contextMemory.trackInteraction(
      chatId,
      "message",
      "ai_completion",
      userInput || null,
      response.choices[0]?.message?.content || null,
      { complexity, toolCalls: response.choices[0]?.message?.tool_calls?.length || 0 },
      true,
      metrics.modelUsed,
      metrics.tokensUsed
    );

    return response;
  } catch (error: any) {
    // Track failed interactions too
    await contextMemory.trackInteraction(
      chatId,
      "message",
      "ai_completion",
      userInput || null,
      null,
      { error: error.message },
      false,
      "unknown",
      0
    );
    throw error;
  }
}

export interface PendingConfirmationData {
  action: string;
  data: any;
  messageText: string;
}

/**
 * Parse user intent for confirmation/rejection
 * Handles natural language while preventing false positives
 * Returns: 'confirm' | 'reject' | 'unknown'
 */
function parseConfirmationIntent(text: string): 'confirm' | 'reject' | 'unknown' {
  // Normalize: lowercase, expand contractions, remove punctuation, collapse whitespace
  let normalized = text.toLowerCase();
  
  // Expand common negative contractions before removing punctuation
  // Include U+2019 (') curly apostrophe in addition to ASCII apostrophe
  normalized = normalized
    .replace(/\bdon['\u2019]?t\b/gi, 'do not')
    .replace(/\bcan['\u2019]?t\b/gi, 'can not')
    .replace(/\bcannot\b/gi, 'can not')
    .replace(/\bwon['\u2019]?t\b/gi, 'will not')
    .replace(/\bain['\u2019]?t\b/gi, 'is not')
    .replace(/\bisn['\u2019]?t\b/gi, 'is not')
    .replace(/\baren['\u2019]?t\b/gi, 'are not')
    .replace(/\bwasn['\u2019]?t\b/gi, 'was not')
    .replace(/\bweren['\u2019]?t\b/gi, 'were not')
    .replace(/\bhasn['\u2019]?t\b/gi, 'has not')
    .replace(/\bhaven['\u2019]?t\b/gi, 'have not')
    .replace(/\bhadn['\u2019]?t\b/gi, 'had not')
    .replace(/\bdidn['\u2019]?t\b/gi, 'did not')
    .replace(/\bshouldn['\u2019]?t\b/gi, 'should not')
    .replace(/\bwouldn['\u2019]?t\b/gi, 'would not')
    .replace(/\bcouldn['\u2019]?t\b/gi, 'could not');
  
  // Remove punctuation (including curly quotes, parentheses, slashes, unicode quotes)
  normalized = normalized
    .replace(/[.,!?;:'""`\u201C\u201D\u2018\u2019—–\-…()/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Special case: phrases that contain "no" but aren't rejections
  if (normalized.startsWith('no worries') || normalized.startsWith('no problem')) {
    // Check if there's a strong rejection later (use word boundaries)
    if (!/\bcancel\b|\bnevermind\b/.test(normalized)) {
      return 'unknown'; // Neutral phrase, not a rejection
    }
  }
  
  // Special case: "never mind" phrase (two words)
  if (/\bnever\s+mind\b/.test(normalized)) {
    return 'reject';
  }
  
  // Tokenize
  const tokens = normalized.split(' ');
  const firstToken = tokens[0];
  
  // Define word sets
  const confirmWords = ['yes', 'y', 'confirm', 'ok', 'okay', 'sure', 'yep', 'yeah', 'yup'];
  const strongRejectWords = ['cancel', 'nevermind']; // Anywhere in message
  const weakRejectWords = ['no', 'n', 'nope', 'nah']; // First token or after confirm word
  const neutralHedgeWords = ['maybe', 'later', 'noted', 'unsure', 'idk', 'think']; // Uncertainty markers
  
  // Check for strong rejection words anywhere (e.g., "cancel", "nevermind")
  const hasStrongRejection = tokens.some(token => strongRejectWords.includes(token));
  if (hasStrongRejection) {
    return 'reject';
  }
  
  // Check for negation using word boundary (prevents "nothing", "noted", "knot")
  const hasNegation = /\bnot\b/.test(normalized) || tokens.includes('can not');
  if (hasNegation) {
    return 'unknown';
  }
  
  // Check for weak rejection words in first position (e.g., "no", "nope")
  // But skip if it's a neutral phrase we already handled
  if (weakRejectWords.includes(firstToken) && 
      !normalized.startsWith('no worries') && 
      !normalized.startsWith('no problem')) {
    return 'reject';
  }
  
  // Check if message starts with a confirmation word
  if (confirmWords.includes(firstToken)) {
    // Check for uncertainty/hedging or rejection in rest of message
    const restTokens = tokens.slice(1);
    
    // Check for strong rejections
    const hasStrongRejectInRest = restTokens.some(token => strongRejectWords.includes(token));
    
    // Check for weak rejections, but exclude neutral idioms like "no worries"
    const restText = restTokens.join(' ');
    const hasWeakRejectInRest = restTokens.some(token => weakRejectWords.includes(token)) &&
                                 !restText.startsWith('no worries') &&
                                 !restText.startsWith('no problem');
    
    const hasNeutralInRest = restTokens.some(token => neutralHedgeWords.includes(token));
    
    // Additional phrase checks for common patterns
    const hasUncertainPhrase = normalized.includes('not now') || 
                                normalized.includes('not yet') || 
                                normalized.includes('think about it');
    
    const hasNeutralPhrase = restText.startsWith('no worries') || 
                              restText.startsWith('no problem');
    
    if (hasStrongRejectInRest || hasWeakRejectInRest) {
      return 'reject'; // "ok, cancel" or "yes, no" → reject
    }
    
    if (hasNeutralInRest || hasUncertainPhrase || hasNeutralPhrase) {
      return 'unknown'; // "ok, maybe later" or "ok no worries" → unknown
    }
    
    return 'confirm'; // "ok thanks" → confirm
  }
  
  return 'unknown';
}

/**
 * Check if message is an explicit confirmation
 * Examples: "yes", "yes please", "ok thanks", "sure, go ahead"
 */
function isConfirmation(text: string): boolean {
  return parseConfirmationIntent(text) === 'confirm';
}

/**
 * Check if message is an explicit rejection
 * Examples: "no", "no thanks", "nah not now", "cancel please"
 */
function isRejection(text: string): boolean {
  return parseConfirmationIntent(text) === 'reject';
}

export async function processMessage(messageText: string, identifier: string, platform: 'whatsapp' | 'telegram' = 'whatsapp') {
  // Check if user is responding to a confirmation request
  const pendingConfirmation = await storage.getPendingConfirmation(identifier);
  if (pendingConfirmation && isConfirmation(messageText)) {
    // Execute the pending action
    const confirmData: PendingConfirmationData = {
      action: pendingConfirmation.action,
      data: pendingConfirmation.data,
      messageText: pendingConfirmation.messageText
    };
    const result = await executePendingAction(identifier, confirmData, platform);
    await storage.deletePendingConfirmation(identifier);
    return result;
  } else if (pendingConfirmation && isRejection(messageText)) {
    await storage.deletePendingConfirmation(identifier);
    return "No problem! Let me know if you need anything else.";
  }

  // Get assistant settings for AI context
  const settings = await storage.getSettings();
  
  // Get conversation history
  const conversationHistory = await storage.getMessagesByPhone(identifier, 10);

  // Build AI system prompt
  const assistantInfo = settings ? `
Your name: ${settings.assistantName}
User name: ${settings.userName || 'the user'}
User timezone: ${settings.timezone}
Working hours: ${settings.workingHours}
Default meeting duration: ${settings.defaultMeetingDuration} minutes
${settings.preferences ? `Additional preferences: ${settings.preferences}` : ''}
  `.trim() : 'Settings not configured yet.';

  const platformName = platform === 'telegram' ? 'Telegram' : 'WhatsApp';
  const systemPrompt = `You are ${settings?.assistantName || 'Aura'}, a helpful and friendly personal assistant managing ${settings?.userName || 'the user'}'s calendar via ${platformName}. 

Your capabilities:
- View full schedule/calendar for any day
- Check calendar availability
- Find free time slots
- Book appointments/meetings
- Reschedule appointments
- Cancel appointments
- Check emails and extract meeting requests
- Send emails on behalf of the user
- Search emails by keywords or sender
- Summarize unread emails by priority
- Quick Notes: Instantly save thoughts, ideas, tasks with auto-categorization and optional Notion sync

Important rules:
1. ALWAYS ask for confirmation before booking, canceling, or rescheduling appointments
2. Be conversational and friendly, but professional
3. When suggesting time slots, provide 2-3 options
4. Consider the user's working hours when suggesting times
5. Be concise - messages should be short and clear
6. TIME EXTRACTION: When user says "cancel X and book Y at the same time" or similar, ALWAYS use search_events first to find event X, extract its exact start/end times, then use those EXACT times for booking event Y. Never use default times when replacing events.
7. BOOK vs RESCHEDULE: "Cancel X and book Y" = TWO separate actions (cancel X, then request_book_appointment for Y). "Reschedule X to [new time]" = ONE action (request_reschedule_appointment). NEVER reschedule when user wants to cancel one event and create a different event.
8. CRITICAL - EVENT ID REQUIREMENT: Before calling request_cancel_appointment or request_reschedule_appointment, you MUST first call search_events to find the event and get its ID. NEVER use placeholder values like "event_id_placeholder". You MUST use the actual "id" field from the search_events result. If search returns no events, tell the user the event wasn't found.

${assistantInfo}

Current date/time: ${new Date().toLocaleString('en-US', { timeZone: settings?.timezone || 'Asia/Dubai' })}`;

  // Prepare conversation messages for AI
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.reverse().map(msg => ({
      role: (msg.sender === "user" ? "user" : "assistant") as "user" | "assistant",
      content: msg.messageContent,
    })),
    { role: "user", content: messageText },
  ];

  // Define tools for calendar operations
  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "get_schedule",
        description: "Get a list of all scheduled appointments/events for a specific day or date range. Use this when the user asks 'what's my schedule', 'show me my calendar', 'what do I have today/tomorrow', etc.",
        parameters: {
          type: "object",
          properties: {
            startDate: {
              type: "string",
              description: "Start date/time in ISO format (e.g., 2025-10-20T00:00:00)",
            },
            endDate: {
              type: "string",
              description: "End date/time in ISO format (e.g., 2025-10-20T23:59:59)",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_availability",
        description: "Check if a specific time slot is free on the calendar",
        parameters: {
          type: "object",
          properties: {
            startTime: {
              type: "string",
              description: "Start time in ISO format (e.g., 2025-10-20T14:00:00)",
            },
            endTime: {
              type: "string",
              description: "End time in ISO format",
            },
          },
          required: ["startTime", "endTime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "find_free_slots",
        description: "Find available time slots within a date range",
        parameters: {
          type: "object",
          properties: {
            startDate: {
              type: "string",
              description: "Start date in ISO format",
            },
            endDate: {
              type: "string",
              description: "End date in ISO format",
            },
            durationMinutes: {
              type: "number",
              description: "Duration of the meeting in minutes (default 60)",
            },
          },
          required: ["startDate", "endDate"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_events",
        description: "Search for events on the calendar by title, description, or keywords. Use this to find specific events like 'gym', 'meeting with Warren', etc.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'gym', 'meeting', 'lunch')",
            },
            startDate: {
              type: "string",
              description: "Optional: limit search to events after this date (ISO format)",
            },
            endDate: {
              type: "string",
              description: "Optional: limit search to events before this date (ISO format)",
            },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "request_book_appointment",
        description: "Request to book a new appointment (requires user confirmation). Can include attendee emails to send calendar invites, set up recurring events, and configure reminders.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title/summary of the appointment",
            },
            startTime: {
              type: "string",
              description: "Start time in ISO format",
            },
            endTime: {
              type: "string",
              description: "End time in ISO format",
            },
            description: {
              type: "string",
              description: "Additional details or notes",
            },
            attendeeEmails: {
              type: "array",
              items: { type: "string" },
              description: "Email addresses of attendees to invite (optional)",
            },
            recurrenceRule: {
              type: "string",
              description: "RFC5545 RRULE format for recurring events (optional). Examples: 'FREQ=DAILY;COUNT=10' for 10 days, 'FREQ=WEEKLY;BYDAY=MO,WE,FR' for Mon/Wed/Fri weekly, 'FREQ=MONTHLY;BYMONTHDAY=15' for 15th of each month, 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1' for yearly on Jan 1st",
            },
            reminders: {
              type: "object",
              description: "Custom reminder settings (optional)",
              properties: {
                useDefault: {
                  type: "boolean",
                  description: "Use default calendar reminders (true) or custom reminders (false)",
                },
                overrides: {
                  type: "array",
                  description: "Custom reminder overrides (max 5)",
                  items: {
                    type: "object",
                    properties: {
                      method: {
                        type: "string",
                        enum: ["email", "popup"],
                        description: "Reminder delivery method",
                      },
                      minutes: {
                        type: "number",
                        description: "Minutes before event to send reminder (0-40320, which is 4 weeks)",
                      },
                    },
                    required: ["method", "minutes"],
                  },
                },
              },
            },
          },
          required: ["title", "startTime", "endTime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_focus_time",
        description: "Block time for focused deep work. This creates a 'busy' calendar block that prevents scheduling conflicts and shows you're unavailable. Perfect for protecting time for important tasks.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title for the focus block (e.g., 'Deep Work', 'Focus Time', 'Writing Session')",
            },
            startTime: {
              type: "string",
              description: "Start time in ISO format",
            },
            endTime: {
              type: "string",
              description: "End time in ISO format",
            },
            description: {
              type: "string",
              description: "Optional description of what you'll be working on",
            },
          },
          required: ["title", "startTime", "endTime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "request_cancel_appointment",
        description: "Request to cancel an existing appointment (requires user confirmation). Provide the event ID from search_events.",
        parameters: {
          type: "object",
          properties: {
            eventId: {
              type: "string",
              description: "Google Calendar event ID",
            },
            eventTitle: {
              type: "string",
              description: "Title of the event to cancel (for confirmation message)",
            },
            eventTime: {
              type: "string",
              description: "Start time of the event (for confirmation message)",
            },
          },
          required: ["eventId", "eventTitle", "eventTime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "request_reschedule_appointment",
        description: "Request to reschedule an existing appointment (requires user confirmation). Can also add attendees when rescheduling.",
        parameters: {
          type: "object",
          properties: {
            eventId: {
              type: "string",
              description: "Google Calendar event ID",
            },
            eventTitle: {
              type: "string",
              description: "Current title of the event",
            },
            newStartTime: {
              type: "string",
              description: "New start time in ISO format",
            },
            newEndTime: {
              type: "string",
              description: "New end time in ISO format",
            },
            attendeeEmails: {
              type: "array",
              items: { type: "string" },
              description: "Email addresses of attendees to invite (optional)",
            },
          },
          required: ["eventId", "eventTitle", "newStartTime", "newEndTime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_emails",
        description: "Check emails in inbox. Can filter by unread status or search by keywords. Returns recent emails with sender, subject, snippet.",
        parameters: {
          type: "object",
          properties: {
            maxResults: {
              type: "number",
              description: "Maximum number of emails to return (default 10, max 50)",
            },
            unreadOnly: {
              type: "boolean",
              description: "Only return unread emails (default false)",
            },
            searchQuery: {
              type: "string",
              description: "Optional Gmail search query (e.g., 'from:sarah@example.com', 'subject:meeting', 'is:unread')",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "send_email",
        description: "Send an email to someone (requires user confirmation)",
        parameters: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description: "Recipient email address",
            },
            subject: {
              type: "string",
              description: "Email subject line",
            },
            body: {
              type: "string",
              description: "Email body content",
            },
          },
          required: ["to", "subject", "body"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "analyze_email_for_meeting_request",
        description: "Analyze an email to extract meeting request details like proposed times, attendees, and subject",
        parameters: {
          type: "object",
          properties: {
            emailId: {
              type: "string",
              description: "Gmail message ID to analyze",
            },
          },
          required: ["emailId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_notion",
        description: "Search across all Notion pages and databases for specific content. Use this to find notes, tasks, or any information stored in Notion.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'project planning', 'meeting notes', 'quarterly goals')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default 10, max 50)",
            },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_notion_note",
        description: "Create a new note/page in Notion. If no parent page is specified, it will be created at the workspace root or under the user's default parent page.",
        parameters: {
          type: "object",
          properties: {
            parentId: {
              type: "string",
              description: "Optional: Parent page ID where this note should be created. If not provided, uses the default parent page from settings or creates at workspace root.",
            },
            title: {
              type: "string",
              description: "Title of the note",
            },
            content: {
              type: "string",
              description: "Content/body of the note",
            },
          },
          required: ["title"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "query_notion_database",
        description: "Query a Notion database to get entries/tasks. Use this to show pending tasks, filter by status, etc.",
        parameters: {
          type: "object",
          properties: {
            databaseId: {
              type: "string",
              description: "Notion database ID",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default 10)",
            },
          },
          required: ["databaseId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_notion_database_entry",
        description: "Create a new entry in a Notion database (e.g., add a task, create a project entry)",
        parameters: {
          type: "object",
          properties: {
            databaseId: {
              type: "string",
              description: "Notion database ID",
            },
            title: {
              type: "string",
              description: "Title/name for the entry",
            },
            properties: {
              type: "object",
              description: "Additional properties for the database entry (status, tags, dates, etc.)",
            },
          },
          required: ["databaseId", "title"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_notion_page",
        description: "Update an existing Notion page (change properties, archive it, etc.)",
        parameters: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "Notion page ID to update",
            },
            properties: {
              type: "object",
              description: "Properties to update",
            },
            archived: {
              type: "boolean",
              description: "Whether to archive the page",
            },
          },
          required: ["pageId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "set_default_notion_parent",
        description: "Set the default parent page for new Notion notes. This allows creating notes without specifying a parent each time.",
        parameters: {
          type: "object",
          properties: {
            parentId: {
              type: "string",
              description: "Notion page ID to use as the default parent for new notes",
            },
          },
          required: ["parentId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "quick_note",
        description: "Instantly capture a quick note with automatic categorization. Use this when the user wants to save a thought, idea, task, or reminder. AI will automatically categorize it (work/personal/ideas/follow-ups), detect priority, generate tags, and optionally link to recent calendar events or sync to Notion.",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The note content - can be a task, idea, meeting note, or general thought",
            },
            noteType: {
              type: "string",
              enum: ["task", "idea", "meeting_note", "general"],
              description: "Type of note (optional - AI will auto-detect if not specified)",
            },
            category: {
              type: "string",
              enum: ["work", "personal", "ideas", "follow_ups"],
              description: "Category of note (optional - AI will auto-detect if not specified)",
            },
            priority: {
              type: "string",
              enum: ["high", "normal", "low"],
              description: "Priority level (optional - AI will auto-detect if not specified)",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Optional tags for the note",
            },
            syncToNotion: {
              type: "boolean",
              description: "Whether to automatically create this note in Notion (default true)",
            },
          },
          required: ["content"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "view_notes",
        description: "View saved quick notes. Can filter by category (work/personal/ideas/follow_ups) or note type (task/idea/meeting_note/general).",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["work", "personal", "ideas", "follow_ups"],
              description: "Optional: Filter notes by category",
            },
            noteType: {
              type: "string",
              enum: ["task", "idea", "meeting_note", "general"],
              description: "Optional: Filter notes by type",
            },
            limit: {
              type: "number",
              description: "Maximum number of notes to return (default 20)",
            },
          },
        },
      },
    },
  ];

  // Multi-turn tool calling loop - allows AI to use search results for follow-up actions
  let conversationMessages = [...messages];
  let finalResponse = "";
  const maxTurns = 5; // Prevent infinite loops
  
  for (let turn = 0; turn < maxTurns; turn++) {
    // Use integrated AI completion with context, fallback, and tracking
    const completion = await aiCompletionWithTracking(
      identifier,
      conversationMessages,
      tools,
      messageText,
      "complex" // Main message handling is complex
    );

    const choice = completion.choices[0];
    
    if (!choice || !choice.message) {
      throw new Error("No response from AI");
    }

    // If no tool calls, we have our final response
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      finalResponse = choice.message.content || "I'm here to help! How can I assist you today?";
      break;
    }

    // Add assistant message with tool calls to conversation
    conversationMessages.push(choice.message);

    // Process each tool call and collect results for next turn
    const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
    
    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.type !== 'function') continue;
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      let toolResult = "";

      try {
        switch (functionName) {
          case "get_schedule":
            const events = await calendar.listEvents(
              new Date(args.startDate),
              new Date(args.endDate),
              50
            );

            // Log view schedule action
            await logViewSchedule(identifier);

            if (events.length === 0) {
              toolResult = `Calendar is clear - no scheduled appointments.`;
            } else {
              toolResult = JSON.stringify(events.map((e: any) => ({
                title: e.summary,
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                id: e.id
              })));
            }
            break;

          case "check_availability":
            const isAvailable = await calendar.checkAvailability(
              new Date(args.startTime),
              new Date(args.endTime)
            );
            toolResult = isAvailable ? "Time slot is available" : "Time slot is NOT available - conflict exists";
            break;

          case "find_free_slots":
            const freeSlots = await calendar.findFreeSlots(
              new Date(args.startDate),
              new Date(args.endDate),
              args.durationMinutes || 60
            );
            toolResult = freeSlots.length === 0 ? "No free slots found" : JSON.stringify(freeSlots.slice(0, 5));
            break;

          case "search_events":
            const searchResults = await calendar.searchEvents(
              args.query,
              args.startDate ? new Date(args.startDate) : undefined,
              args.endDate ? new Date(args.endDate) : undefined
            );
            
            if (searchResults.length === 0) {
              toolResult = `No events found matching "${args.query}"`;
            } else {
              toolResult = JSON.stringify(searchResults.map((e: any) => ({
                title: e.summary,
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                id: e.id,
                description: e.description,
                attendees: e.attendees?.map((a: any) => a.email) || [],
                meetLink: e.hangoutLink,
                location: e.location,
                recurring: !!e.recurrence
              })));
            }
            break;

          case "create_focus_time":
            const focusEvent = await calendar.createFocusTimeBlock(
              args.title,
              new Date(args.startTime),
              new Date(args.endTime),
              args.description
            );
            
            toolResult = `Focus time block created: "${args.title}" from ${new Date(args.startTime).toLocaleTimeString()} to ${new Date(args.endTime).toLocaleTimeString()}`;
            finalResponse = `Focus time blocked! I've set aside "${args.title}" on your calendar.\n\nThis time is marked as busy and will automatically decline any meeting invitations during this period. Perfect for deep work!`;
            break;

          case "request_book_appointment":
            let bookMessage = `I'll book "${args.title}" for ${new Date(args.startTime).toLocaleString('en-US', {
              timeZone: settings?.timezone || 'Asia/Dubai',
              dateStyle: 'medium',
              timeStyle: 'short'
            })}`;

            if (args.recurrenceRule) {
              const freq = args.recurrenceRule.match(/FREQ=([A-Z]+)/)?.[1] || 'recurring';
              bookMessage += ` (${freq.toLowerCase()} recurring)`;
            }

            if (args.attendeeEmails && args.attendeeEmails.length > 0) {
              bookMessage += ` and send invites to ${args.attendeeEmails.join(', ')}`;
            }

            if (args.reminders && args.reminders.overrides && args.reminders.overrides.length > 0) {
              const reminderDesc = args.reminders.overrides.map((r: any) => {
                const time = r.minutes >= 1440 ? `${Math.round(r.minutes / 1440)} day(s)` : `${r.minutes} min`;
                return `${r.method} ${time} before`;
              }).join(', ');
              bookMessage += ` with reminders: ${reminderDesc}`;
            }
            
            bookMessage += '. Confirm?';

            // Store in database with 5-minute TTL
            await storage.createPendingConfirmation({
              chatId: identifier,
              action: 'book',
              data: args,
              messageText: bookMessage,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
            });

            toolResult = "PENDING_CONFIRMATION";
            finalResponse = bookMessage;
            break;

          case "request_cancel_appointment":
            // Validate event ID
            if (!args.eventId || args.eventId.includes('placeholder') || args.eventId.length < 10) {
              toolResult = "ERROR: Invalid or missing event ID. You must use search_events first to get the actual event ID.";
              break;
            }

            const cancelMessage = `I'll cancel "${args.eventTitle}" scheduled for ${new Date(args.eventTime).toLocaleString('en-US', {
              timeZone: settings?.timezone || 'Asia/Dubai',
              dateStyle: 'medium',
              timeStyle: 'short'
            })}. Confirm?`;

            // Store in database with 5-minute TTL
            await storage.createPendingConfirmation({
              chatId: identifier,
              action: 'cancel',
              data: args,
              messageText: cancelMessage,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
            });

            toolResult = "PENDING_CONFIRMATION";
            finalResponse = cancelMessage;
            break;

          case "request_reschedule_appointment":
            // Validate event ID
            if (!args.eventId || args.eventId.includes('placeholder') || args.eventId.length < 10) {
              toolResult = "ERROR: Invalid or missing event ID. You must use search_events first to get the actual event ID.";
              break;
            }

            let rescheduleMessage = `I'll reschedule "${args.eventTitle}" to ${new Date(args.newStartTime).toLocaleString('en-US', {
              timeZone: settings?.timezone || 'Asia/Dubai',
              dateStyle: 'medium',
              timeStyle: 'short'
            })}`;

            if (args.attendeeEmails && args.attendeeEmails.length > 0) {
              rescheduleMessage += ` and send invites to ${args.attendeeEmails.join(', ')}`;
            }
            rescheduleMessage += '. Confirm?';

            // Store in database with 5-minute TTL
            await storage.createPendingConfirmation({
              chatId: identifier,
              action: 'reschedule',
              data: args,
              messageText: rescheduleMessage,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
            });

            toolResult = "PENDING_CONFIRMATION";
            finalResponse = rescheduleMessage;
            break;

          case "check_emails":
            const maxResults = Math.min(args.maxResults || 10, 50);
            let query = args.searchQuery || '';
            
            if (args.unreadOnly) {
              query = query ? `${query} is:unread` : 'is:unread';
            }
            
            const emails = await gmail.listMessages({
              maxResults,
              query: query || undefined,
            });
            
            if (emails.length === 0) {
              toolResult = "No emails found matching your criteria";
            } else {
              toolResult = JSON.stringify(emails.map(e => ({
                id: e.id,
                from: e.from,
                subject: e.subject,
                snippet: e.snippet,
                date: e.date,
                isUnread: e.isUnread,
              })));
            }
            break;

          case "send_email":
            const sendMessage = `I'll send an email to ${args.to} with subject "${args.subject}". Confirm?`;
            
            await storage.createPendingConfirmation({
              chatId: identifier,
              action: 'send_email',
              data: args,
              messageText: sendMessage,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });
            
            toolResult = "PENDING_CONFIRMATION";
            finalResponse = sendMessage;
            break;

          case "analyze_email_for_meeting_request":
            // Fetch the email
            const emailList = await gmail.listMessages({ maxResults: 1, query: `rfc822msgid:${args.emailId}` });
            if (emailList.length === 0) {
              toolResult = "Email not found";
              break;
            }
            
            const email = emailList[0];
            
            // Use OpenAI to extract meeting details from email body
            const analysisPrompt = `Analyze this email and extract any meeting request details:

From: ${email.from}
Subject: ${email.subject}
Body: ${email.body.substring(0, 2000)}

Extract the following if present:
1. Proposed meeting times (as specific dates/times)
2. Meeting subject/purpose
3. List of attendees mentioned
4. Any other relevant details

Return as JSON with keys: hasMeetingRequest (boolean), proposedTimes (array of strings), subject (string), attendees (array of strings), notes (string)`;

            // Use integrated AI with fallback for email analysis (simpler task)
            const analysisResponse = await aiCompletionWithTracking(
              identifier,
              [{ role: "user", content: analysisPrompt }],
              undefined,
              `Analyze email ${args.emailId}`,
              "simple" // Email analysis is a simpler structured extraction task
            );
            
            const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');
            
            // Store summary in database
            await storage.createEmailSummary({
              chatId: identifier,
              gmailMessageId: email.id,
              from: email.from,
              subject: email.subject,
              summary: email.snippet,
              category: analysis.hasMeetingRequest ? 'action' : 'fyi',
              hasMeetingRequest: analysis.hasMeetingRequest || false,
              extractedMeetingDetails: analysis,
              receivedDate: email.date,
            });
            
            toolResult = JSON.stringify(analysis);
            break;

          case "search_notion":
            const notionSearchResults = await notion.searchNotion(args.query, args.limit || 10);
            
            if (notionSearchResults.length === 0) {
              toolResult = "No Notion pages found matching your search";
            } else {
              toolResult = JSON.stringify(notionSearchResults.map((result: any) => ({
                id: result.id,
                title: result.properties?.title?.title?.[0]?.plain_text || 'Untitled',
                type: result.object,
                url: result.url,
                lastEdited: result.last_edited_time,
              })));
            }
            
            await storage.createNotionOperation({
              chatId: identifier,
              operation: 'search',
              success: true,
              metadata: { query: args.query, resultsCount: notionSearchResults.length },
            });
            break;

          case "create_notion_note":
            const parentId = args.parentId || settings?.defaultNotionParentId;
            
            if (!parentId) {
              toolResult = "ERROR: No parent page specified and no default parent page set. Please either:\n1. Specify a parent page ID, or\n2. Set a default parent page by telling me 'Set my default Notion parent page to [page_id]'";
              break;
            }
            
            const createdPage = await notion.createNotionPage({
              parentId: parentId,
              title: args.title,
              content: args.content,
            });
            
            await storage.createNotionOperation({
              chatId: identifier,
              operation: 'create_page',
              notionObjectId: createdPage.id,
              notionObjectType: 'page',
              title: args.title,
              success: true,
            });
            
            toolResult = `Successfully created note "${args.title}" in Notion. Page ID: ${createdPage.id}`;
            break;

          case "query_notion_database":
            const dbEntries = await notion.queryDatabase({
              databaseId: args.databaseId,
              limit: args.limit || 10,
            });
            
            if (dbEntries.length === 0) {
              toolResult = "No entries found in this database";
            } else {
              toolResult = JSON.stringify(dbEntries.map((entry: any) => ({
                id: entry.id,
                properties: entry.properties,
                url: entry.url,
                createdTime: entry.created_time,
              })));
            }
            
            await storage.createNotionOperation({
              chatId: identifier,
              operation: 'query_database',
              notionObjectId: args.databaseId,
              notionObjectType: 'database',
              success: true,
              metadata: { resultsCount: dbEntries.length },
            });
            break;

          case "create_notion_database_entry":
            const entryProperties: any = {
              title: {
                title: [
                  {
                    text: {
                      content: args.title
                    }
                  }
                ]
              },
              ...args.properties,
            };
            
            const createdEntry = await notion.createDatabaseEntry({
              databaseId: args.databaseId,
              properties: entryProperties,
            });
            
            await storage.createNotionOperation({
              chatId: identifier,
              operation: 'create_entry',
              notionObjectId: createdEntry.id,
              notionObjectType: 'entry',
              title: args.title,
              success: true,
            });
            
            toolResult = `Successfully created entry "${args.title}" in database`;
            break;

          case "update_notion_page":
            const updatedPage = await notion.updateNotionPage({
              pageId: args.pageId,
              properties: args.properties,
              archived: args.archived,
            });
            
            await storage.createNotionOperation({
              chatId: identifier,
              operation: 'update_page',
              notionObjectId: args.pageId,
              notionObjectType: 'page',
              success: true,
              metadata: { archived: args.archived },
            });
            
            toolResult = `Successfully updated page ${args.pageId}`;
            break;

          case "set_default_notion_parent":
            await storage.updateSettings({
              defaultNotionParentId: args.parentId,
            });
            
            toolResult = `Successfully set default Notion parent page to ${args.parentId}. You can now create notes without specifying a parent page.`;
            break;

          case "view_notes":
            let notes;
            if (args.category) {
              notes = await storage.getQuickNotesByCategory(identifier, args.category, args.limit || 20);
            } else if (args.noteType) {
              notes = await storage.getQuickNotesByType(identifier, args.noteType, args.limit || 20);
            } else {
              notes = await storage.getQuickNotes(identifier, args.limit || 20);
            }

            if (notes.length === 0) {
              toolResult = `No notes found${args.category ? ` in category "${args.category}"` : ''}${args.noteType ? ` of type "${args.noteType}"` : ''}.`;
            } else {
              const notesText = notes.map((note, idx) => {
                const linkedEvent = note.linkedEventId ? ' 🔗' : '';
                const notionSync = note.notionPageId ? ' 📒' : '';
                const tagsDisplay = note.tags && note.tags.length > 0 ? note.tags.join(', ') : 'none';
                return `${idx + 1}. [${note.priority.toUpperCase()}] ${note.content}${linkedEvent}${notionSync}\n   📁 ${note.category} | 📝 ${note.noteType} | 🏷️ ${tagsDisplay}`;
              }).join('\n\n');
              
              toolResult = `📋 **Your Notes** (${notes.length})\n\n${notesText}`;
            }
            break;

          case "quick_note":
            // Auto-categorize using AI if not provided
            let noteType = args.noteType || "general";
            let category = args.category || "personal";
            let priority = args.priority || "normal";
            let tags = args.tags || [];

            // Use AI to auto-detect metadata if not provided
            if (!args.noteType || !args.category || !args.priority || tags.length === 0) {
              const categorizationPrompt = `Analyze this note and categorize it:
Note: "${args.content}"

Return JSON with:
- noteType: "task" | "idea" | "meeting_note" | "general"
- category: "work" | "personal" | "ideas" | "follow_ups"
- priority: "high" | "normal" | "low"
- tags: array of 2-5 relevant keywords
- suggestedNotionTitle: concise title (3-8 words)`;

              // Use integrated AI with fallback for note categorization (simple structured task)
              const categorizationResponse = await aiCompletionWithTracking(
                identifier,
                [{ role: "user", content: categorizationPrompt }],
                undefined,
                `Categorize note: ${args.content.substring(0, 50)}...`,
                "simple" // Note categorization is a simple structured extraction
              );

              const categorization = JSON.parse(categorizationResponse.choices[0]?.message?.content || "{}");
              noteType = args.noteType || categorization.noteType || "general";
              category = args.category || categorization.category || "personal";
              priority = args.priority || categorization.priority || "normal";
              tags = args.tags || categorization.tags || [];
            }

            // Check for calendar event linking - search for events in last 7 days
            let linkedEventId: string | null = null;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            try {
              const recentEvents = await calendar.searchEvents(
                args.content.substring(0, 100),
                sevenDaysAgo,
                new Date()
              );

              if (recentEvents && recentEvents.length > 0 && recentEvents[0].id) {
                linkedEventId = recentEvents[0].id;
              }
            } catch (error) {
              logger.error({ error }, "Failed to link note to calendar event");
            }

            // Create the quick note
            const quickNote = await storage.createQuickNote({
              chatId: identifier,
              noteType,
              category,
              priority,
              content: args.content,
              tags,
              linkedEventId,
              photoUrl: null,
              notionPageId: null,
            });

            // Sync to Notion if requested (default true)
            const shouldSyncToNotion = args.syncToNotion !== false;
            if (shouldSyncToNotion) {
              const parentId = settings?.defaultNotionParentId;
              
              if (parentId) {
                try {
                  const notionPage = await notion.createNotionPage({
                    parentId,
                    title: `Quick Note: ${args.content.substring(0, 50)}${args.content.length > 50 ? '...' : ''}`,
                    content: `${args.content}\n\n---\n**Type:** ${noteType}\n**Category:** ${category}\n**Priority:** ${priority}\n**Tags:** ${tags.join(', ')}`,
                  });

                  // Update quick note with Notion page ID
                  await storage.updateQuickNote(quickNote.id, {
                    notionPageId: notionPage.id,
                  });

                  await storage.createNotionOperation({
                    chatId: identifier,
                    operation: 'create_page',
                    notionObjectId: notionPage.id,
                    notionObjectType: 'page',
                    title: `Quick Note`,
                    success: true,
                    metadata: { quickNoteId: quickNote.id },
                  });

                  const pageUrl = 'url' in notionPage ? notionPage.url : `Page created: ${notionPage.id}`;
                  toolResult = `✅ Quick note saved!\n\n📝 **Type:** ${noteType}\n📁 **Category:** ${category}\n⚡ **Priority:** ${priority}\n🏷️ **Tags:** ${tags.join(', ')}\n${linkedEventId ? `🔗 Linked to calendar event\n` : ''}📒 Synced to Notion: ${pageUrl}`;
                } catch (error) {
                  logger.error({ error }, "Failed to sync note to Notion");
                  toolResult = `✅ Quick note saved!\n\n📝 **Type:** ${noteType}\n📁 **Category:** ${category}\n⚡ **Priority:** ${priority}\n🏷️ **Tags:** ${tags.join(', ')}\n${linkedEventId ? `🔗 Linked to calendar event\n` : ''}\n⚠️ Note: Could not sync to Notion`;
                }
              } else {
                toolResult = `✅ Quick note saved!\n\n📝 **Type:** ${noteType}\n📁 **Category:** ${category}\n⚡ **Priority:** ${priority}\n🏷️ **Tags:** ${tags.join(', ')}\n${linkedEventId ? `🔗 Linked to calendar event\n` : ''}\n💡 Set a default Notion parent page to auto-sync notes`;
              }
            } else {
              toolResult = `✅ Quick note saved!\n\n📝 **Type:** ${noteType}\n📁 **Category:** ${category}\n⚡ **Priority:** ${priority}\n🏷️ **Tags:** ${tags.join(', ')}\n${linkedEventId ? `🔗 Linked to calendar event` : ''}`;
            }
            break;

          default:
            toolResult = `Unknown function: ${functionName}`;
        }
      } catch (error) {
        logger.error({ functionName, error, chatId: identifier }, `Error executing tool ${functionName}`);
        toolResult = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Add tool result to list
      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }

    // If we got a confirmation request, stop the loop and return immediately
    if (finalResponse) {
      break;
    }

    // Add tool results to conversation for next turn
    conversationMessages.push(...toolResults);
  }

  return finalResponse;
}

async function executePendingAction(identifier: string, confirmation: PendingConfirmationData, platform: 'whatsapp' | 'telegram' = 'whatsapp') {
  const { action, data } = confirmation;

  try {
    switch (action) {
      case 'book':
        // Saga Pattern: Create Calendar → Save to DB → Rollback Calendar if DB fails
        let createdEvent: any = null;
        
        try {
          // Step 1: Create Google Calendar event
          createdEvent = await calendar.createEvent(
            data.title,
            new Date(data.startTime),
            new Date(data.endTime),
            data.description,
            data.attendeeEmails,
            data.recurrenceRule,
            data.reminders
          );
          
          // Step 2: Store in database (may fail)
          await storage.createAppointment({
            phoneNumber: identifier,
            platform,
            contactName: data.contactName || null,
            appointmentTitle: data.title,
            appointmentDate: new Date(data.startTime),
            appointmentDuration: String(Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000)),
            status: "confirmed",
            googleEventId: createdEvent.id || null,
            notes: data.description || null,
            attendeeEmails: data.attendeeEmails || null,
            recurrenceRule: data.recurrenceRule || null,
            reminders: data.reminders || null,
          });

          // Both operations succeeded
          await logBooking(identifier, true, createdEvent.id || undefined, data.title);

          let bookSuccessMsg = `Booked! I've added "${data.title}" to your calendar`;
          
          // Add Google Meet link if available
          if (createdEvent.hangoutLink) {
            bookSuccessMsg += `\n\nMeet link: ${createdEvent.hangoutLink}`;
          }
          
          if (data.attendeeEmails && data.attendeeEmails.length > 0) {
            bookSuccessMsg += `\n\nInvitations sent to: ${data.attendeeEmails.join(', ')}`;
          }
          
          return bookSuccessMsg;
        } catch (dbError) {
          // Step 3: Rollback - Delete calendar event if database save failed
          if (createdEvent?.id) {
            logger.warn({ eventId: createdEvent.id, error: dbError }, "Database save failed, rolling back calendar event");
            try {
              await calendar.deleteEvent(createdEvent.id);
              logger.info({ eventId: createdEvent.id }, "Successfully rolled back calendar event");
            } catch (rollbackError) {
              logger.error({ eventId: createdEvent.id, error: rollbackError }, "Failed to rollback calendar event - orphaned event may exist");
            }
          }
          throw dbError; // Re-throw to be caught by outer catch
        }

      case 'cancel':
        // Saga Pattern (DB-first): Update DB → Delete from Calendar → Rollback DB if Calendar fails
        if (!data.eventId) {
          return "Cannot cancel: No event ID provided.";
        }

        let cancelledAppointment: any = null;
        
        try {
          // Step 1: Find appointment in database
          const appointment = await storage.getAppointmentByGoogleEventId(data.eventId);
          if (!appointment) {
            logger.warn({ eventId: data.eventId }, "No appointment found in DB, deleting calendar-only event");
            // Proceed with calendar deletion even if not in DB
            let verified = false; // Declare in outer scope for access in return statement
            try {
              await calendar.deleteEvent(data.eventId);
              logger.info({ eventId: data.eventId }, "Calendar deletion call completed, verifying with retry...");
              
              // CRITICAL: Verify deletion with retries for eventual consistency
              let lastError: any = null;
              const maxRetries = 5; // Extended from 3 to handle slower propagation
              
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (total ~31s)
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
                  await calendar.getEventById(data.eventId);
                  // Event still exists
                  logger.warn({ eventId: data.eventId, attempt, maxRetries }, "Event still exists after deletion, retrying...");
                  lastError = new Error("Event still exists");
                } catch (verifyError: any) {
                  // 404/410 = event is gone (success!)
                  if (verifyError?.code === 404 || verifyError?.code === 410 || verifyError?.message?.includes('404') || verifyError?.message?.includes('410')) {
                    logger.info({ eventId: data.eventId, attempt }, "✓ Verified: Event successfully deleted from Google Calendar");
                    verified = true;
                    break;
                  }
                  // Other errors during verification
                  logger.warn({ eventId: data.eventId, attempt, error: verifyError }, "Verification attempt failed");
                  lastError = verifyError;
                }
              }
              
              if (!verified) {
                logger.error({ eventId: data.eventId, lastError }, "WARNING: Could not verify deletion after retries - proceeding with uncertainty");
                // DON'T throw - deletion call succeeded, so likely just eventual consistency lag
                // User will be warned, but we don't rollback since the delete API call succeeded
              }
            } catch (deleteError: any) {
              // Treat 404/410 as success (idempotent delete)
              if (deleteError?.code === 404 || deleteError?.code === 410 || deleteError?.message?.includes('404') || deleteError?.message?.includes('410')) {
                logger.info({ eventId: data.eventId }, "Calendar event already deleted (404/410)");
              } else {
                logger.error({ eventId: data.eventId, error: deleteError }, "Calendar deletion failed");
                throw deleteError; // Re-throw non-idempotent errors
              }
            }
            await logCancellation(identifier, true, data.eventId, data.eventTitle);
            
            if (!verified) {
              return `⚠️ Cancellation initiated for "${data.eventTitle}". The delete request was sent to Google Calendar, but I couldn't immediately confirm it completed. Please check your calendar in a few moments to verify the event is gone.`;
            }
            return `✓ Cancelled! "${data.eventTitle}" has been removed from your calendar.`;
          }
          
          // Step 2: Mark as cancelled in database
          cancelledAppointment = await storage.cancelAppointment(appointment.id);
          
          // Step 3: Delete from Google Calendar (may fail)
          let verifiedDbTracked = false; // Declare in outer scope for access in return statement
          try {
            await calendar.deleteEvent(data.eventId);
            logger.info({ eventId: data.eventId }, "Calendar deletion call completed, verifying with retry...");
            
            // CRITICAL: Verify deletion with retries for eventual consistency
            let lastError: any = null;
            const maxRetries = 5; // Extended from 3 to handle slower propagation
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                // Exponential backoff: 1s, 2s, 4s, 8s, 16s (total ~31s)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
                await calendar.getEventById(data.eventId);
                // Event still exists
                logger.warn({ eventId: data.eventId, attempt, maxRetries }, "Event still exists after deletion, retrying...");
                lastError = new Error("Event still exists");
              } catch (verifyError: any) {
                // 404/410 = event is gone (success!)
                if (verifyError?.code === 404 || verifyError?.code === 410 || verifyError?.message?.includes('404') || verifyError?.message?.includes('410')) {
                  logger.info({ eventId: data.eventId, attempt }, "✓ Verified: Event successfully deleted from Google Calendar");
                  verifiedDbTracked = true;
                  break;
                }
                // Other errors during verification
                logger.warn({ eventId: data.eventId, attempt, error: verifyError }, "Verification attempt failed");
                lastError = verifyError;
              }
            }
            
            if (!verifiedDbTracked) {
              logger.error({ eventId: data.eventId, lastError }, "WARNING: Could not verify deletion after retries - proceeding with uncertainty");
              // DON'T throw - deletion call succeeded, so likely just eventual consistency lag
              // User will be warned, but we don't rollback since the delete API call succeeded
            }
          } catch (deleteError: any) {
            // Treat 404/410 as success (already deleted, idempotent)
            if (deleteError?.code === 404 || deleteError?.code === 410 || deleteError?.message?.includes('404') || deleteError?.message?.includes('410')) {
              logger.info({ eventId: data.eventId }, "Calendar event already deleted (404/410), keeping DB cancelled");
              // Don't rollback - event is gone, DB should remain cancelled
              await logCancellation(identifier, true, data.eventId, data.eventTitle);
              return `✓ Cancelled! "${data.eventTitle}" has been removed from your calendar.`;
            }
            // For other errors, proceed to rollback
            logger.error({ eventId: data.eventId, error: deleteError }, "Calendar deletion failed");
            throw deleteError;
          }

          // Both operations succeeded
          await logCancellation(identifier, true, data.eventId, data.eventTitle);
          
          if (!verifiedDbTracked) {
            return `⚠️ Cancellation initiated for "${data.eventTitle}". The delete request was sent to Google Calendar, but I couldn't immediately confirm it completed. Please check your calendar in a few moments to verify the event is gone.`;
          }
          return `✓ Cancelled! "${data.eventTitle}" has been removed from your calendar.`;
        } catch (calendarError) {
          // Step 4: Rollback - Restore DB status if calendar deletion failed with non-idempotent error
          if (cancelledAppointment) {
            logger.warn({ eventId: data.eventId, error: calendarError }, "Calendar deletion failed, rolling back database status");
            try {
              await storage.updateAppointment(cancelledAppointment.id, { status: 'confirmed' });
              logger.info({ appointmentId: cancelledAppointment.id }, "Successfully rolled back appointment status");
            } catch (rollbackError) {
              logger.error({ appointmentId: cancelledAppointment.id, error: rollbackError }, "Failed to rollback appointment status - database inconsistent");
            }
          }
          throw calendarError; // Re-throw to be caught by outer catch
        }

      case 'reschedule':
        // Saga Pattern (DB-first): Update DB → Update Calendar → Rollback DB if Calendar fails
        if (!data.eventId) {
          return "Cannot reschedule: No event ID provided.";
        }

        let oldAppointmentData: { date: Date; duration: number } | null = null;
        let rescheduleAppointment: any = null;
        
        try {
          // Step 1: Find appointment in database
          const appointment = await storage.getAppointmentByGoogleEventId(data.eventId);
          if (!appointment) {
            logger.warn({ eventId: data.eventId }, "No appointment found in DB, updating calendar-only event");
            // Proceed with calendar update even if not in DB
            await calendar.updateEvent(data.eventId, {
              startTime: new Date(data.newStartTime),
              endTime: new Date(data.newEndTime),
              attendeeEmails: data.attendeeEmails,
            });
            await logReschedule(identifier, true, data.eventId, data.eventTitle);
            
            const settings = await storage.getSettings();
            return `✓ Rescheduled! "${data.eventTitle}" has been moved to ${new Date(data.newStartTime).toLocaleString('en-US', {
              timeZone: settings?.timezone || 'Asia/Dubai',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}.`;
          }
          
          // Step 2: Save original appointment data for potential rollback
          oldAppointmentData = {
            date: appointment.appointmentDate!,
            duration: parseInt(appointment.appointmentDuration || "60", 10)
          };
          
          // Step 3: Update database
          rescheduleAppointment = await storage.updateAppointment(appointment.id, {
            appointmentDate: new Date(data.newStartTime),
            appointmentDuration: String(Math.round((new Date(data.newEndTime).getTime() - new Date(data.newStartTime).getTime()) / 60000)),
          });
          
          // Step 4: Update Google Calendar (may fail)
          await calendar.updateEvent(data.eventId, {
            startTime: new Date(data.newStartTime),
            endTime: new Date(data.newEndTime),
            attendeeEmails: data.attendeeEmails,
          });

          // Both operations succeeded
          await logReschedule(identifier, true, data.eventId, data.eventTitle);

          const settings = await storage.getSettings();
          let rescheduleSuccessMsg = `✓ Rescheduled! "${data.eventTitle}" has been moved to ${new Date(data.newStartTime).toLocaleString('en-US', {
            timeZone: settings?.timezone || 'Asia/Dubai',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}`;
          if (data.attendeeEmails && data.attendeeEmails.length > 0) {
            rescheduleSuccessMsg += ` and invites sent to the attendees`;
          }
          rescheduleSuccessMsg += '.';
          return rescheduleSuccessMsg;
        } catch (calendarError) {
          // Step 5: Rollback - Revert database to original values if calendar update failed
          if (rescheduleAppointment && oldAppointmentData) {
            logger.warn({ eventId: data.eventId, error: calendarError }, "Calendar update failed, rolling back database reschedule");
            try {
              await storage.updateAppointment(rescheduleAppointment.id, {
                appointmentDate: oldAppointmentData.date,
                appointmentDuration: String(oldAppointmentData.duration),
              });
              logger.info({ appointmentId: rescheduleAppointment.id }, "Successfully rolled back appointment reschedule");
            } catch (rollbackError) {
              logger.error({ appointmentId: rescheduleAppointment.id, error: rollbackError }, "Failed to rollback appointment reschedule - database inconsistent");
            }
          }
          throw calendarError; // Re-throw to be caught by outer catch
        }

      case 'send_email':
        const result = await gmail.sendEmail({
          to: data.to,
          subject: data.subject,
          body: data.body,
        });
        
        if (result.success) {
          return `Email sent successfully to ${data.to}!`;
        } else {
          throw new Error(result.error || 'Failed to send email');
        }

      default:
        return "I'm not sure what to do with that. Can you try again?";
    }
  } catch (error) {
    logger.error({ action: confirmation.action, chatId: identifier, error }, "Error executing pending action");

    // Log failed action
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (action === 'book') {
      await logBooking(identifier, false, undefined, data.title, errorMessage);
    } else if (action === 'cancel') {
      await logCancellation(identifier, false, data.eventId, data.eventTitle, errorMessage);
    } else if (action === 'reschedule') {
      await logReschedule(identifier, false, data.eventId, data.eventTitle, errorMessage);
    }

    return "Sorry, something went wrong. Please try again.";
  }
}
