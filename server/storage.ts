import {
  type Venture,
  type InsertVenture,
  type Project,
  type InsertProject,
  type Milestone,
  type InsertMilestone,
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
  type Doc,
  type InsertDoc,
  type Attachment,
  type InsertAttachment,
  type User,
  type UpsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type CustomCategory,
  type InsertCustomCategory,
  type ShoppingItem,
  type InsertShoppingItem,
  type Book,
  type InsertBook,
  ventures,
  projects,
  milestones,
  tasks,
  captureItems,
  days,
  healthEntries,
  nutritionEntries,
  docs,
  attachments,
  users,
  userPreferences,
  customCategories,
  shoppingItems,
  books,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc, and, or, gte, lte, not, inArray, like } from "drizzle-orm";
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

  // Milestones
  getMilestones(filters?: { projectId?: string }): Promise<Milestone[]>;
  getMilestone(id: string): Promise<Milestone | undefined>;
  createMilestone(data: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: string, data: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<void>;

  // Tasks
  getTasks(filters?: {
    ventureId?: string;
    projectId?: string;
    status?: string;
    focusDate?: string;
    focusDateGte?: string;
    focusDateLte?: string;
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

  // Docs
  getDocs(filters?: {
    ventureId?: string;
    projectId?: string;
    type?: string;
    domain?: string;
    status?: string;
    parentId?: string | null;
  }): Promise<Doc[]>;
  getDoc(id: string): Promise<Doc | undefined>;
  getDocChildren(parentId: string | null, ventureId?: string): Promise<Doc[]>;
  getDocTree(ventureId: string): Promise<Doc[]>;
  createDoc(data: InsertDoc): Promise<Doc>;
  updateDoc(id: string, data: Partial<InsertDoc>): Promise<Doc | undefined>;
  deleteDoc(id: string): Promise<void>;
  deleteDocRecursive(id: string): Promise<void>;
  reorderDocs(docIds: string[], parentId: string | null): Promise<void>;
  searchDocs(query: string): Promise<Doc[]>;

  // Attachments
  getAttachments(docId: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  createAttachment(data: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(userId: string, data: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  // Custom Categories
  getCategories(filters?: { type?: string; enabled?: boolean }): Promise<CustomCategory[]>;
  getCategory(id: string): Promise<CustomCategory | undefined>;
  createCategory(data: InsertCustomCategory): Promise<CustomCategory>;
  updateCategory(id: string, data: Partial<InsertCustomCategory>): Promise<CustomCategory | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Shopping Items
  getShoppingItems(filters?: { status?: string; priority?: string; category?: string }): Promise<ShoppingItem[]>;
  getShoppingItem(id: string): Promise<ShoppingItem | undefined>;
  createShoppingItem(data: InsertShoppingItem): Promise<ShoppingItem>;
  updateShoppingItem(id: string, data: Partial<InsertShoppingItem>): Promise<ShoppingItem | undefined>;
  deleteShoppingItem(id: string): Promise<void>;

  // Books
  getBooks(filters?: { status?: string }): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  createBook(data: InsertBook): Promise<Book>;
  updateBook(id: string, data: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: string): Promise<void>;
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
  // MILESTONES
  // ============================================================================

  async getMilestones(filters?: { projectId?: string }): Promise<Milestone[]> {
    if (filters?.projectId) {
      return await this.db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, filters.projectId))
        .orderBy(milestones.order);
    }

    return await this.db
      .select()
      .from(milestones)
      .orderBy(milestones.order);
  }

  async getMilestone(id: string): Promise<Milestone | undefined> {
    const [milestone] = await this.db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));
    return milestone;
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const [milestone] = await this.db
      .insert(milestones)
      .values(insertMilestone)
      .returning();
    return milestone;
  }

  async updateMilestone(id: string, updates: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [updated] = await this.db
      .update(milestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    return updated;
  }

  async deleteMilestone(id: string): Promise<void> {
    await this.db.delete(milestones).where(eq(milestones.id, id));
  }

  // ============================================================================
  // TASKS
  // ============================================================================

  async getTasks(filters?: {
    ventureId?: string;
    projectId?: string;
    status?: string;
    focusDate?: string;
    focusDateGte?: string;
    focusDateLte?: string;
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
      // Handle comma-separated status values (e.g., "next,in_progress")
      const statusValues = filters.status.split(',').map(s => s.trim());
      if (statusValues.length === 1) {
        conditions.push(eq(tasks.status, statusValues[0] as any));
      } else {
        conditions.push(inArray(tasks.status, statusValues as any));
      }
    }
    if (filters?.focusDate) {
      conditions.push(eq(tasks.focusDate, filters.focusDate));
    }
    if (filters?.focusDateGte) {
      conditions.push(gte(tasks.focusDate, filters.focusDateGte));
    }
    if (filters?.focusDateLte) {
      conditions.push(lte(tasks.focusDate, filters.focusDateLte));
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

  // ============================================================================
  // DOCS
  // ============================================================================

  async getDocs(filters?: {
    ventureId?: string;
    projectId?: string;
    type?: string;
    domain?: string;
    status?: string;
    parentId?: string | null;
  }): Promise<Doc[]> {
    const conditions = [];

    if (filters?.ventureId) {
      conditions.push(eq(docs.ventureId, filters.ventureId));
    }
    if (filters?.projectId) {
      conditions.push(eq(docs.projectId, filters.projectId));
    }
    if (filters?.type) {
      conditions.push(eq(docs.type, filters.type as any));
    }
    if (filters?.domain) {
      conditions.push(eq(docs.domain, filters.domain as any));
    }
    if (filters?.status) {
      conditions.push(eq(docs.status, filters.status as any));
    }
    // Handle parentId filter - null means root level docs
    if (filters?.parentId !== undefined) {
      if (filters.parentId === null) {
        // Use SQL IS NULL check for root level docs
        conditions.push(eq(docs.parentId, null as any));
      } else {
        conditions.push(eq(docs.parentId, filters.parentId));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(docs)
      .where(whereClause)
      .orderBy(docs.order, desc(docs.updatedAt));
  }

  async getDoc(id: string): Promise<Doc | undefined> {
    const [doc] = await this.db
      .select()
      .from(docs)
      .where(eq(docs.id, id))
      .limit(1);
    return doc;
  }

  async createDoc(insertDoc: InsertDoc): Promise<Doc> {
    const [doc] = await this.db
      .insert(docs)
      .values(insertDoc as any)
      .returning();
    return doc;
  }

  async updateDoc(id: string, updates: Partial<InsertDoc>): Promise<Doc | undefined> {
    const [updated] = await this.db
      .update(docs)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(docs.id, id))
      .returning();
    return updated;
  }

  async deleteDoc(id: string): Promise<void> {
    await this.db.delete(docs).where(eq(docs.id, id));
  }

  async searchDocs(query: string): Promise<Doc[]> {
    // Search in title and body
    return await this.db
      .select()
      .from(docs)
      .where(
        or(
          like(docs.title, `%${query}%`),
          like(docs.body, `%${query}%`)
        )
      )
      .orderBy(desc(docs.updatedAt));
  }

  async getDocChildren(parentId: string | null, ventureId?: string): Promise<Doc[]> {
    const conditions = [];

    if (parentId === null) {
      // Root level docs - parentId IS NULL
      conditions.push(eq(docs.parentId, null as any));
    } else {
      conditions.push(eq(docs.parentId, parentId));
    }

    if (ventureId) {
      conditions.push(eq(docs.ventureId, ventureId));
    }

    return await this.db
      .select()
      .from(docs)
      .where(and(...conditions))
      .orderBy(docs.order, docs.title);
  }

  async getDocTree(ventureId: string): Promise<Doc[]> {
    // Get all docs for a venture - the tree structure is built client-side
    return await this.db
      .select()
      .from(docs)
      .where(eq(docs.ventureId, ventureId))
      .orderBy(docs.order, docs.title);
  }

  async deleteDocRecursive(id: string): Promise<void> {
    // First get all children recursively
    const getAllDescendants = async (docId: string): Promise<string[]> => {
      const children = await this.db
        .select({ id: docs.id })
        .from(docs)
        .where(eq(docs.parentId, docId));

      let descendantIds: string[] = [];
      for (const child of children) {
        descendantIds.push(child.id);
        const childDescendants = await getAllDescendants(child.id);
        descendantIds = descendantIds.concat(childDescendants);
      }
      return descendantIds;
    };

    const descendantIds = await getAllDescendants(id);
    const allIds = [id, ...descendantIds];

    // Delete all attachments for these docs
    if (allIds.length > 0) {
      await this.db.delete(attachments).where(inArray(attachments.docId, allIds));
    }

    // Delete all docs
    await this.db.delete(docs).where(inArray(docs.id, allIds));
  }

  async reorderDocs(docIds: string[], parentId: string | null): Promise<void> {
    // Update order for each doc
    for (let i = 0; i < docIds.length; i++) {
      await this.db
        .update(docs)
        .set({ order: i, parentId: parentId, updatedAt: new Date() })
        .where(eq(docs.id, docIds[i]));
    }
  }

  // ============================================================================
  // ATTACHMENTS
  // ============================================================================

  async getAttachments(docId: string): Promise<Attachment[]> {
    return await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.docId, docId))
      .orderBy(attachments.createdAt);
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const [attachment] = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);
    return attachment;
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const [attachment] = await this.db
      .insert(attachments)
      .values(insertAttachment)
      .returning();
    return attachment;
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.db.delete(attachments).where(eq(attachments.id, id));
  }

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return prefs;
  }

  async upsertUserPreferences(userId: string, data: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    // Check if preferences exist
    const existing = await this.getUserPreferences(userId);

    if (existing) {
      // Update existing
      const [updated] = await this.db
        .update(userPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await this.db
        .insert(userPreferences)
        .values({ ...data, userId } as InsertUserPreferences)
        .returning();
      return created;
    }
  }

  // ============================================================================
  // CUSTOM CATEGORIES
  // ============================================================================

  async getCategories(filters?: { type?: string; enabled?: boolean }): Promise<CustomCategory[]> {
    const conditions = [];

    if (filters?.type) {
      conditions.push(eq(customCategories.type, filters.type as any));
    }
    if (filters?.enabled !== undefined) {
      conditions.push(eq(customCategories.enabled, filters.enabled));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(customCategories)
      .where(whereClause)
      .orderBy(customCategories.sortOrder, customCategories.label);
  }

  async getCategory(id: string): Promise<CustomCategory | undefined> {
    const [category] = await this.db
      .select()
      .from(customCategories)
      .where(eq(customCategories.id, id))
      .limit(1);
    return category;
  }

  async createCategory(data: InsertCustomCategory): Promise<CustomCategory> {
    const [category] = await this.db
      .insert(customCategories)
      .values(data)
      .returning();
    return category;
  }

  async updateCategory(id: string, updates: Partial<InsertCustomCategory>): Promise<CustomCategory | undefined> {
    const [updated] = await this.db
      .update(customCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customCategories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.delete(customCategories).where(eq(customCategories.id, id));
  }

  // ============================================================================
  // SHOPPING ITEMS
  // ============================================================================

  async getShoppingItems(filters?: { status?: string; priority?: string; category?: string }): Promise<ShoppingItem[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(shoppingItems.status, filters.status as any));
    }
    if (filters?.priority) {
      conditions.push(eq(shoppingItems.priority, filters.priority as any));
    }
    if (filters?.category) {
      conditions.push(eq(shoppingItems.category, filters.category as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(shoppingItems)
      .where(whereClause)
      .orderBy(shoppingItems.priority, desc(shoppingItems.createdAt));
  }

  async getShoppingItem(id: string): Promise<ShoppingItem | undefined> {
    const [item] = await this.db
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.id, id))
      .limit(1);
    return item;
  }

  async createShoppingItem(data: InsertShoppingItem): Promise<ShoppingItem> {
    const [item] = await this.db
      .insert(shoppingItems)
      .values(data)
      .returning();
    return item;
  }

  async updateShoppingItem(id: string, updates: Partial<InsertShoppingItem>): Promise<ShoppingItem | undefined> {
    const [updated] = await this.db
      .update(shoppingItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shoppingItems.id, id))
      .returning();
    return updated;
  }

  async deleteShoppingItem(id: string): Promise<void> {
    await this.db.delete(shoppingItems).where(eq(shoppingItems.id, id));
  }

  // ============================================================================
  // BOOKS
  // ============================================================================

  async getBooks(filters?: { status?: string }): Promise<Book[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(books.status, filters.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(books)
      .where(whereClause)
      .orderBy(desc(books.createdAt));
  }

  async getBook(id: string): Promise<Book | undefined> {
    const [book] = await this.db
      .select()
      .from(books)
      .where(eq(books.id, id))
      .limit(1);
    return book;
  }

  async createBook(data: InsertBook): Promise<Book> {
    const [book] = await this.db
      .insert(books)
      .values(data)
      .returning();
    return book;
  }

  async updateBook(id: string, updates: Partial<InsertBook>): Promise<Book | undefined> {
    const [updated] = await this.db
      .update(books)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(books.id, id))
      .returning();
    return updated;
  }

  async deleteBook(id: string): Promise<void> {
    await this.db.delete(books).where(eq(books.id, id));
  }
}

export const storage = new DBStorage();
