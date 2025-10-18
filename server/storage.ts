import { 
  type WhatsappMessage, 
  type InsertWhatsappMessage,
  type Appointment,
  type InsertAppointment,
  type ClinicSettings,
  type InsertClinicSettings
} from "@shared/schema";
import { randomUUID } from "crypto";

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

  // Clinic Settings
  getSettings(): Promise<ClinicSettings | undefined>;
  updateSettings(settings: Partial<InsertClinicSettings>): Promise<ClinicSettings>;
}

export class MemStorage implements IStorage {
  private messages: Map<string, WhatsappMessage>;
  private appointments: Map<string, Appointment>;
  private settings: ClinicSettings | undefined;

  constructor() {
    this.messages = new Map();
    this.appointments = new Map();
    
    // Initialize default settings
    this.settings = {
      id: randomUUID(),
      clinicName: "Our Dental Clinic",
      clinicAddress: null,
      clinicPhone: null,
      clinicEmail: null,
      workingHours: null,
      services: null,
      aboutClinic: null,
      whatsappWebhookUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // WhatsApp Messages
  async getMessages(limit: number = 50): Promise<WhatsappMessage[]> {
    const allMessages = Array.from(this.messages.values());
    return allMessages
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit);
  }

  async createMessage(insertMessage: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const id = randomUUID();
    const message: WhatsappMessage = {
      ...insertMessage,
      id,
      receivedAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByPhone(phoneNumber: string, limit: number = 20): Promise<WhatsappMessage[]> {
    const phoneMessages = Array.from(this.messages.values())
      .filter(m => m.phoneNumber === phoneNumber);
    return phoneMessages
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit);
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    const allAppointments = Array.from(this.appointments.values());
    return allAppointments.sort((a, b) => {
      if (!a.appointmentDate) return 1;
      if (!b.appointmentDate) return -1;
      return new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
    });
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const existing = this.appointments.get(id);
    if (!existing) return undefined;

    const updated: Appointment = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.appointments.set(id, updated);
    return updated;
  }

  async cancelAppointment(id: string): Promise<Appointment | undefined> {
    return this.updateAppointment(id, { status: 'cancelled' });
  }

  // Clinic Settings
  async getSettings(): Promise<ClinicSettings | undefined> {
    return this.settings;
  }

  async updateSettings(updates: Partial<InsertClinicSettings>): Promise<ClinicSettings> {
    if (!this.settings) {
      this.settings = {
        id: randomUUID(),
        clinicName: "Our Dental Clinic",
        clinicAddress: null,
        clinicPhone: null,
        clinicEmail: null,
        workingHours: null,
        services: null,
        aboutClinic: null,
        whatsappWebhookUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date(),
    };
    return this.settings;
  }
}

export const storage = new MemStorage();
