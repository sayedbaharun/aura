import { db } from "../db";
import { customCategories } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface CategorySeed {
  type: "domain" | "task_type" | "focus_slot";
  value: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  metadata?: { time?: string; isDefault?: boolean };
  sortOrder: number;
}

const defaultDomains: CategorySeed[] = [
  { type: "domain", value: "home", label: "Home", description: "Personal home and family tasks", icon: "Home", sortOrder: 1, metadata: { isDefault: true } },
  { type: "domain", value: "work", label: "Work", description: "Professional and business tasks", icon: "Briefcase", sortOrder: 2, metadata: { isDefault: true } },
  { type: "domain", value: "health", label: "Health", description: "Health, fitness, and wellness", icon: "Heart", sortOrder: 3, metadata: { isDefault: true } },
  { type: "domain", value: "finance", label: "Finance", description: "Financial planning and management", icon: "DollarSign", sortOrder: 4, metadata: { isDefault: true } },
  { type: "domain", value: "travel", label: "Travel", description: "Travel planning and trips", icon: "Plane", sortOrder: 5, metadata: { isDefault: true } },
  { type: "domain", value: "learning", label: "Learning", description: "Education and skill development", icon: "GraduationCap", sortOrder: 6, metadata: { isDefault: true } },
  { type: "domain", value: "play", label: "Play", description: "Hobbies, entertainment, and fun", icon: "Gamepad2", sortOrder: 7, metadata: { isDefault: true } },
  { type: "domain", value: "calls", label: "Calls", description: "Phone calls and meetings", icon: "Phone", sortOrder: 8, metadata: { isDefault: true } },
  { type: "domain", value: "personal", label: "Personal", description: "Personal growth and miscellaneous", icon: "User", sortOrder: 9, metadata: { isDefault: true } },
];

const defaultTaskTypes: CategorySeed[] = [
  { type: "task_type", value: "business", label: "Business", description: "Business development and strategy", icon: "Building2", sortOrder: 1, metadata: { isDefault: true } },
  { type: "task_type", value: "deep_work", label: "Deep Work", description: "Focused, cognitively demanding work", icon: "Brain", sortOrder: 2, metadata: { isDefault: true } },
  { type: "task_type", value: "admin", label: "Admin", description: "Administrative and organizational tasks", icon: "ClipboardList", sortOrder: 3, metadata: { isDefault: true } },
  { type: "task_type", value: "health", label: "Health", description: "Health and wellness activities", icon: "Activity", sortOrder: 4, metadata: { isDefault: true } },
  { type: "task_type", value: "learning", label: "Learning", description: "Learning and skill building", icon: "BookOpen", sortOrder: 5, metadata: { isDefault: true } },
  { type: "task_type", value: "personal", label: "Personal", description: "Personal errands and tasks", icon: "User", sortOrder: 6, metadata: { isDefault: true } },
];

const defaultFocusSlots: CategorySeed[] = [
  { type: "focus_slot", value: "morning_routine", label: "Morning Routine", description: "Health, planning, breakfast", icon: "Sun", color: "#f59e0b", metadata: { time: "6:00-9:00", isDefault: true }, sortOrder: 1 },
  { type: "focus_slot", value: "deep_work_1", label: "Deep Work 1", description: "Deep strategic/creative work", icon: "Brain", color: "#3b82f6", metadata: { time: "9:00-11:00", isDefault: true }, sortOrder: 2 },
  { type: "focus_slot", value: "admin_block_1", label: "Admin Block 1", description: "Email, admin, quick tasks", icon: "Mail", color: "#8b5cf6", metadata: { time: "11:00-12:00", isDefault: true }, sortOrder: 3 },
  { type: "focus_slot", value: "deep_work_2", label: "Deep Work 2", description: "Deep execution work", icon: "Focus", color: "#3b82f6", metadata: { time: "14:00-16:00", isDefault: true }, sortOrder: 4 },
  { type: "focus_slot", value: "admin_block_2", label: "Admin Block 2", description: "Wrap up, admin tasks", icon: "CheckSquare", color: "#8b5cf6", metadata: { time: "16:00-17:00", isDefault: true }, sortOrder: 5 },
  { type: "focus_slot", value: "evening_review", label: "Evening Review", description: "Review, reflection, planning", icon: "Moon", color: "#6366f1", metadata: { time: "17:00-18:00", isDefault: true }, sortOrder: 6 },
  { type: "focus_slot", value: "meetings", label: "Meetings", description: "Meetings, calls, collaboration", icon: "Users", color: "#10b981", metadata: { time: "Anytime", isDefault: true }, sortOrder: 7 },
  { type: "focus_slot", value: "buffer", label: "Buffer", description: "Flex time, unexpected tasks", icon: "Clock", color: "#6b7280", metadata: { time: "Anytime", isDefault: true }, sortOrder: 8 },
];

const allDefaults = [...defaultDomains, ...defaultTaskTypes, ...defaultFocusSlots];

export async function seedCategories(): Promise<void> {
  console.log("Checking if categories need seeding...");

  // Check if any categories exist
  const existingCategories = await db.select().from(customCategories).limit(1);

  if (existingCategories.length > 0) {
    console.log("Categories already seeded, skipping...");
    return;
  }

  console.log("Seeding default categories...");

  // Insert all default categories
  for (const category of allDefaults) {
    await db.insert(customCategories).values({
      type: category.type,
      value: category.value,
      label: category.label,
      description: category.description || null,
      color: category.color || null,
      icon: category.icon || null,
      metadata: category.metadata || null,
      sortOrder: category.sortOrder,
      enabled: true,
    });
  }

  console.log(`Seeded ${allDefaults.length} default categories`);
}

// Function to reset categories to defaults (useful for testing)
export async function resetCategoriesToDefaults(): Promise<void> {
  console.log("Resetting categories to defaults...");

  // Delete all existing categories
  await db.delete(customCategories);

  // Re-seed
  for (const category of allDefaults) {
    await db.insert(customCategories).values({
      type: category.type,
      value: category.value,
      label: category.label,
      description: category.description || null,
      color: category.color || null,
      icon: category.icon || null,
      metadata: category.metadata || null,
      sortOrder: category.sortOrder,
      enabled: true,
    });
  }

  console.log(`Reset to ${allDefaults.length} default categories`);
}
