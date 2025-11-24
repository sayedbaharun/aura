import {
  type Venture,
  type InsertVenture,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type CaptureItem,
  type InsertCaptureItem,
  type Day,
  type InsertDay,
  type HealthEntry,
  type InsertHealthEntry,
  type NutritionEntry,
  type InsertNutritionEntry,
  type User,
  type UpsertUser,
  ventures,
  projects,
  tasks,
  captureItems,
  days,
  healthEntries,
  nutritionEntries,
  users,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, and, or, gte, lte, not, inArray } from "drizzle-orm";
import { db as database } from "../db";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Ventures
  getVentures(): Promise<Venture[]>;
  getVenture(id: string): Promise<Venture | undefined>;
  createVenture(data: InsertVenture): Promise<Venture>;
  updateVenture(id: string, data: Partial<InsertVenture>): Promise<Venture | undefined>;
  deleteVenture(id: string): Promise<void>;

  // Projects
  getProjects(filters?: { ventureId?: string }): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  // Tasks
  getTasks(filters?: {
    ventureId?: string;
    projectId?: string;
    status?: string;
    focusDate?: string;
    dueDate?: string;
  }): Promise<Task[]>;
  getTasksForToday(date: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  // Capture Items
  getCaptures(filters?: { clarified?: boolean }): Promise<CaptureItem[]>;
  getCapture(id: string): Promise<CaptureItem | undefined>;
  createCapture(data: InsertCaptureItem): Promise<CaptureItem>;
  updateCapture(id: string, data: Partial<InsertCaptureItem>): Promise<CaptureItem | undefined>;
  convertCaptureToTask(captureId: string, taskData: InsertTask): Promise<{ task: Task; capture: CaptureItem }>;
  deleteCapture(id: string): Promise<void>;

  // Days
  getDays(filters?: { dateGte?: string; dateLte?: string }): Promise<Day[]>;
  getDay(date: string): Promise<Day | undefined>;
  getDayOrCreate(date: string): Promise<Day>;
  createDay(data: InsertDay): Promise<Day>;
  updateDay(date: string, data: Partial<InsertDay>): Promise<Day | undefined>;
  deleteDay(date: string): Promise<void>;

  // Health Entries
  getHealthEntries(filters?: { dateGte?: string; dateLte?: string }): Promise<HealthEntry[]>;
  getHealthEntry(id: string): Promise<HealthEntry | undefined>;
  createHealthEntry(data: InsertHealthEntry): Promise<HealthEntry>;
  updateHealthEntry(id: string, data: Partial<InsertHealthEntry>): Promise<HealthEntry | undefined>;

  // Nutrition Entries
  getNutritionEntries(filters?: { dayId?: string; date?: string }): Promise<NutritionEntry[]>;
  getNutritionEntry(id: string): Promise<NutritionEntry | undefined>;
  createNutritionEntry(data: InsertNutritionEntry): Promise<NutritionEntry>;
  updateNutritionEntry(id: string, data: Partial<InsertNutritionEntry>): Promise<NutritionEntry | undefined>;
  deleteNutritionEntry(id: string): Promise<void>;
}

// PostgreSQL Storage Implementation
export class DBStorage implements IStorage {
  private db = database;

