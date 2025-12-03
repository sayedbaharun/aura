import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  uuid,
  jsonb,
  index,
  integer,
  real,
  date,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// SB-OS DATABASE SCHEMA
// ============================================================================
// This schema defines the data model for SB-OS: The Sayed Baharun
// Productivity Engine. It replaces the previous Aura schema.
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------

export const ventureStatusEnum = pgEnum('venture_status', [
  // Legacy values (kept for backward compatibility with existing data)
  'active',      // legacy - use 'ongoing' instead
  'development', // legacy - use 'building' instead
  'paused',      // legacy - use 'on_hold' instead
  // Current values
  'archived',
  'planning',
  'building',
  'on_hold',
  'ongoing'
]);

export const ventureDomainEnum = pgEnum('venture_domain', [
  'saas',
  'media',
  'realty',
  'trading',
  'personal',
  'other'
]);

export const projectStatusEnum = pgEnum('project_status', [
  'not_started',
  'planning',
  'in_progress',
  'blocked',
  'done',
  'archived'
]);

export const projectCategoryEnum = pgEnum('project_category', [
  // Growth
  'marketing',
  'sales_biz_dev',
  'customer_success',
  // Product & Delivery
  'product',
  'tech_engineering',
  'operations',
  'research_dev',
  // Enabling
  'finance',
  'people_hr',
  'legal_compliance',
  'admin_general',
  'strategy_leadership'
]);

export const priorityEnum = pgEnum('priority', ['P0', 'P1', 'P2', 'P3']);

export const taskStatusEnum = pgEnum('task_status', [
  'idea',
  'next',
  'in_progress',
  'waiting',
  'done',
  'cancelled',
  'backlog'
]);

export const taskTypeEnum = pgEnum('task_type', [
  'business',
  'deep_work',
  'admin',
  'health',
  'learning',
  'personal'
]);

export const domainEnum = pgEnum('domain', [
  'home',
  'work',
  'health',
  'finance',
  'travel',
  'learning',
  'play',
  'calls',
  'personal'
]);

export const focusSlotEnum = pgEnum('focus_slot', [
  'deep_work_1',      // 9-11am: Deep strategic/creative work
  'deep_work_2',      // 2-4pm: Deep execution work
  'admin_block_1',    // 11am-12pm: Email, admin, quick tasks
  'admin_block_2',    // 4-5pm: Wrap up, admin
  'meetings',         // Anytime: Meetings, calls
  'buffer',           // Anytime: Flex time, unexpected
  'morning_routine',  // 6-9am: Health, planning, breakfast
  'evening_review'    // 5-6pm: Review, reflection, planning
]);

export const captureTypeEnum = pgEnum('capture_type', [
  'idea',
  'task',
  'note',
  'link',
  'question'
]);

export const captureSourceEnum = pgEnum('capture_source', [
  'brain',
  'email',
  'chat',
  'meeting',
  'web'
]);

export const moodEnum = pgEnum('mood', ['low', 'medium', 'high', 'peak']);

export const sleepQualityEnum = pgEnum('sleep_quality', [
  'poor',
  'fair',
  'good',
  'excellent'
]);

export const workoutTypeEnum = pgEnum('workout_type', [
  'strength',
  'cardio',
  'yoga',
  'sport',
  'walk',
  'none'
]);

export const stressLevelEnum = pgEnum('stress_level', ['low', 'medium', 'high']);

export const mealTypeEnum = pgEnum('meal_type', [
  'breakfast',
  'lunch',
  'dinner',
  'snack'
]);

export const docTypeEnum = pgEnum('doc_type', [
  'page',           // General page/note
  'sop',            // Standard Operating Procedure
  'prompt',         // AI/LLM prompts
  'spec',           // Technical specifications
  'template',       // Reusable templates
  'playbook',       // Step-by-step guides
  'strategy',       // Business/trading strategies
  'tech_doc',       // Technical documentation
  'process',        // Process documentation
  'reference',      // Reference material
  'meeting_notes',  // Meeting notes
  'research'        // Research notes
]);

