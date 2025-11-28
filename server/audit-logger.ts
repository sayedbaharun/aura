// NOTE: audit-logger.ts is disabled for SB-OS
// The auditLogs table was removed during schema transformation
// This file is kept for reference but functionality is disabled

// import { db } from "../db";
// import { auditLogs, type InsertAuditLog } from "../shared/schema";

/**
 * Audit Logger for tracking all calendar operations
 * Logs: view_schedule, book, cancel, reschedule actions
 *
 * DISABLED: This functionality is not used in SB-OS
 */

export async function logAuditEvent(
  chatId: string,
  action: 'view_schedule' | 'book' | 'cancel' | 'reschedule',
  success: boolean,
  eventId?: string,
  eventTitle?: string,
  errorMessage?: string
): Promise<void> {
  try {
    // Database logging disabled - auditLogs table removed in SB-OS schema
    // const auditLog: InsertAuditLog = {
    //   chatId,
    //   action,
    //   success,
    //   eventId: eventId || null,
    //   eventTitle: eventTitle || null,
    //   errorMessage: errorMessage || null,
    // };
    // await db.insert(auditLogs).values(auditLog);

    // Log to console for monitoring
    const logLevel = success ? 'info' : 'error';
    const logMessage = `[AUDIT] ${action.toUpperCase()} - Chat: ${chatId}, Event: ${eventTitle || 'N/A'}, Success: ${success}`;

    if (success) {
      console.log(logMessage);
    } else {
      console.error(logMessage, errorMessage ? `Error: ${errorMessage}` : '');
    }
  } catch (error) {
    // Don't throw error - audit logging should not break the main flow
    console.error('[AUDIT] Failed to log audit event:', error);
  }
}

/**
 * Convenience function to log successful calendar view
 */
export async function logViewSchedule(chatId: string): Promise<void> {
  await logAuditEvent(chatId, 'view_schedule', true);
}

/**
 * Convenience function to log booking attempt
 */
export async function logBooking(
  chatId: string,
  success: boolean,
  eventId?: string,
  eventTitle?: string,
  errorMessage?: string
): Promise<void> {
  await logAuditEvent(chatId, 'book', success, eventId, eventTitle, errorMessage);
}

/**
 * Convenience function to log cancellation attempt
 */
export async function logCancellation(
  chatId: string,
  success: boolean,
  eventId?: string,
  eventTitle?: string,
  errorMessage?: string
): Promise<void> {
  await logAuditEvent(chatId, 'cancel', success, eventId, eventTitle, errorMessage);
}

/**
 * Convenience function to log rescheduling attempt
 */
export async function logReschedule(
  chatId: string,
  success: boolean,
  eventId?: string,
  eventTitle?: string,
  errorMessage?: string
): Promise<void> {
  await logAuditEvent(chatId, 'reschedule', success, eventId, eventTitle, errorMessage);
}
