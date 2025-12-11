/**
 * Shared constants for route modules
 */

// Default user UUID for single-user system
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

// Slot time mapping for calendar sync
export const SLOT_TIMES: Record<string, { startHour: number; endHour: number }> = {
  morning_routine: { startHour: 7, endHour: 10 },
  gym: { startHour: 10, endHour: 12 },
  admin: { startHour: 12, endHour: 13.5 },
  lunch: { startHour: 13.5, endHour: 15 },
  walk: { startHour: 15, endHour: 16 },
  deep_work: { startHour: 16, endHour: 20 },
  evening: { startHour: 20, endHour: 23 },
  meetings: { startHour: 9, endHour: 17 },
  buffer: { startHour: 9, endHour: 17 },
  // Legacy slots
  deep_work_1: { startHour: 9, endHour: 11 },
  deep_work_2: { startHour: 14, endHour: 16 },
  admin_block_1: { startHour: 11, endHour: 12 },
  admin_block_2: { startHour: 16, endHour: 17 },
  evening_review: { startHour: 17, endHour: 18 },
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
