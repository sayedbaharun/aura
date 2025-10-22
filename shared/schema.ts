import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, uuid, jsonb, index, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Messages Table (supports both Telegram and WhatsApp)
export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    phoneNumber: text("phone_number").notNull(), // For WhatsApp: phone number, For Telegram: chat_id
    messageContent: text("message_content").notNull(),
    sender: text("sender").notNull(), // 'user' or 'assistant'
    messageType: text("message_type").notNull(),
    platform: text("platform").default("whatsapp").notNull(), // 'whatsapp' or 'telegram'
    aiResponse: text("ai_response"),
    processed: boolean("processed").default(false).notNull(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_messages_phone_number").on(table.phoneNumber),
    index("idx_messages_received_at").on(table.receivedAt),
    index("idx_messages_phone_received").on(table.phoneNumber, table.receivedAt),
  ],
);

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  receivedAt: true,
});

export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

// Appointments Table
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    phoneNumber: text("phone_number").notNull(), // For WhatsApp: phone number, For Telegram: chat_id
    platform: text("platform").default("whatsapp").notNull(), // 'whatsapp' or 'telegram'
    contactName: text("contact_name"),
    appointmentDate: timestamp("appointment_date"),
    appointmentTitle: text("appointment_title"),
    appointmentDuration: text("appointment_duration").default("60"),
    status: text("status").default("pending").notNull(),
    googleEventId: text("google_event_id"),
    notes: text("notes"),
    attendeeEmails: text("attendee_emails").array(), // Array of attendee email addresses
    recurrenceRule: text("recurrence_rule"), // RFC5545 RRULE format (e.g., "FREQ=DAILY;COUNT=10")
    reminders: jsonb("reminders"), // { useDefault: boolean, overrides: [{ method: 'email'|'popup', minutes: number }] }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_appointments_phone_number").on(table.phoneNumber),
    index("idx_appointments_google_event_id").on(table.googleEventId),
    index("idx_appointments_date").on(table.appointmentDate),
    index("idx_appointments_phone_date").on(table.phoneNumber, table.appointmentDate),
  ],
);

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Assistant Settings Table
export const assistantSettings = pgTable("assistant_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  assistantName: text("assistant_name").default("Aura").notNull(),
  userName: text("user_name"),
  userEmail: text("user_email"),
  userPhone: text("user_phone"),
  workingHours: text("working_hours").default("9:00 AM - 6:00 PM, Monday - Friday"),
  defaultMeetingDuration: text("default_meeting_duration").default("60"),
  timezone: text("timezone").default("Asia/Dubai"),
  preferences: text("preferences"),
  whatsappNumber: text("whatsapp_number"),
  whatsappWebhookUrl: text("whatsapp_webhook_url"),
  telegramBotUsername: text("telegram_bot_username"),
  telegramWebhookUrl: text("telegram_webhook_url"),
  defaultNotionParentId: text("default_notion_parent_id"), // Default parent page ID for new Notion notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAssistantSettingsSchema = createInsertSchema(assistantSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssistantSettings = z.infer<typeof insertAssistantSettingsSchema>;
export type AssistantSettings = typeof assistantSettings.$inferSelect;

// Pending Confirmations Table - For persistent confirmation state
export const pendingConfirmations = pgTable(
  "pending_confirmations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull().unique(), // Unique constraint to prevent duplicate pending confirmations per chat
    action: text("action").notNull(),
    data: jsonb("data").notNull(),
    messageText: text("message_text").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_pending_confirmations_expires_at").on(table.expiresAt),
  ],
);

export const insertPendingConfirmationSchema = createInsertSchema(pendingConfirmations).omit({
  id: true,
  createdAt: true,
});

export type InsertPendingConfirmation = z.infer<typeof insertPendingConfirmationSchema>;
export type PendingConfirmation = typeof pendingConfirmations.$inferSelect;

// Audit Logs Table
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull(),
    action: text("action").notNull(), // 'view_schedule', 'book', 'cancel', 'reschedule'
    eventId: text("event_id"),
    eventTitle: text("event_title"),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_chat_id").on(table.chatId),
    index("idx_audit_logs_timestamp").on(table.timestamp),
    index("idx_audit_logs_chat_timestamp").on(table.chatId, table.timestamp),
  ],
);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Event Attendees Table - Tracks attendee response status for notifications
export const eventAttendees = pgTable(
  "event_attendees",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    googleEventId: text("google_event_id").notNull(),
    attendeeEmail: text("attendee_email").notNull(),
    responseStatus: text("response_status").notNull(), // 'needsAction', 'accepted', 'declined', 'tentative'
    chatId: text("chat_id").notNull(), // To send notifications to the right user
    lastChecked: timestamp("last_checked").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_event_attendees_event_id").on(table.googleEventId),
    index("idx_event_attendees_chat_id").on(table.chatId),
    index("idx_event_attendees_event_email").on(table.googleEventId, table.attendeeEmail),
  ],
);

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  createdAt: true,
  lastChecked: true,
});

