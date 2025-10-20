import OpenAI from "openai";
import { storage } from "./storage";
import * as calendar from "./google-calendar";

// Initialize OpenAI with Replit AI Integrations credentials
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface PendingConfirmation {
  action: string;
  data: any;
  messageText: string;
}

export const pendingConfirmations: Map<string, PendingConfirmation> = new Map();

export async function processMessage(messageText: string, identifier: string, platform: 'whatsapp' | 'telegram' = 'whatsapp') {
  // Check if user is responding to a confirmation request
  const pendingConfirmation = pendingConfirmations.get(identifier);
  if (pendingConfirmation && (messageText.toLowerCase().includes('yes') || messageText.toLowerCase().includes('confirm'))) {
    // Execute the pending action
    const result = await executePendingAction(identifier, pendingConfirmation, platform);
    pendingConfirmations.delete(identifier);
    return result;
  } else if (pendingConfirmation && (messageText.toLowerCase().includes('no') || messageText.toLowerCase().includes('cancel'))) {
    pendingConfirmations.delete(identifier);
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

Important rules:
1. ALWAYS ask for confirmation before booking, canceling, or rescheduling appointments
2. Be conversational and friendly, but professional
3. When suggesting time slots, provide 2-3 options
4. Consider the user's working hours when suggesting times
5. Be concise - messages should be short and clear

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
        description: "Request to book a new appointment (requires user confirmation). Can include attendee emails to send calendar invites.",
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
        description: "Request to reschedule an existing appointment (requires user confirmation)",
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
          },
          required: ["eventId", "eventTitle", "newStartTime", "newEndTime"],
        },
      },
    },
  ];

  // Call OpenAI (Replit AI)
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
    temperature: 0.7,
  });

  const choice = completion.choices[0];
  
  if (!choice || !choice.message) {
    throw new Error("No response from AI");
  }

  let finalResponse = choice.message.content || "I'm here to help! How can I assist you today?";

  // Handle tool calls if present
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.type !== 'function') continue;
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      try {
        switch (functionName) {
          case "get_schedule":
            const events = await calendar.listEvents(
              new Date(args.startDate),
              new Date(args.endDate),
              50 // Get up to 50 events
            );
            
            if (events.length === 0) {
              finalResponse = `Your calendar is clear for that time! No scheduled appointments.`;
            } else {
              const eventList = events.map((event: any) => {
                const start = event.start?.dateTime || event.start?.date;
                const startTime = new Date(start).toLocaleString('en-US', { 
                  timeZone: settings?.timezone || 'Asia/Dubai',
                  month: 'short',
                  day: 'numeric',
                  hour: event.start?.dateTime ? 'numeric' : undefined,
                  minute: event.start?.dateTime ? '2-digit' : undefined,
                  hour12: true
                });
                return `• ${startTime} - ${event.summary || 'Untitled'}`;
              }).join('\n');
              
              const dateStr = new Date(args.startDate).toLocaleDateString('en-US', { 
                timeZone: settings?.timezone || 'Asia/Dubai',
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              });
              
              finalResponse = `Here's your schedule for ${dateStr}:\n\n${eventList}`;
            }
            break;

          case "check_availability":
            const isAvailable = await calendar.checkAvailability(
              new Date(args.startTime),
              new Date(args.endTime)
            );
            finalResponse = isAvailable 
              ? `Yes, you're free at that time! Would you like me to book something?`
              : `Sorry, you have a conflict at that time. Would you like me to suggest other times?`;
            break;

          case "find_free_slots":
            const freeSlots = await calendar.findFreeSlots(
              new Date(args.startDate),
              new Date(args.endDate),
              args.durationMinutes || 60
            );
            
            if (freeSlots.length === 0) {
              finalResponse = `I couldn't find any free slots in that time range. Try a different date?`;
            } else {
              const slotList = freeSlots.slice(0, 3).map(slot => 
                `${new Date(slot.start).toLocaleString('en-US', { 
                  timeZone: settings?.timezone || 'Asia/Dubai',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}`
              ).join(', ');
              finalResponse = `Here are some free slots: ${slotList}. Which one works for you?`;
            }
            break;

          case "search_events":
            const searchResults = await calendar.searchEvents(
              args.query,
              args.startDate ? new Date(args.startDate) : undefined,
              args.endDate ? new Date(args.endDate) : undefined
            );
            
            if (searchResults.length === 0) {
              finalResponse = `I couldn't find any events matching "${args.query}".`;
            } else {
              const resultList = searchResults.map((event: any) => {
                const start = event.start?.dateTime || event.start?.date;
                const startTime = new Date(start).toLocaleString('en-US', { 
                  timeZone: settings?.timezone || 'Asia/Dubai',
                  month: 'short',
                  day: 'numeric',
                  hour: event.start?.dateTime ? 'numeric' : undefined,
                  minute: event.start?.dateTime ? '2-digit' : undefined,
                  hour12: true
                });
                return `• ${startTime} - ${event.summary || 'Untitled'} (ID: ${event.id})`;
              }).join('\n');
              finalResponse = `Found ${searchResults.length} event(s):\n\n${resultList}`;
            }
            break;

          case "request_book_appointment":
            // Store pending confirmation with attendees
            let bookMessage = `I'll book "${args.title}" for ${new Date(args.startTime).toLocaleString('en-US', { 
              timeZone: settings?.timezone || 'Asia/Dubai',
              dateStyle: 'medium',
              timeStyle: 'short'
            })}`;
            
            if (args.attendeeEmails && args.attendeeEmails.length > 0) {
              bookMessage += ` and send invites to ${args.attendeeEmails.join(', ')}`;
            }
            bookMessage += '. Confirm?';
            
            pendingConfirmations.set(identifier, {
              action: 'book',
              data: args,
              messageText: bookMessage
            });
            
            finalResponse = bookMessage;
            break;

          case "request_cancel_appointment":
            const cancelMessage = `I'll cancel "${args.eventTitle}" scheduled for ${new Date(args.eventTime).toLocaleString('en-US', { 
              timeZone: settings?.timezone || 'Asia/Dubai',
              dateStyle: 'medium',
              timeStyle: 'short'
            })}. Confirm?`;
            
            pendingConfirmations.set(identifier, {
              action: 'cancel',
              data: args,
              messageText: cancelMessage
            });
            
            finalResponse = cancelMessage;
            break;

          case "request_reschedule_appointment":
            const rescheduleMessage = `I'll reschedule "${args.eventTitle}" to ${new Date(args.newStartTime).toLocaleString('en-US', { 
              timeZone: settings?.timezone || 'Asia/Dubai',
              dateStyle: 'medium',
              timeStyle: 'short'
            })}. Confirm?`;
            
            pendingConfirmations.set(identifier, {
              action: 'reschedule',
              data: args,
              messageText: rescheduleMessage
            });
            
            finalResponse = rescheduleMessage;
            break;
        }
      } catch (error) {
        console.error(`Error executing tool ${functionName}:`, error);
        finalResponse = `I had trouble processing that request. Could you try rephrasing?`;
      }
    }
  }

  return finalResponse;
}

