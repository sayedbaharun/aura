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
// HIKMA-OS DATABASE SCHEMA
// ============================================================================
// This schema defines the data model for Hikma-OS: The Sayed Baharun
// Productivity Engine. It replaces the previous Aura schema.
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------

export const ventureStatusEnum = pgEnum('venture_status', [
  'active',
  'development',
  'paused',
  'archived'
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
  'product',
  'marketing',
  'ops',
  'fundraising',
  'research',
  'personal'
]);

export const priorityEnum = pgEnum('priority', ['P0', 'P1', 'P2', 'P3']);

export const taskStatusEnum = pgEnum('task_status', [
  'idea',
  'next',
  'in_progress',
  'waiting',
  'done',
  'cancelled'
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
  'work',
  'health',
  'personal',
  'learning'
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
  'sop',
  'prompt',
  'spec',
  'template',
  'playbook'
]);

export const docDomainEnum = pgEnum('doc_domain', [
  'venture_ops',
  'marketing',
  'product',
  'sales',
  'personal'
]);

export const docStatusEnum = pgEnum('doc_status', ['draft', 'active', 'archived']);

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'not_started',
  'in_progress',
  'done',
  'blocked'
]);

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
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  timezone: varchar("timezone").default("Asia/Dubai"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ----------------------------------------------------------------------------
// HIKMA-OS ENTITIES
// ----------------------------------------------------------------------------

// VENTURES: Business/strategic initiatives
export const ventures = pgTable(
  "ventures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    status: ventureStatusEnum("status").default("active").notNull(),
    oneLiner: text("one_liner"),
    domain: ventureDomainEnum("domain"),
    primaryFocus: text("primary_focus"),
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

// MILESTONES: Project phases and key deliverables
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    status: milestoneStatusEnum("status").default("not_started").notNull(),
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

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

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
    milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
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
    index("idx_tasks_milestone_id").on(table.milestoneId),
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
    top3Outcomes: text("top_3_outcomes"),
    oneThingToShip: text("one_thing_to_ship"),
    reflectionAm: text("reflection_am"),
    reflectionPm: text("reflection_pm"),
    mood: moodEnum("mood"),
    primaryVentureFocus: uuid("primary_venture_focus").references(() => ventures.id, {
      onDelete: "set null"
    }),
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

// DOCS: SOPs, prompts, playbooks, specs
export const docs = pgTable(
  "docs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    type: docTypeEnum("type"),
    domain: docDomainEnum("domain"),
    ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    status: docStatusEnum("status").default("draft").notNull(),
    body: text("body"),
    tags: jsonb("tags").$type<string[]>().default([]),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_docs_venture_id").on(table.ventureId),
    index("idx_docs_project_id").on(table.projectId),
    index("idx_docs_type").on(table.type),
    index("idx_docs_status").on(table.status),
    index("idx_docs_domain").on(table.domain),
  ]
);

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
  milestones: many(milestones),
  tasks: many(tasks),
  docs: many(docs),
  captureItems: many(captureItems),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
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
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
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

export const docsRelations = relations(docs, ({ one }) => ({
  venture: one(ventures, {
    fields: [docs.ventureId],
    references: [ventures.id],
  }),
  project: one(projects, {
    fields: [docs.projectId],
    references: [projects.id],
  }),
}));