export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;

// Email Summaries Table - Cache AI-generated email summaries
export const emailSummaries = pgTable(
  "email_summaries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull(),
    gmailMessageId: text("gmail_message_id").notNull().unique(),
    from: text("from").notNull(),
    subject: text("subject").notNull(),
    summary: text("summary").notNull(),
    category: text("category").notNull(), // 'urgent', 'action', 'fyi', 'noise'
    hasMeetingRequest: boolean("has_meeting_request").default(false).notNull(),
    extractedMeetingDetails: jsonb("extracted_meeting_details"), // { proposedTimes: string[], attendees: string[], subject: string }
    receivedDate: timestamp("received_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_email_summaries_chat_id").on(table.chatId),
    index("idx_email_summaries_category").on(table.category),
    index("idx_email_summaries_received_date").on(table.receivedDate),
  ],
);

export const insertEmailSummarySchema = createInsertSchema(emailSummaries).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailSummary = z.infer<typeof insertEmailSummarySchema>;
export type EmailSummary = typeof emailSummaries.$inferSelect;

// Notion Operations Table - Track Notion actions for audit and debugging
export const notionOperations = pgTable(
  "notion_operations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull(),
    operation: text("operation").notNull(), // 'create_page', 'query_database', 'search', 'update_page', 'create_entry'
    notionObjectId: text("notion_object_id"), // Page ID or Database ID
    notionObjectType: text("notion_object_type"), // 'page', 'database', 'entry'
    title: text("title"),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"), // Additional operation details
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_notion_operations_chat_id").on(table.chatId),
    index("idx_notion_operations_timestamp").on(table.timestamp),
    index("idx_notion_operations_chat_timestamp").on(table.chatId, table.timestamp),
  ],
);

export const insertNotionOperationSchema = createInsertSchema(notionOperations).omit({
  id: true,
  timestamp: true,
});

export type InsertNotionOperation = z.infer<typeof insertNotionOperationSchema>;
export type NotionOperation = typeof notionOperations.$inferSelect;

// Quick Notes Table - For instant thought capture with AI categorization
export const quickNotes = pgTable(
  "quick_notes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull(),
    noteType: text("note_type").notNull(), // 'task', 'idea', 'meeting_note', 'general'
    category: text("category").notNull(), // 'work', 'personal', 'ideas', 'follow_ups'
    priority: text("priority").notNull().default("normal"), // 'high', 'normal', 'low'
    content: text("content").notNull(),
    photoUrl: text("photo_url"), // URL to stored photo in object storage
    linkedEventId: text("linked_event_id"), // Google Calendar event ID if auto-linked
    notionPageId: text("notion_page_id"), // Notion page ID if synced to Notion
    tags: text("tags").array().default(sql`ARRAY[]::text[]`), // AI-generated tags
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_quick_notes_chat_id").on(table.chatId),
    index("idx_quick_notes_note_type").on(table.noteType),
    index("idx_quick_notes_category").on(table.category),
    index("idx_quick_notes_created_at").on(table.createdAt),
    index("idx_quick_notes_chat_created").on(table.chatId, table.createdAt),
  ],
);

export const insertQuickNoteSchema = createInsertSchema(quickNotes).omit({
  id: true,
  createdAt: true,
});

export type InsertQuickNote = z.infer<typeof insertQuickNoteSchema>;
export type QuickNote = typeof quickNotes.$inferSelect;