export const docDomainEnum = pgEnum('doc_domain', [
  'venture_ops',    // Venture operations
  'marketing',      // Marketing
  'product',        // Product development
  'sales',          // Sales
  'tech',           // Technology/Engineering
  'trading',        // Trading strategies
  'finance',        // Finance/Accounting
  'legal',          // Legal/Compliance
  'hr',             // Human Resources
  'personal'        // Personal notes
]);

export const docStatusEnum = pgEnum('doc_status', ['draft', 'active', 'archived']);

export const phaseStatusEnum = pgEnum('milestone_status', [
  'not_started',
  'in_progress',
  'done',
  'blocked'
]);

export const categoryTypeEnum = pgEnum('category_type', [
  'domain',
  'task_type',
  'focus_slot'
]);

export const themeEnum = pgEnum('theme', ['light', 'dark', 'system']);

// ----------------------------------------------------------------------------
// CORE TABLES (Keep from Aura)
// ----------------------------------------------------------------------------

// Session storage table - Required for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Simplified for single-user (Sayed Baharun)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // bcrypt hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  timezone: varchar("timezone").default("Asia/Dubai"),
  dateFormat: varchar("date_format").default("yyyy-MM-dd"),
  timeFormat: varchar("time_format").default("24h"),
  weekStartsOn: integer("week_starts_on").default(0), // 0 = Sunday
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log table - Track security-sensitive operations
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(), // 'login', 'logout', 'password_change', 'data_export', etc.
    resource: varchar("resource", { length: 100 }), // 'ventures', 'tasks', 'health', etc.
    resourceId: varchar("resource_id"), // ID of affected resource
    ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
    userAgent: text("user_agent"),
    details: jsonb("details").$type<Record<string, unknown>>(), // Additional context
    status: varchar("status", { length: 20 }).default("success"), // 'success', 'failure', 'blocked'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_user_id").on(table.userId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User preferences - Theme, morning ritual config, notification settings
export interface MorningHabitConfig {
  key: string;
  label: string;
  icon: string;
  hasCount: boolean;
  countLabel?: string;
  defaultCount?: number;
  enabled: boolean;
}

