import {
  type WhatsappMessage,
  type InsertWhatsappMessage,
  type Appointment,
  type InsertAppointment,
  type AssistantSettings,
  type InsertAssistantSettings,
  type User,
  type UpsertUser,
  type PendingConfirmation,
  type InsertPendingConfirmation,
  type EventAttendee,
  type InsertEventAttendee,
  whatsappMessages,
  appointments,
  assistantSettings,
  users,
  pendingConfirmations,
  eventAttendees
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, lt, and } from "drizzle-orm";
import { db as database } from "../db";

// Singleton ID for assistant settings - ensures only one settings row exists
const SETTINGS_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // WhatsApp Messages
  getMessages(limit?: number): Promise<WhatsappMessage[]>;
  createMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  getMessagesByPhone(phoneNumber: string, limit?: number): Promise<WhatsappMessage[]>;

  // Appointments
  getAppointments(): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentByGoogleEventId(googleEventId: string): Promise<Appointment | undefined>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  cancelAppointment(id: string): Promise<Appointment | undefined>;

  // Assistant Settings
  getSettings(): Promise<AssistantSettings | undefined>;
  updateSettings(settings: Partial<InsertAssistantSettings>): Promise<AssistantSettings>;

  // Pending Confirmations
  getPendingConfirmation(chatId: string): Promise<PendingConfirmation | undefined>;
  createPendingConfirmation(confirmation: InsertPendingConfirmation): Promise<PendingConfirmation>;
  deletePendingConfirmation(chatId: string): Promise<void>;
  cleanupExpiredConfirmations(): Promise<number>;

  // Event Attendees
  getEventAttendee(googleEventId: string, attendeeEmail: string): Promise<EventAttendee | undefined>;
  createEventAttendee(attendee: InsertEventAttendee): Promise<EventAttendee>;
  updateEventAttendee(googleEventId: string, attendeeEmail: string, responseStatus: string): Promise<void>;
  getEventAttendees(googleEventId: string): Promise<EventAttendee[]>;
}

// PostgreSQL Storage Implementation
export class DBStorage implements IStorage {
  private db = database;

  constructor() {
    // Using shared database connection from db/index.ts
  }

  // User operations - Required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // WhatsApp Messages
  async getMessages(limit: number = 50): Promise<WhatsappMessage[]> {
    return await this.db
      .select()
      .from(whatsappMessages)
      .orderBy(desc(whatsappMessages.receivedAt))
      .limit(limit);
  }