// User Profile Table - Advanced context memory for learning user patterns
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull().unique(), // Unique per user
    
    // Learned Preferences
    preferredMeetingTimes: jsonb("preferred_meeting_times"), // { day: string, hour: number }[]
    preferredMeetingDuration: integer("preferred_meeting_duration"), // In minutes
    commonAttendees: text("common_attendees").array().default(sql`ARRAY[]::text[]`),
    frequentMeetingTypes: jsonb("frequent_meeting_types"), // { type: string, count: number }[]
    
    // Communication Patterns
    responseStyle: text("response_style"), // 'brief', 'detailed', 'conversational'
    preferredLanguage: text("preferred_language").default("en"),
    commonPhrases: text("common_phrases").array().default(sql`ARRAY[]::text[]`),
    
    // Work Patterns
    workingHours: jsonb("working_hours"), // { start: string, end: string, timezone: string }
    peakProductivityHours: jsonb("peak_productivity_hours"), // { start: number, end: number }[]
    focusTimePreferences: jsonb("focus_time_preferences"), // { frequency: string, duration: number }
    
    // Email & Note Patterns
    emailResponsePatterns: jsonb("email_response_patterns"), // { urgentKeywords: string[], actionKeywords: string[] }
    noteCategorization: jsonb("note_categorization"), // { commonTags: string[], categoryDistribution: object }
    
    // Metadata
    totalInteractions: integer("total_interactions").default(0).notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_profiles_chat_id").on(table.chatId),
    index("idx_user_profiles_last_updated").on(table.lastUpdated),
  ],
);

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Interaction History Table - Track all user actions for pattern analysis
export const interactionHistory = pgTable(
  "interaction_history",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull(),
    
    // Interaction Details
    interactionType: text("interaction_type").notNull(), // 'message', 'calendar_action', 'email_action', 'note_creation'
    action: text("action").notNull(), // 'book', 'cancel', 'reschedule', 'check_email', 'create_note', etc.
    userInput: text("user_input"), // Original user message
    aiResponse: text("ai_response"), // AI's response
    
    // Context Data
    metadata: jsonb("metadata"), // Additional data like event details, email info, etc.
    success: boolean("success").notNull(),
    
    // Timing
    timeOfDay: integer("time_of_day"), // Hour of day (0-23)
    dayOfWeek: integer("day_of_week"), // Day of week (0-6, 0=Sunday)
    
    // Model Information
    modelUsed: text("model_used"), // Which GPT model was used
    tokenCount: integer("token_count"), // Token usage for this interaction
    
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_interaction_history_chat_id").on(table.chatId),
    index("idx_interaction_history_timestamp").on(table.timestamp),
    index("idx_interaction_history_type").on(table.interactionType),
    index("idx_interaction_history_chat_timestamp").on(table.chatId, table.timestamp),
  ],
);

export const insertInteractionHistorySchema = createInsertSchema(interactionHistory).omit({
  id: true,
  timestamp: true,
});

export type InsertInteractionHistory = z.infer<typeof insertInteractionHistorySchema>;
export type InteractionHistory = typeof interactionHistory.$inferSelect;

// Proactive Suggestions Table - Track AI-generated suggestions and user responses
export const proactiveSuggestions = pgTable(
  "proactive_suggestions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    chatId: text("chat_id").notNull(),
    
    // Suggestion Details
    suggestionType: text("suggestion_type").notNull(), // 'briefing', 'conflict_alert', 'focus_time', 'follow_up', 'optimization'
    priority: text("priority").notNull().default("normal"), // 'high', 'normal', 'low'
    content: text("content").notNull(), // The suggestion message
    
    // Context
    trigger: text("trigger").notNull(), // What triggered this suggestion
    relatedEventId: text("related_event_id"), // Google Calendar event if relevant
    relatedNoteId: text("related_note_id"), // Quick note if relevant
    metadata: jsonb("metadata"), // Additional context
    
    // User Response
    status: text("status").default("pending").notNull(), // 'pending', 'accepted', 'dismissed', 'acted_upon'
    userResponse: text("user_response"), // User's reply or action
    respondedAt: timestamp("responded_at"),
    
    // Scheduling (for future suggestions)
    scheduledFor: timestamp("scheduled_for"), // When to send this suggestion
    sentAt: timestamp("sent_at"), // When it was actually sent
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_proactive_suggestions_chat_id").on(table.chatId),
    index("idx_proactive_suggestions_status").on(table.status),
    index("idx_proactive_suggestions_scheduled").on(table.scheduledFor),
    index("idx_proactive_suggestions_type").on(table.suggestionType),
    index("idx_proactive_suggestions_chat_created").on(table.chatId, table.createdAt),
  ],
);

export const insertProactiveSuggestionSchema = createInsertSchema(proactiveSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertProactiveSuggestion = z.infer<typeof insertProactiveSuggestionSchema>;
export type ProactiveSuggestion = typeof proactiveSuggestions.$inferSelect;