export interface NotificationSettingsConfig {
  browserNotifications?: boolean;
  taskDueReminders?: boolean;
  taskOverdueAlerts?: boolean;
  healthReminders?: boolean;
  weeklyPlanningReminders?: boolean;
  dailyReflectionPrompts?: boolean;
  healthReminderTime?: string;
  weeklyPlanningDay?: number;
  weeklyPlanningTime?: string;
  dailyReflectionTime?: string;
  doNotDisturb?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  theme: themeEnum("theme").default("system"),
  morningRitualConfig: jsonb("morning_ritual_config").$type<{
    habits: MorningHabitConfig[];
  }>(),
  notificationSettings: jsonb("notification_settings").$type<NotificationSettingsConfig>(),
  aiInstructions: text("ai_instructions"),
  aiContext: jsonb("ai_context").$type<{
    userName?: string;
    role?: string;
    goals?: string[];
    preferences?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// Custom categories - User-defined domains, task types, focus slots
export const customCategories = pgTable(
  "custom_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: categoryTypeEnum("type").notNull(),
    value: varchar("value", { length: 50 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }),
    icon: varchar("icon", { length: 50 }),
    metadata: jsonb("metadata").$type<{
      time?: string;
      isDefault?: boolean;
    }>(),
    sortOrder: integer("sort_order").default(0),
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_custom_categories_type").on(table.type),
    index("idx_custom_categories_enabled").on(table.enabled),
  ]
);

export const insertCustomCategorySchema = createInsertSchema(customCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomCategory = z.infer<typeof insertCustomCategorySchema>;
export type CustomCategory = typeof customCategories.$inferSelect;

// ----------------------------------------------------------------------------
// SB-OS ENTITIES
// ----------------------------------------------------------------------------

// VENTURES: Business/strategic initiatives
export const ventures = pgTable(
  "ventures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    status: ventureStatusEnum("status").default("planning").notNull(),
    oneLiner: text("one_liner"),
    domain: ventureDomainEnum("domain"), // Deprecated but kept for backward compatibility
    primaryFocus: text("primary_focus"), // Deprecated but kept for backward compatibility
    color: varchar("color", { length: 7 }), // Hex color code
    icon: varchar("icon", { length: 10 }), // Emoji
    notes: text("notes"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_ventures_status").on(table.status),
    index("idx_ventures_domain").on(table.domain),
  ]
);

export const insertVentureSchema = createInsertSchema(ventures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVenture = z.infer<typeof insertVentureSchema>;
export type Venture = typeof ventures.$inferSelect;

// PROJECTS: Concrete initiatives within ventures
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "cascade" }),
    status: projectStatusEnum("status").default("not_started").notNull(),
    category: projectCategoryEnum("category"),
    priority: priorityEnum("priority"),
    startDate: date("start_date"),
    targetEndDate: date("target_end_date"),
    actualEndDate: date("actual_end_date"),
    outcome: text("outcome"),
    notes: text("notes"),
    budget: real("budget"), // Total budget allocated
    budgetSpent: real("budget_spent").default(0), // Amount spent to date
    revenueGenerated: real("revenue_generated").default(0), // Revenue from project
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_projects_venture_id").on(table.ventureId),
    index("idx_projects_status").on(table.status),
    index("idx_projects_priority").on(table.priority),
    index("idx_projects_target_end_date").on(table.targetEndDate),
  ]
);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// PHASES: Project phases and key deliverables
export const phases = pgTable(
  "milestones", // Keep SQL table name for backward compatibility
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    status: phaseStatusEnum("status").default("not_started").notNull(),
    order: integer("order").default(0), // For sequencing phases
    targetDate: date("target_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_milestones_project_id").on(table.projectId),
    index("idx_milestones_status").on(table.status),
    index("idx_milestones_order").on(table.order),
  ]
);

export const insertPhaseSchema = createInsertSchema(phases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPhase = z.infer<typeof insertPhaseSchema>;
export type Phase = typeof phases.$inferSelect;

// TASKS: Atomic units of execution
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    status: taskStatusEnum("status").default("idea").notNull(),
    priority: priorityEnum("priority"),
    type: taskTypeEnum("type"),
    domain: domainEnum("domain"),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    phaseId: uuid("milestone_id").references(() => phases.id, { onDelete: "set null" }), // Keep SQL column name for backward compatibility
    dayId: text("day_id").references(() => days.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    focusDate: date("focus_date"),
    focusSlot: focusSlotEnum("focus_slot"),
    estEffort: real("est_effort"), // Hours
    actualEffort: real("actual_effort"), // Hours
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().default([]),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("idx_tasks_venture_id").on(table.ventureId),
    index("idx_tasks_project_id").on(table.projectId),
    index("idx_tasks_milestone_id").on(table.phaseId), // Keep SQL index name for backward compatibility
    index("idx_tasks_day_id").on(table.dayId),
    index("idx_tasks_status").on(table.status),
    index("idx_tasks_priority").on(table.priority),
    index("idx_tasks_due_date").on(table.dueDate),
    index("idx_tasks_focus_date").on(table.focusDate),
    index("idx_tasks_type").on(table.type),
  ]
);

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// CAPTURE ITEMS: Inbox for raw thoughts
export const captureItems = pgTable(
  "capture_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    type: captureTypeEnum("type"),
    source: captureSourceEnum("source"),
    domain: domainEnum("domain"),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    linkedTaskId: uuid("linked_task_id").references(() => tasks.id, { onDelete: "set null" }),
    clarified: boolean("clarified").default(false).notNull(),
    notes: text("notes"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_capture_items_clarified").on(table.clarified),
    index("idx_capture_items_type").on(table.type),
    index("idx_capture_items_source").on(table.source),
    index("idx_capture_items_created_at").on(table.createdAt),
  ]
);