async function executePendingAction(identifier: string, confirmation: PendingConfirmation, platform: 'whatsapp' | 'telegram' = 'whatsapp') {
  const { action, data } = confirmation;

  try {
    switch (action) {
      case 'book':
        const event = await calendar.createEvent(
          data.title,
          new Date(data.startTime),
          new Date(data.endTime),
          data.description,
          data.attendeeEmails // Pass attendee emails
        );
        
        // Store in database
        await storage.createAppointment({
          phoneNumber: identifier,
          platform,
          contactName: data.contactName || null,
          appointmentTitle: data.title,
          appointmentDate: new Date(data.startTime),
          appointmentDuration: String(Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000)),
          status: "confirmed",
          googleEventId: event.id || null,
          notes: data.description || null,
        });
        
        let bookSuccessMsg = `✓ Booked! I've added "${data.title}" to your calendar`;
        if (data.attendeeEmails && data.attendeeEmails.length > 0) {
          bookSuccessMsg += ` and sent invites to the attendees`;
        }
        bookSuccessMsg += '.';
        return bookSuccessMsg;

      case 'cancel':
        if (data.eventId) {
          await calendar.deleteEvent(data.eventId);
        }
        return `✓ Cancelled! "${data.eventTitle}" has been removed from your calendar.`;

      case 'reschedule':
        if (data.eventId) {
          await calendar.updateEvent(data.eventId, {
            startTime: new Date(data.newStartTime),
            endTime: new Date(data.newEndTime),
          });
        }
        return `✓ Rescheduled! "${data.eventTitle}" has been moved to ${new Date(data.newStartTime).toLocaleString('en-US', { 
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}.`;

      default:
        return "I'm not sure what to do with that. Can you try again?";
    }
  } catch (error) {
    console.error("Error executing action:", error);
    return "Sorry, something went wrong. Please try again.";
  }
}
