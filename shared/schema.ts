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
    appointmentDuration: integer("appointment_duration").default(60),
    status: text("status").default("pending").notNull(),
    googleEventId: text("google_event_id"),
    notes: text("notes"),
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
  defaultMeetingDuration: integer("default_meeting_duration").default(60),
  timezone: text("timezone").default("Asia/Dubai"),
  preferences: text("preferences"),
  whatsappNumber: text("whatsapp_number"),
  whatsappWebhookUrl: text("whatsapp_webhook_url"),
  telegramBotUsername: text("telegram_bot_username"),
  telegramWebhookUrl: text("telegram_webhook_url"),
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