export const insertCaptureItemSchema = createInsertSchema(captureItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCaptureItem = z.infer<typeof insertCaptureItemSchema>;
export type CaptureItem = typeof captureItems.$inferSelect;

// DAYS: Daily logs (central hub for each day)
export const days = pgTable(
  "days",
  {
    id: text("id").primaryKey(), // Format: "day_YYYY-MM-DD"
    date: date("date").notNull().unique(),
    title: text("title"),
    top3Outcomes: jsonb("top_3_outcomes").$type<{
      text: string;
      completed: boolean;
    }[]>(),
    oneThingToShip: text("one_thing_to_ship"),
    reflectionAm: text("reflection_am"),
    reflectionPm: text("reflection_pm"),
    mood: moodEnum("mood"),
    primaryVentureFocus: uuid("primary_venture_focus").references(() => ventures.id, {
      onDelete: "set null"
    }),
    // Morning ritual tracking
    morningRituals: jsonb("morning_rituals").$type<{
      pressUps?: { done: boolean; reps?: number };
      squats?: { done: boolean; reps?: number };
      supplements?: { done: boolean };
      reading?: { done: boolean; pages?: number };
      completedAt?: string;
    }>(),
    // Evening ritual tracking
    eveningRituals: jsonb("evening_rituals").$type<{
      reviewCompleted?: boolean;
      journalEntry?: string;
      gratitude?: string[];
      tomorrowPriorities?: string[];
      completedAt?: string;
    }>(),
    // Trading journal for the day
    tradingJournal: jsonb("trading_journal").$type<{
      sessions: {
        id: string;
        timestamp: string;
        sessionName: string;
        pnl: number;
        notes: string;
        lessons: string;
        emotionalState: 'calm' | 'anxious' | 'confident' | 'frustrated';
      }[];
    }>().default({ sessions: [] }),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_days_date").on(table.date),
    index("idx_days_mood").on(table.mood),
    index("idx_days_primary_venture_focus").on(table.primaryVentureFocus),
  ]
);

export const insertDaySchema = createInsertSchema(days).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertDay = z.infer<typeof insertDaySchema>;
export type Day = typeof days.$inferSelect;

// HEALTH ENTRIES: Daily health metrics
export const healthEntries = pgTable(
  "health_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayId: text("day_id").references(() => days.id, { onDelete: "cascade" }).notNull(),
    date: date("date").notNull(),
    sleepHours: real("sleep_hours"),
    sleepQuality: sleepQualityEnum("sleep_quality"),
    energyLevel: integer("energy_level"), // 1-5 scale
    mood: moodEnum("mood"),
    steps: integer("steps"),
    workoutDone: boolean("workout_done").default(false),
    workoutType: workoutTypeEnum("workout_type"),
    workoutDurationMin: integer("workout_duration_min"),
    weightKg: real("weight_kg"),
    stressLevel: stressLevelEnum("stress_level"),
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_health_entries_day_id").on(table.dayId),
    index("idx_health_entries_date").on(table.date),
    index("idx_health_entries_mood").on(table.mood),
    index("idx_health_entries_energy_level").on(table.energyLevel),
  ]
);

export const insertHealthEntrySchema = createInsertSchema(healthEntries)
  .omit({
    id: true,
    dayId: true, // Backend auto-generates from date
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    date: z.union([z.string(), z.date()]).pipe(z.coerce.date()),
  });

export type InsertHealthEntry = z.infer<typeof insertHealthEntrySchema>;
export type HealthEntry = typeof healthEntries.$inferSelect;