  async createMessage(insertMessage: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [message] = await this.db
      .insert(whatsappMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesByPhone(phoneNumber: string, limit: number = 20): Promise<WhatsappMessage[]> {
    return await this.db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.phoneNumber, phoneNumber))
      .orderBy(desc(whatsappMessages.receivedAt))
      .limit(limit);
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return await this.db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.appointmentDate));
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await this.db
      .insert(appointments)
      .values(insertAppointment)
      .returning();
    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    return appointment;
  }

  async getAppointmentByGoogleEventId(googleEventId: string): Promise<Appointment | undefined> {
    const [appointment] = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.googleEventId, googleEventId))
      .limit(1);
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await this.db
      .update(appointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async cancelAppointment(id: string): Promise<Appointment | undefined> {
    return this.updateAppointment(id, { status: 'cancelled' });
  }

  // Assistant Settings (Singleton pattern)
  async getSettings(): Promise<AssistantSettings | undefined> {
    // Try to get settings by singleton ID
    let [settings] = await this.db
      .select()
      .from(assistantSettings)
      .where(eq(assistantSettings.id, SETTINGS_SINGLETON_ID))
      .limit(1);
    
    // Initialize default settings if none exist using the singleton ID
    // Use ON CONFLICT DO NOTHING to handle concurrent initialization safely
    if (!settings) {
      await this.db
        .insert(assistantSettings)
        .values({
          id: SETTINGS_SINGLETON_ID,
          assistantName: "Aura",
          workingHours: "9:00 AM - 6:00 PM, Monday - Friday",
          defaultMeetingDuration: "60",
          timezone: "Asia/Dubai",
        })
        .onConflictDoNothing();
      
      // Re-select to get the row (either our insert or concurrent winner)
      [settings] = await this.db
        .select()
        .from(assistantSettings)
        .where(eq(assistantSettings.id, SETTINGS_SINGLETON_ID))
        .limit(1);
    }
    
    return settings;
  }

  async updateSettings(updates: Partial<InsertAssistantSettings>): Promise<AssistantSettings> {
    // Filter out undefined values to prevent setting columns to NULL
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    ) as Partial<InsertAssistantSettings>;
    
    // Use upsert with singleton ID to prevent multiple settings rows
    const [updated] = await this.db
      .insert(assistantSettings)
      .values({
        id: SETTINGS_SINGLETON_ID,
        assistantName: "Aura",
        workingHours: "9:00 AM - 6:00 PM, Monday - Friday",
        defaultMeetingDuration: "60",
        timezone: "Asia/Dubai",
        ...cleanUpdates,
      })
      .onConflictDoUpdate({
        target: assistantSettings.id,
        set: {
          ...cleanUpdates,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return updated;
  }

  // Pending Confirmations
  async getPendingConfirmation(chatId: string): Promise<PendingConfirmation | undefined> {
    const [confirmation] = await this.db
      .select()
      .from(pendingConfirmations)
      .where(eq(pendingConfirmations.chatId, chatId))
      .limit(1);

    // Check if expired
    if (confirmation && new Date(confirmation.expiresAt) < new Date()) {
      await this.deletePendingConfirmation(chatId);
      return undefined;
    }

    return confirmation;
  }

  async createPendingConfirmation(insertConfirmation: InsertPendingConfirmation): Promise<PendingConfirmation> {
    // Use upsert to atomically replace existing confirmation (prevents race conditions)
    const [confirmation] = await this.db
      .insert(pendingConfirmations)
      .values(insertConfirmation)
      .onConflictDoUpdate({
        target: pendingConfirmations.chatId,
        set: {
          action: insertConfirmation.action,
          data: insertConfirmation.data,
          messageText: insertConfirmation.messageText,
          expiresAt: insertConfirmation.expiresAt,
        }
      })
      .returning();
    return confirmation;
  }

  async deletePendingConfirmation(chatId: string): Promise<void> {
    await this.db
      .delete(pendingConfirmations)
      .where(eq(pendingConfirmations.chatId, chatId));
  }

  async cleanupExpiredConfirmations(): Promise<number> {
    const result = await this.db
      .delete(pendingConfirmations)
      .where(lt(pendingConfirmations.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  // Event Attendees
  async getEventAttendee(googleEventId: string, attendeeEmail: string): Promise<EventAttendee | undefined> {
    const [attendee] = await this.db
      .select()
      .from(eventAttendees)
      .where(and(
        eq(eventAttendees.googleEventId, googleEventId),
        eq(eventAttendees.attendeeEmail, attendeeEmail)
      ))
      .limit(1);
    return attendee;
  }

  async createEventAttendee(insertAttendee: InsertEventAttendee): Promise<EventAttendee> {
    const [attendee] = await this.db
      .insert(eventAttendees)
      .values(insertAttendee)
      .returning();
    return attendee;
  }

  async updateEventAttendee(googleEventId: string, attendeeEmail: string, responseStatus: string): Promise<void> {
    await this.db
      .update(eventAttendees)
      .set({ 
        responseStatus, 
        lastChecked: new Date() 
      })
      .where(and(
        eq(eventAttendees.googleEventId, googleEventId),
        eq(eventAttendees.attendeeEmail, attendeeEmail)
      ));
  }

  async getEventAttendees(googleEventId: string): Promise<EventAttendee[]> {
    return await this.db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.googleEventId, googleEventId));
  }
}

export const storage = new DBStorage();
