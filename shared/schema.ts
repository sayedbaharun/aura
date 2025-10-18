import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// WhatsApp Messages Table
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(),
  messageContent: text("message_content").notNull(),
  sender: text("sender").notNull(), // 'user' or 'assistant'
  messageType: text("message_type").notNull(),
  aiResponse: text("ai_response"),
  processed: boolean("processed").default(false).notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  receivedAt: true,
});

export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

// Appointments Table
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(),
  contactName: text("contact_name"),
  appointmentDate: timestamp("appointment_date"),
  appointmentTitle: text("appointment_title"),
  appointmentDuration: text("appointment_duration").default("60"),
  status: text("status").default("pending").notNull(),
  googleEventId: text("google_event_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  assistantName: text("assistant_name").default("Sarah").notNull(),
  userName: text("user_name"),
  userEmail: text("user_email"),
  userPhone: text("user_phone"),
  workingHours: text("working_hours").default("9:00 AM - 6:00 PM, Monday - Friday"),
  defaultMeetingDuration: text("default_meeting_duration").default("60"),
  timezone: text("timezone").default("Asia/Dubai"),
  preferences: text("preferences"),
  whatsappWebhookUrl: text("whatsapp_webhook_url"),
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