  constructor() {
    // Using shared database connection from db/index.ts
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

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

  // ============================================================================
  // VENTURES
  // ============================================================================

  async getVentures(): Promise<Venture[]> {
    return await this.db
      .select()
      .from(ventures)
      .orderBy(desc(ventures.createdAt));
  }

  async getVenture(id: string): Promise<Venture | undefined> {
    const [venture] = await this.db
      .select()
      .from(ventures)
      .where(eq(ventures.id, id))
      .limit(1);
    return venture;
  }

  async createVenture(insertVenture: InsertVenture): Promise<Venture> {
    const [venture] = await this.db
      .insert(ventures)
      .values(insertVenture)
      .returning();
    return venture;
  }

  async updateVenture(id: string, updates: Partial<InsertVenture>): Promise<Venture | undefined> {
    const [updated] = await this.db
      .update(ventures)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ventures.id, id))
      .returning();
    return updated;
  }

  async deleteVenture(id: string): Promise<void> {
    await this.db.delete(ventures).where(eq(ventures.id, id));
  }

  // ============================================================================
  // PROJECTS
  // ============================================================================

  async getProjects(filters?: { ventureId?: string }): Promise<Project[]> {
    if (filters?.ventureId) {
      return await this.db
        .select()
        .from(projects)
        .where(eq(projects.ventureId, filters.ventureId))
        .orderBy(desc(projects.createdAt));
    }

    return await this.db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await this.db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  // ============================================================================
  // TASKS
  // ============================================================================

  async getTasks(filters?: {
    ventureId?: string;
    projectId?: string;
    status?: string;
    focusDate?: string;
    dueDate?: string;
  }): Promise<Task[]> {
    const conditions = [];

    if (filters?.ventureId) {
      conditions.push(eq(tasks.ventureId, filters.ventureId));
    }
    if (filters?.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters?.focusDate) {
      conditions.push(eq(tasks.focusDate, filters.focusDate));
    }
    if (filters?.dueDate) {
      conditions.push(eq(tasks.dueDate, filters.dueDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(tasks)
      .where(whereClause)
      .orderBy(tasks.priority, desc(tasks.createdAt));
  }

  async getTasksForToday(date: string): Promise<Task[]> {
    // Tasks where focus_date = today OR due_date = today OR day_id = today's day_id
    // AND status != 'done' AND status != 'cancelled'
    const dayId = `day_${date}`;

    return await this.db
      .select()
      .from(tasks)
      .where(
        and(
          not(inArray(tasks.status, ['done', 'cancelled'])),
          or(
            eq(tasks.focusDate, date),
            eq(tasks.dueDate, date),
            eq(tasks.dayId, dayId)
          )
        )
      )
      .orderBy(tasks.priority, desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    return task;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await this.db
      .insert(tasks)
      .values(insertTask as any)
      .returning();
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };

    // If status is being set to 'done', set completedAt
    if (updates.status === 'done' && !updates.completedAt) {
      updateData.completedAt = new Date();
    }

    // If status is changed from 'done' to something else, clear completedAt
    if (updates.status && updates.status !== 'done') {
      updateData.completedAt = null;
    }

    const [updated] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }

  // ============================================================================
  // CAPTURE ITEMS
  // ============================================================================

  async getCaptures(filters?: { clarified?: boolean }): Promise<CaptureItem[]> {
    if (filters?.clarified !== undefined) {
      return await this.db
        .select()
        .from(captureItems)
        .where(eq(captureItems.clarified, filters.clarified))
        .orderBy(desc(captureItems.createdAt));
    }

    return await this.db
      .select()
      .from(captureItems)
      .orderBy(desc(captureItems.createdAt));
  }

  async getCapture(id: string): Promise<CaptureItem | undefined> {
    const [capture] = await this.db
      .select()
      .from(captureItems)
      .where(eq(captureItems.id, id))
      .limit(1);
    return capture;
  }

  async createCapture(insertCapture: InsertCaptureItem): Promise<CaptureItem> {
    const [capture] = await this.db
      .insert(captureItems)
      .values(insertCapture)
      .returning();
    return capture;
  }

  async updateCapture(id: string, updates: Partial<InsertCaptureItem>): Promise<CaptureItem | undefined> {
    const [updated] = await this.db
      .update(captureItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(captureItems.id, id))
      .returning();
    return updated;
  }

  async convertCaptureToTask(captureId: string, taskData: InsertTask): Promise<{ task: Task; capture: CaptureItem }> {
    const capture = await this.getCapture(captureId);
    if (!capture) {
      throw new Error('Capture not found');
    }

    // Create task with data from capture and taskData
    const mergedData = {
      ...taskData,
      title: taskData.title || capture.title,
      status: taskData.status || 'next' as any,
      domain: taskData.domain || capture.domain,
      ventureId: taskData.ventureId || capture.ventureId,
      projectId: taskData.projectId || capture.projectId,
      notes: taskData.notes || capture.notes,
    };

    const task = await this.createTask(mergedData);

    // Update capture to mark as clarified and link to task
    const updatedCapture = await this.updateCapture(captureId, {
      linkedTaskId: task.id,
      clarified: true,
    });

    return { task, capture: updatedCapture! };
  }

  async deleteCapture(id: string): Promise<void> {
    await this.db.delete(captureItems).where(eq(captureItems.id, id));
  }

  // ============================================================================
  // DAYS
  // ============================================================================

  async getDays(filters?: { dateGte?: string; dateLte?: string }): Promise<Day[]> {
    const conditions = [];

    if (filters?.dateGte) {
      conditions.push(gte(days.date, filters.dateGte));
    }
    if (filters?.dateLte) {
      conditions.push(lte(days.date, filters.dateLte));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(days)
      .where(whereClause)
      .orderBy(desc(days.date));
  }

  async getDay(date: string): Promise<Day | undefined> {
    const [day] = await this.db
      .select()
      .from(days)
      .where(eq(days.date, date))
      .limit(1);
    return day;
  }

  async getDayOrCreate(date: string): Promise<Day> {
    let day = await this.getDay(date);

    if (!day) {
      day = await this.createDay({
        id: `day_${date}`,
        date,
        title: `${date} – [Untitled]`,
      });
    }

    return day;
  }

  async createDay(insertDay: InsertDay): Promise<Day> {
    const [day] = await this.db
      .insert(days)
      .values(insertDay)
      .returning();
    return day;
  }

  async updateDay(date: string, updates: Partial<InsertDay>): Promise<Day | undefined> {
    const [updated] = await this.db
      .update(days)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(days.date, date))
      .returning();
    return updated;
  }

  async deleteDay(date: string): Promise<void> {
    await this.db.delete(days).where(eq(days.date, date));
  }

  // ============================================================================
  // HEALTH ENTRIES
  // ============================================================================

  async getHealthEntries(filters?: { dateGte?: string; dateLte?: string }): Promise<HealthEntry[]> {
    const conditions = [];

    if (filters?.dateGte) {
      conditions.push(gte(healthEntries.date, filters.dateGte));
    }
    if (filters?.dateLte) {
      conditions.push(lte(healthEntries.date, filters.dateLte));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(healthEntries)
      .where(whereClause)
      .orderBy(desc(healthEntries.date));
  }

  async getHealthEntry(id: string): Promise<HealthEntry | undefined> {
    const [entry] = await this.db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.id, id))
      .limit(1);
    return entry;
  }

  async createHealthEntry(insertEntry: InsertHealthEntry): Promise<HealthEntry> {
    const [entry] = await this.db
      .insert(healthEntries)
      .values(insertEntry as any)
      .returning();
    return entry;
  }

  async updateHealthEntry(id: string, updates: Partial<InsertHealthEntry>): Promise<HealthEntry | undefined> {
    const [updated] = await this.db
      .update(healthEntries)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(healthEntries.id, id))
      .returning();
    return updated;
  }

  // ============================================================================
  // NUTRITION ENTRIES
  // ============================================================================

  async getNutritionEntries(filters?: { dayId?: string; date?: string }): Promise<NutritionEntry[]> {
    const conditions = [];

    if (filters?.dayId) {
      conditions.push(eq(nutritionEntries.dayId, filters.dayId));
    }
    if (filters?.date) {
      // Extract date from datetime field (PostgreSQL date casting)
      // We'll filter by dayId instead which is more reliable
      const dayId = `day_${filters.date}`;
      conditions.push(eq(nutritionEntries.dayId, dayId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(nutritionEntries)
      .where(whereClause)
      .orderBy(nutritionEntries.datetime);
  }

  async getNutritionEntry(id: string): Promise<NutritionEntry | undefined> {
    const [entry] = await this.db
      .select()
      .from(nutritionEntries)
      .where(eq(nutritionEntries.id, id))
      .limit(1);
    return entry;
  }

  async createNutritionEntry(insertEntry: InsertNutritionEntry): Promise<NutritionEntry> {
    const [entry] = await this.db
      .insert(nutritionEntries)
      .values(insertEntry as any)
      .returning();
    return entry;
  }

  async updateNutritionEntry(id: string, updates: Partial<InsertNutritionEntry>): Promise<NutritionEntry | undefined> {
    const [updated] = await this.db
      .update(nutritionEntries)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(nutritionEntries.id, id))
      .returning();
    return updated;
  }

  async deleteNutritionEntry(id: string): Promise<void> {
    await this.db.delete(nutritionEntries).where(eq(nutritionEntries.id, id));
  }
}

export const storage = new DBStorage();
