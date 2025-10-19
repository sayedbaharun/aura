import { 
  type WhatsappMessage, 
  type InsertWhatsappMessage,
  type Appointment,
  type InsertAppointment,
  type AssistantSettings,
  type InsertAssistantSettings,
  whatsappMessages,
  appointments,
  assistantSettings
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export interface IStorage {
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
}

// PostgreSQL Storage Implementation
export class DBStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
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
}

export const storage = new DBStorage();
