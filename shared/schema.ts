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
  patientName: text("patient_name"),
  appointmentDate: timestamp("appointment_date"),
  appointmentType: text("appointment_type"),
  status: text("status").default("pending").notNull(),
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

// Clinic Settings Table
export const clinicSettings = pgTable("clinic_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicName: text("clinic_name").default("Our Dental Clinic").notNull(),
  clinicAddress: text("clinic_address"),
  clinicPhone: text("clinic_phone"),
  clinicEmail: text("clinic_email"),
  workingHours: text("working_hours"),
  services: text("services").array(),
  aboutClinic: text("about_clinic"),
  whatsappWebhookUrl: text("whatsapp_webhook_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClinicSettingsSchema = createInsertSchema(clinicSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClinicSettings = z.infer<typeof insertClinicSettingsSchema>;
export type ClinicSettings = typeof clinicSettings.$inferSelect;