// NUTRITION ENTRIES: Meal logs
export const nutritionEntries = pgTable(
  "nutrition_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayId: text("day_id").references(() => days.id, { onDelete: "cascade" }).notNull(),
    datetime: timestamp("datetime").notNull(),
    mealType: mealTypeEnum("meal_type"),
    description: text("description"),
    calories: real("calories"),
    proteinG: real("protein_g"),
    carbsG: real("carbs_g"),
    fatsG: real("fats_g"),
    context: text("context"),
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_nutrition_entries_day_id").on(table.dayId),
    index("idx_nutrition_entries_datetime").on(table.datetime),
    index("idx_nutrition_entries_meal_type").on(table.mealType),
  ]
);

export const insertNutritionEntrySchema = createInsertSchema(nutritionEntries)
  .omit({
    id: true,
    dayId: true, // Backend auto-generates from datetime
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    datetime: z.union([z.string(), z.date()]).pipe(z.coerce.date()),
  });

export type InsertNutritionEntry = z.infer<typeof insertNutritionEntrySchema>;
export type NutritionEntry = typeof nutritionEntries.$inferSelect;

// DOCS: Pages, SOPs, prompts, playbooks, specs, strategies
export const docs = pgTable(
  "docs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    type: docTypeEnum("type").default("page"),
    domain: docDomainEnum("domain"),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    parentId: uuid("parent_id"), // Self-reference for hierarchy (added via migration)
    status: docStatusEnum("status").default("draft").notNull(),
    icon: text("icon"), // Emoji or icon identifier
    coverImage: text("cover_image"), // URL to cover image
    body: text("body"), // Markdown content (legacy, for backward compatibility)
    content: jsonb("content").$type<unknown[]>(), // BlockNote JSON content (rich editor blocks)
    order: integer("order").default(0), // Sort order within parent
    isFolder: boolean("is_folder").default(false), // True for folder-type pages
    tags: jsonb("tags").$type<string[]>().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Flexible metadata storage
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_docs_venture_id").on(table.ventureId),
    index("idx_docs_project_id").on(table.projectId),
    index("idx_docs_parent_id").on(table.parentId),
    index("idx_docs_type").on(table.type),
    index("idx_docs_status").on(table.status),
    index("idx_docs_domain").on(table.domain),
  ]
);

// ATTACHMENTS: Files and images for docs
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docId: uuid("doc_id").references(() => docs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // MIME type
    size: integer("size"), // File size in bytes
    url: text("url"), // External URL (Google Drive, S3, etc.)
    storageType: text("storage_type").default("url"), // 'url', 'base64', 'local'
    data: text("data"), // Base64 encoded data for small files
    thumbnailUrl: text("thumbnail_url"), // Thumbnail for images
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_attachments_doc_id").on(table.docId),
  ]
);

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

export const insertDocSchema = createInsertSchema(docs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDoc = z.infer<typeof insertDocSchema>;
export type Doc = typeof docs.$inferSelect;

// ----------------------------------------------------------------------------
// RELATIONS
// ----------------------------------------------------------------------------

export const venturesRelations = relations(ventures, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  docs: many(docs),
  captureItems: many(captureItems),
  days: many(days),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  venture: one(ventures, {
    fields: [projects.ventureId],
    references: [ventures.id],
  }),
  phases: many(phases),
  tasks: many(tasks),
  docs: many(docs),
  captureItems: many(captureItems),
}));

