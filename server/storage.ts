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
  type EmailSummary,
  type InsertEmailSummary,
  type NotionOperation,
  type InsertNotionOperation,
  type QuickNote,
  type InsertQuickNote,
  type UserProfile,
  type InsertUserProfile,
  type InteractionHistory,
  type InsertInteractionHistory,
  type ProactiveSuggestion,
  type InsertProactiveSuggestion,
  whatsappMessages,
  appointments,
  assistantSettings,
  users,
  pendingConfirmations,
  eventAttendees,
  emailSummaries,
  notionOperations,
  quickNotes,
  userProfiles,
  interactionHistory,
  proactiveSuggestions
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, lt, gt, and } from "drizzle-orm";
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

  // Email Summaries
  getEmailSummary(gmailMessageId: string): Promise<EmailSummary | undefined>;
  createEmailSummary(summary: InsertEmailSummary): Promise<EmailSummary>;
  getEmailSummariesByChat(chatId: string, limit?: number): Promise<EmailSummary[]>;
  getEmailSummariesByCategory(chatId: string, category: string): Promise<EmailSummary[]>;

  // Notion Operations
  createNotionOperation(operation: InsertNotionOperation): Promise<NotionOperation>;
  getNotionOperationsByChat(chatId: string, limit?: number): Promise<NotionOperation[]>;

  // Quick Notes
  createQuickNote(note: InsertQuickNote): Promise<QuickNote>;
  getQuickNotes(chatId: string, limit?: number): Promise<QuickNote[]>;
  getQuickNotesByCategory(chatId: string, category: string, limit?: number): Promise<QuickNote[]>;
  getQuickNotesByType(chatId: string, noteType: string, limit?: number): Promise<QuickNote[]>;
  updateQuickNote(id: string, updates: Partial<InsertQuickNote>): Promise<QuickNote | undefined>;
  deleteQuickNote(id: string): Promise<void>;

  // User Profiles (Context Memory)
  getUserProfile(chatId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(chatId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  incrementInteractionCount(chatId: string): Promise<void>;

  // Interaction History
  createInteractionHistory(interaction: InsertInteractionHistory): Promise<InteractionHistory>;
  getInteractionHistory(chatId: string, limit?: number): Promise<InteractionHistory[]>;
  getInteractionsByType(chatId: string, interactionType: string, limit?: number): Promise<InteractionHistory[]>;
  getRecentInteractions(chatId: string, hours: number): Promise<InteractionHistory[]>;

  // Proactive Suggestions
  createProactiveSuggestion(suggestion: InsertProactiveSuggestion): Promise<ProactiveSuggestion>;
  getProactiveSuggestions(chatId: string, limit?: number): Promise<ProactiveSuggestion[]>;
  getPendingSuggestions(chatId: string): Promise<ProactiveSuggestion[]>;
  getScheduledSuggestions(): Promise<ProactiveSuggestion[]>;
  updateSuggestionStatus(id: string, status: string, userResponse?: string): Promise<ProactiveSuggestion | undefined>;
  markSuggestionSent(id: string): Promise<void>;
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

  // Email Summaries
  async getEmailSummary(gmailMessageId: string): Promise<EmailSummary | undefined> {
    const [summary] = await this.db
      .select()
      .from(emailSummaries)
      .where(eq(emailSummaries.gmailMessageId, gmailMessageId))
      .limit(1);
    return summary;
  }

  async createEmailSummary(insertSummary: InsertEmailSummary): Promise<EmailSummary> {
    const [summary] = await this.db
      .insert(emailSummaries)
      .values(insertSummary)
      .onConflictDoUpdate({
        target: emailSummaries.gmailMessageId,
        set: {
          summary: insertSummary.summary,
          category: insertSummary.category,
          hasMeetingRequest: insertSummary.hasMeetingRequest,
          extractedMeetingDetails: insertSummary.extractedMeetingDetails,
        }
      })
      .returning();
    return summary;
  }

  async getEmailSummariesByChat(chatId: string, limit: number = 50): Promise<EmailSummary[]> {
    return await this.db
      .select()
      .from(emailSummaries)
      .where(eq(emailSummaries.chatId, chatId))
      .orderBy(desc(emailSummaries.receivedDate))
      .limit(limit);
  }

  async getEmailSummariesByCategory(chatId: string, category: string): Promise<EmailSummary[]> {
    return await this.db
      .select()
      .from(emailSummaries)
      .where(and(
        eq(emailSummaries.chatId, chatId),
        eq(emailSummaries.category, category)
      ))
      .orderBy(desc(emailSummaries.receivedDate));
  }

  // Notion Operations
  async createNotionOperation(insertOperation: InsertNotionOperation): Promise<NotionOperation> {
    const [operation] = await this.db
      .insert(notionOperations)
      .values(insertOperation)
      .returning();
    return operation;
  }

  async getNotionOperationsByChat(chatId: string, limit: number = 50): Promise<NotionOperation[]> {
    return await this.db
      .select()
      .from(notionOperations)
      .where(eq(notionOperations.chatId, chatId))
      .orderBy(desc(notionOperations.timestamp))
      .limit(limit);
  }

  // Quick Notes
  async createQuickNote(insertNote: InsertQuickNote): Promise<QuickNote> {
    const [note] = await this.db
      .insert(quickNotes)
      .values(insertNote)
      .returning();
    return note;
  }

  async getQuickNotes(chatId: string, limit: number = 50): Promise<QuickNote[]> {
    return await this.db
      .select()
      .from(quickNotes)
      .where(eq(quickNotes.chatId, chatId))
      .orderBy(desc(quickNotes.createdAt))
      .limit(limit);
  }

  async getQuickNotesByCategory(chatId: string, category: string, limit: number = 50): Promise<QuickNote[]> {
    return await this.db
      .select()
      .from(quickNotes)
      .where(and(
        eq(quickNotes.chatId, chatId),
        eq(quickNotes.category, category)
      ))
      .orderBy(desc(quickNotes.createdAt))
      .limit(limit);
  }

  async getQuickNotesByType(chatId: string, noteType: string, limit: number = 50): Promise<QuickNote[]> {
    return await this.db
      .select()
      .from(quickNotes)
      .where(and(
        eq(quickNotes.chatId, chatId),
        eq(quickNotes.noteType, noteType)
      ))
      .orderBy(desc(quickNotes.createdAt))
      .limit(limit);
  }

  async updateQuickNote(id: string, updates: Partial<InsertQuickNote>): Promise<QuickNote | undefined> {
    const [note] = await this.db
      .update(quickNotes)
      .set(updates)
      .where(eq(quickNotes.id, id))
      .returning();
    return note;
  }

  async deleteQuickNote(id: string): Promise<void> {
    await this.db
      .delete(quickNotes)
      .where(eq(quickNotes.id, id));
  }

  // User Profiles (Context Memory)
  async getUserProfile(chatId: string): Promise<UserProfile | undefined> {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.chatId, chatId))
      .limit(1);
    return profile;
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await this.db
      .insert(userProfiles)
      .values(insertProfile)
      .returning();
    return profile;
  }

  async updateUserProfile(chatId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await this.db
      .update(userProfiles)
      .set({
        ...updates,
        lastUpdated: new Date(),
      })
      .where(eq(userProfiles.chatId, chatId))
      .returning();
    return profile;
  }

  async incrementInteractionCount(chatId: string): Promise<void> {
    const profile = await this.getUserProfile(chatId);
    if (profile) {
      await this.db
        .update(userProfiles)
        .set({
          totalInteractions: (profile.totalInteractions || 0) + 1,
          lastUpdated: new Date(),
        })
        .where(eq(userProfiles.chatId, chatId));
    }
  }

  // Interaction History
  async createInteractionHistory(insertInteraction: InsertInteractionHistory): Promise<InteractionHistory> {
    const [interaction] = await this.db
      .insert(interactionHistory)
      .values(insertInteraction)
      .returning();
    return interaction;
  }

  async getInteractionHistory(chatId: string, limit: number = 100): Promise<InteractionHistory[]> {
    return await this.db
      .select()
      .from(interactionHistory)
      .where(eq(interactionHistory.chatId, chatId))
      .orderBy(desc(interactionHistory.timestamp))
      .limit(limit);
  }

  async getInteractionsByType(chatId: string, interactionType: string, limit: number = 50): Promise<InteractionHistory[]> {
    return await this.db
      .select()
      .from(interactionHistory)
      .where(and(
        eq(interactionHistory.chatId, chatId),
        eq(interactionHistory.interactionType, interactionType)
      ))
      .orderBy(desc(interactionHistory.timestamp))
      .limit(limit);
  }

  async getRecentInteractions(chatId: string, hours: number): Promise<InteractionHistory[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await this.db
      .select()
      .from(interactionHistory)
      .where(and(
        eq(interactionHistory.chatId, chatId),
        gt(interactionHistory.timestamp, cutoffTime) // Get interactions after the cutoff time
      ))
      .orderBy(desc(interactionHistory.timestamp));
  }

  // Proactive Suggestions
  async createProactiveSuggestion(insertSuggestion: InsertProactiveSuggestion): Promise<ProactiveSuggestion> {
    const [suggestion] = await this.db
      .insert(proactiveSuggestions)
      .values(insertSuggestion)
      .returning();
    return suggestion;
  }

  async getProactiveSuggestions(chatId: string, limit: number = 50): Promise<ProactiveSuggestion[]> {
    return await this.db
      .select()
      .from(proactiveSuggestions)
      .where(eq(proactiveSuggestions.chatId, chatId))
      .orderBy(desc(proactiveSuggestions.createdAt))
      .limit(limit);
  }

  async getPendingSuggestions(chatId: string): Promise<ProactiveSuggestion[]> {
    return await this.db
      .select()
      .from(proactiveSuggestions)
      .where(and(
        eq(proactiveSuggestions.chatId, chatId),
        eq(proactiveSuggestions.status, 'pending')
      ))
      .orderBy(desc(proactiveSuggestions.createdAt));
  }

  async getScheduledSuggestions(): Promise<ProactiveSuggestion[]> {
    const now = new Date();
    return await this.db
      .select()
      .from(proactiveSuggestions)
      .where(and(
        eq(proactiveSuggestions.status, 'pending'),
        lt(proactiveSuggestions.scheduledFor, now)
      ))
      .orderBy(desc(proactiveSuggestions.scheduledFor));
  }

  async updateSuggestionStatus(id: string, status: string, userResponse?: string): Promise<ProactiveSuggestion | undefined> {
    const [suggestion] = await this.db
      .update(proactiveSuggestions)
      .set({
        status,
        userResponse,
        respondedAt: new Date(),
      })
      .where(eq(proactiveSuggestions.id, id))
      .returning();
    return suggestion;
  }

  async markSuggestionSent(id: string): Promise<void> {
    await this.db
      .update(proactiveSuggestions)
      .set({
        sentAt: new Date(),
      })
      .where(eq(proactiveSuggestions.id, id));
  }
}

export const storage = new DBStorage();
