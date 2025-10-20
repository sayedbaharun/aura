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
  whatsappMessages,
  appointments,
  assistantSettings,
  users,
  pendingConfirmations
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc, lt } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

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
}

// PostgreSQL Storage Implementation
export class DBStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
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

  // Assistant Settings
  async getSettings(): Promise<AssistantSettings | undefined> {
    const [settings] = await this.db
      .select()
      .from(assistantSettings)
      .limit(1);
    
    // Initialize default settings if none exist
    if (!settings) {
      const [newSettings] = await this.db
        .insert(assistantSettings)
        .values({
          assistantName: "Aura",
          workingHours: "9:00 AM - 6:00 PM, Monday - Friday",
          defaultMeetingDuration: "60",
          timezone: "Asia/Dubai",
        })
        .returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateSettings(updates: Partial<InsertAssistantSettings>): Promise<AssistantSettings> {
    const existing = await this.getSettings();
    
    if (!existing) {
      const [newSettings] = await this.db
        .insert(assistantSettings)
        .values({
          assistantName: "Aura",
          workingHours: "9:00 AM - 6:00 PM, Monday - Friday",
          defaultMeetingDuration: "60",
          timezone: "Asia/Dubai",
          ...updates,
        })
        .returning();
      return newSettings;
    }

    const [updated] = await this.db
      .update(assistantSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(assistantSettings.id, existing.id))
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
    // Delete any existing confirmation for this chatId first
    await this.deletePendingConfirmation(insertConfirmation.chatId);

    const [confirmation] = await this.db
      .insert(pendingConfirmations)
      .values(insertConfirmation)
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
}

export const storage = new DBStorage();