export const phasesRelations = relations(phases, ({ one, many }) => ({
  project: one(projects, {
    fields: [phases.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  venture: one(ventures, {
    fields: [tasks.ventureId],
    references: [ventures.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  phase: one(phases, {
    fields: [tasks.phaseId],
    references: [phases.id],
  }),
  day: one(days, {
    fields: [tasks.dayId],
    references: [days.id],
  }),
}));

export const captureItemsRelations = relations(captureItems, ({ one }) => ({
  venture: one(ventures, {
    fields: [captureItems.ventureId],
    references: [ventures.id],
  }),
  project: one(projects, {
    fields: [captureItems.projectId],
    references: [projects.id],
  }),
  linkedTask: one(tasks, {
    fields: [captureItems.linkedTaskId],
    references: [tasks.id],
  }),
}));

export const daysRelations = relations(days, ({ one, many }) => ({
  primaryVenture: one(ventures, {
    fields: [days.primaryVentureFocus],
    references: [ventures.id],
  }),
  tasks: many(tasks),
  healthEntries: many(healthEntries),
  nutritionEntries: many(nutritionEntries),
}));

export const healthEntriesRelations = relations(healthEntries, ({ one }) => ({
  day: one(days, {
    fields: [healthEntries.dayId],
    references: [days.id],
  }),
}));

export const nutritionEntriesRelations = relations(nutritionEntries, ({ one }) => ({
  day: one(days, {
    fields: [nutritionEntries.dayId],
    references: [days.id],
  }),
}));

export const docsRelations = relations(docs, ({ one, many }) => ({
  venture: one(ventures, {
    fields: [docs.ventureId],
    references: [ventures.id],
  }),
  project: one(projects, {
    fields: [docs.projectId],
    references: [projects.id],
  }),
  parent: one(docs, {
    fields: [docs.parentId],
    references: [docs.id],
    relationName: "docHierarchy",
  }),
  children: many(docs, {
    relationName: "docHierarchy",
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  doc: one(docs, {
    fields: [attachments.docId],
    references: [docs.id],
  }),
}));

// ----------------------------------------------------------------------------
// SHOPPING ITEMS
// ----------------------------------------------------------------------------

export const shoppingPriorityEnum = pgEnum('shopping_priority', ['P1', 'P2', 'P3']);
export const shoppingStatusEnum = pgEnum('shopping_status', ['to_buy', 'purchased']);
export const shoppingCategoryEnum = pgEnum('shopping_category', ['groceries', 'personal', 'household', 'business']);

export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    item: text("item").notNull(),
    priority: shoppingPriorityEnum("priority").default("P2").notNull(),
    status: shoppingStatusEnum("status").default("to_buy").notNull(),
    category: shoppingCategoryEnum("category").default("personal"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_shopping_items_status").on(table.status),
    index("idx_shopping_items_priority").on(table.priority),
    index("idx_shopping_items_category").on(table.category),
    index("idx_shopping_items_created_at").on(table.createdAt),
  ]
);

export const insertShoppingItemSchema = createInsertSchema(shoppingItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

// ----------------------------------------------------------------------------
// BOOKS
// ----------------------------------------------------------------------------

export const bookStatusEnum = pgEnum('book_status', ['to_read', 'reading', 'finished']);

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    author: text("author"),
    platforms: jsonb("platforms").$type<string[]>().default([]),
    status: bookStatusEnum("status").default("to_read").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_books_status").on(table.status),
    index("idx_books_created_at").on(table.createdAt),
  ]
);

export const insertBookSchema = createInsertSchema(books, {
  platforms: z.array(z.string()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

// ----------------------------------------------------------------------------
// AI AGENT PROMPTS
// ----------------------------------------------------------------------------

// AI Agent Prompts: Venture-specific AI assistant configuration
export const aiAgentPrompts = pgTable(
  "ai_agent_prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "cascade" }).notNull().unique(),
    systemPrompt: text("system_prompt"),
    context: text("context"),
    capabilities: jsonb("capabilities").$type<string[]>().default([]),
    quickActions: jsonb("quick_actions").$type<{
      label: string;
      prompt: string;
    }[]>().default([]),
    // New fields for venture AI agent system
    knowledgeSources: jsonb("knowledge_sources").$type<string[]>().default(['docs', 'tasks', 'projects']), // Which data types to include
    actionPermissions: jsonb("action_permissions").$type<string[]>().default(['read']), // What actions agent can take: read, create_task, create_doc, etc.
    contextRefreshHours: integer("context_refresh_hours").default(24), // Hours between context rebuilds
    maxContextTokens: integer("max_context_tokens").default(8000), // Token budget for context
    preferredModel: text("preferred_model"), // Preferred AI model (e.g., 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet')
    enabled: boolean("enabled").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_ai_agent_prompts_venture_id").on(table.ventureId),
    index("idx_ai_agent_prompts_enabled").on(table.enabled),
  ]
);

export const insertAiAgentPromptSchema = createInsertSchema(aiAgentPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiAgentPrompt = z.infer<typeof insertAiAgentPromptSchema>;

// Chat Messages: Web-based AI chat conversations
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    role: text("role").$type<"user" | "assistant" | "system">().notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<{
      model?: string;
      tokensUsed?: number;
      toolCalls?: any[];
      [key: string]: any;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_chat_messages_user_id").on(table.userId),
    index("idx_chat_messages_created_at").on(table.createdAt),
  ]
);

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type AiAgentPrompt = typeof aiAgentPrompts.$inferSelect;

// ----------------------------------------------------------------------------
// VENTURE AI AGENT SYSTEM
// ----------------------------------------------------------------------------

// Venture Conversations: Chat history scoped to specific ventures
export const ventureConversations = pgTable(
  "venture_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    role: text("role").$type<"user" | "assistant" | "system">().notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<{
      model?: string;
      tokensUsed?: number;
      toolCalls?: any[];
      toolResults?: any[];
      actionsTaken?: string[];
      [key: string]: any;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_venture_conversations_venture_id").on(table.ventureId),
    index("idx_venture_conversations_user_id").on(table.userId),
    index("idx_venture_conversations_created_at").on(table.createdAt),
  ]
);

export const insertVentureConversationSchema = createInsertSchema(ventureConversations).omit({
  id: true,
  createdAt: true,
});

export type VentureConversation = typeof ventureConversations.$inferSelect;
export type InsertVentureConversation = z.infer<typeof insertVentureConversationSchema>;

// Context type enum for venture context cache
export const contextTypeEnum = pgEnum('context_type', ['full', 'summary', 'docs', 'tasks', 'projects']);

// Venture Context Cache: Cached context summaries for AI agents
export const ventureContextCache = pgTable(
  "venture_context_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "cascade" }).notNull(),
    contextType: contextTypeEnum("context_type").default("full").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    lastBuiltAt: timestamp("last_built_at").defaultNow().notNull(),
    validUntil: timestamp("valid_until"),
    metadata: jsonb("metadata").$type<{
      projectCount?: number;
      taskCount?: number;
      docCount?: number;
      buildDurationMs?: number;
      [key: string]: any;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_venture_context_cache_venture_id").on(table.ventureId),
    index("idx_venture_context_cache_type").on(table.contextType),
    index("idx_venture_context_cache_valid_until").on(table.validUntil),
  ]
);

export const insertVentureContextCacheSchema = createInsertSchema(ventureContextCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type VentureContextCache = typeof ventureContextCache.$inferSelect;
export type InsertVentureContextCache = z.infer<typeof insertVentureContextCacheSchema>;

// Venture Agent Actions: Audit log for actions taken by venture AI agents
export const ventureAgentActions = pgTable(
  "venture_agent_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    conversationId: uuid("conversation_id").references(() => ventureConversations.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g., 'create_task', 'update_project', 'create_doc'
    entityType: text("entity_type"), // e.g., 'task', 'project', 'doc', 'phase'
    entityId: uuid("entity_id"), // ID of created/updated entity
    parameters: jsonb("parameters").$type<Record<string, any>>(),
    result: text("result").$type<"success" | "failed" | "rejected" | "pending">().default("pending"),
    errorMessage: text("error_message"),
    executedAt: timestamp("executed_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_venture_agent_actions_venture_id").on(table.ventureId),
    index("idx_venture_agent_actions_user_id").on(table.userId),
    index("idx_venture_agent_actions_action").on(table.action),
    index("idx_venture_agent_actions_executed_at").on(table.executedAt),
  ]
);

export const insertVentureAgentActionSchema = createInsertSchema(ventureAgentActions).omit({
  id: true,
  executedAt: true,
});

export type VentureAgentAction = typeof ventureAgentActions.$inferSelect;
export type InsertVentureAgentAction = z.infer<typeof insertVentureAgentActionSchema>;

// ----------------------------------------------------------------------------
// TRADING STRATEGIES
// ----------------------------------------------------------------------------

// Checklist item types for trading strategies
export type TradingChecklistItemType = 'checkbox' | 'text' | 'number' | 'select' | 'time' | 'table';

export interface TradingChecklistItem {
  id: string;
  label: string;
  type: TradingChecklistItemType;
  required: boolean;
  category?: string; // For grouping like "A. The Setup", "B. The Trigger"
  options?: string[]; // For select type
  placeholder?: string;
  description?: string;
  tableColumns?: string[]; // For table type
}

export interface TradingChecklistSection {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  items: TradingChecklistItem[];
}

export interface TradingStrategyConfig {
  sections: TradingChecklistSection[];
}

// Trading session type for the day
export const tradingSessionEnum = pgEnum('trading_session', ['london', 'new_york', 'asian', 'other']);

// Trading Strategies: Templates for trading checklists
export const tradingStrategies = pgTable(
  "trading_strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    instruments: jsonb("instruments").$type<string[]>().default([]), // e.g., ["XAU/USD", "XAG/USD"]
    isActive: boolean("is_active").default(true), // Whether this strategy is currently active
    isDefault: boolean("is_default").default(false), // Whether this is the default strategy
    config: jsonb("config").$type<TradingStrategyConfig>().notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_trading_strategies_is_active").on(table.isActive),
    index("idx_trading_strategies_is_default").on(table.isDefault),
  ]
);

export const insertTradingStrategySchema = createInsertSchema(tradingStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTradingStrategy = z.infer<typeof insertTradingStrategySchema>;
export type TradingStrategy = typeof tradingStrategies.$inferSelect;

// Daily Trading Checklists: Track daily completion of a strategy
export interface TradingChecklistValue {
  checked?: boolean;
  value?: string | number;
  tableData?: Record<string, string>[];
}

export interface DailyTradingChecklistData {
  strategyId: string;
  strategyName: string;
  instrument?: string; // Optional: specific instrument like "XAU/USD", "XAG/USD"
  session?: 'london' | 'new_york' | 'asian' | 'other';
  mentalState?: number; // 1-10
  highImpactNews?: string;
  values: Record<string, TradingChecklistValue>; // Map of item id to value
  trades: {
    id: string;
    time: string;
    pair: string;
    direction: 'long' | 'short';
    entryPrice: string;
    stopLoss: string;
    takeProfit?: string;
    result?: 'win' | 'loss' | 'breakeven' | 'pending';
    pnl?: number;
    notes?: string;
  }[];
  endOfSessionReview?: {
    followedPlan: boolean;
    didWell?: string;
    toImprove?: string;
  };
  completedAt?: string;
}

export const dailyTradingChecklists = pgTable(
  "daily_trading_checklists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayId: text("day_id").references(() => days.id, { onDelete: "cascade" }).notNull(),
    date: date("date").notNull(),
    strategyId: uuid("strategy_id").references(() => tradingStrategies.id, { onDelete: "set null" }),
    data: jsonb("data").$type<DailyTradingChecklistData>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_daily_trading_checklists_day_id").on(table.dayId),
    index("idx_daily_trading_checklists_date").on(table.date),
    index("idx_daily_trading_checklists_strategy_id").on(table.strategyId),
  ]
);

export const insertDailyTradingChecklistSchema = createInsertSchema(dailyTradingChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDailyTradingChecklist = z.infer<typeof insertDailyTradingChecklistSchema>;
export type DailyTradingChecklist = typeof dailyTradingChecklists.$inferSelect;
