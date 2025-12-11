/**
 * Shared constants for route modules
 */

// Default user UUID for single-user system
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

// Slot time mapping for calendar sync
// These match the focus slots defined in shared/schema.ts and client weekly-calendar.tsx
export const SLOT_TIMES: Record<string, { startHour: number; endHour: number }> = {
  // Current schedule slots (matching schema focusSlotEnum)
  morning_routine: { startHour: 7, endHour: 9 },    // 7:00-9:00 AM (2 hours)
  deep_work_1: { startHour: 9, endHour: 11 },       // 9:00-11:00 AM (2 hours)
  admin_block: { startHour: 11, endHour: 12 },      // 11:00 AM-12:00 PM (1 hour)
  lunch: { startHour: 12, endHour: 13 },            // 12:00-1:00 PM (1 hour)
  gym: { startHour: 13, endHour: 15 },              // 1:00-3:00 PM (2 hours)
  afternoon: { startHour: 15, endHour: 17 },        // 3:00-5:00 PM (2 hours, reasonable for calendar)
  evening_review: { startHour: 23, endHour: 24 },   // 11:00 PM-12:00 AM (1 hour)
  meetings: { startHour: 9, endHour: 10 },          // Default 1-hour meeting slot
  buffer: { startHour: 9, endHour: 10 },            // Default 1-hour buffer slot
};

// Valid task statuses
export const VALID_TASK_STATUSES = ['todo', 'in_progress', 'completed', 'on_hold'];

// Priority order for sorting
export const PRIORITY_ORDER: Record<string, number> = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID format
 * This helps prevent 500 errors from PostgreSQL when invalid UUIDs are passed
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}
