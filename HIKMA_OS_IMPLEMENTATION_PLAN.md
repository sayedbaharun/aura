# Hikma-OS Implementation Plan
## Leveraging Existing Aura Codebase

**Status**: Ready to implement Phase 1
**Last Updated**: 2025-11-23

---

## Executive Summary

This plan transforms the existing Aura codebase into **Hikma-OS: The Sayed Baharun Productivity Engine**.

### Key Strategy
- ✅ **Leverage existing tech stack** (Express, React, Drizzle ORM, PostgreSQL, shadcn/ui)
- ✅ **Transform, don't rebuild** (reuse 70% of infrastructure)
- ✅ **Incremental delivery** (ship each phase independently)
- ✅ **Parallel development** (multiple sub-agents working simultaneously)

### Tech Stack (Existing)
- **Frontend**: React 18, Wouter, TanStack Query, shadcn/ui, Tailwind
- **Backend**: Express, Drizzle ORM, Neon PostgreSQL
- **Build**: Vite (client), esbuild (server)
- **Type Safety**: TypeScript strict mode, Zod schemas

---

## Phase 1: Core Engine (Weeks 1-3)

### Goal
MVP with Command Center, task management, and daily operating rhythm.

### Parallel Sub-Agent Tasks

#### 🔷 Agent 1: Database Schema Transformation
**Objective**: Transform existing schema to Hikma-OS data model

**Tasks**:
1. **Analyze existing schema** (`/shared/schema.ts`)
   - Current entities: `users`, `sessions`, `whatsappMessages`, `appointments`, `assistantSettings`
   - Identify what to keep, what to remove, what to add

2. **Design new Hikma-OS schema**:
   ```typescript
   // New entities to add:
   - ventures (new)
   - projects (new)
   - tasks (replaces appointments partially)
   - capture_items (new)
   - days (new)
   - health_entries (new)
   - nutrition_entries (new)
   - docs (new)
   - quotes (new, optional)
   - integration_records (new, future)

   // Entities to keep:
   - users (simplify for single-user)
   - sessions (keep auth infrastructure)

   // Entities to remove:
   - whatsappMessages (not needed for Hikma-OS)
   - appointments (replaced by tasks)
   - assistantSettings (not needed)
   ```

3. **Write Drizzle schemas** in `/shared/schema.ts`:
   - Use `pgTable`, `uuid`, `text`, `timestamp`, `pgEnum`, etc.
   - Define foreign keys with `references()`
   - Add indexes for performance
   - Use Zod for validation

4. **Create migration**:
   ```bash
   npm run db:push
   ```

5. **Seed initial data**:
   - Create Sayed's user record
   - Create initial ventures (MyDub.ai, Aivant Realty, etc.)
   - Create sample tasks and projects

**Deliverable**: New schema with all Phase 1 entities, migration applied, seed data loaded

**Estimated Time**: 1-2 days

---

#### 🔷 Agent 2: Backend API Routes
**Objective**: Build RESTful API for all Phase 1 entities

**Tasks**:
1. **Refactor `/server/routes.ts`**:
   - Remove old routes (`/api/messages`, `/api/appointments`, `/api/settings`)
   - Keep auth routes (`/api/auth/user`)

2. **Create new API endpoints**:

   **Ventures**:
   - `GET /api/ventures` - List all ventures
   - `GET /api/ventures/:id` - Get single venture
   - `POST /api/ventures` - Create venture
   - `PATCH /api/ventures/:id` - Update venture
   - `DELETE /api/ventures/:id` - Delete venture

   **Projects**:
   - `GET /api/projects` - List all projects (filterable by venture)
   - `GET /api/projects/:id` - Get single project
   - `POST /api/projects` - Create project
   - `PATCH /api/projects/:id` - Update project
   - `DELETE /api/projects/:id` - Delete project

   **Tasks**:
   - `GET /api/tasks` - List all tasks (filterable by status, venture, project, date)
   - `GET /api/tasks/today` - Get today's tasks (special filter)
   - `GET /api/tasks/:id` - Get single task
   - `POST /api/tasks` - Create task
   - `PATCH /api/tasks/:id` - Update task
   - `DELETE /api/tasks/:id` - Delete task

   **Capture Items**:
   - `GET /api/captures` - List all captures (filterable by clarified status)
   - `GET /api/captures/:id` - Get single capture
   - `POST /api/captures` - Create capture
   - `PATCH /api/captures/:id` - Update capture
   - `POST /api/captures/:id/convert` - Convert capture to task
   - `DELETE /api/captures/:id` - Delete capture

   **Days**:
   - `GET /api/days` - List days (with date range filter)
   - `GET /api/days/:date` - Get day by date (YYYY-MM-DD)
   - `GET /api/days/today` - Get or create today's day
   - `POST /api/days` - Create day
   - `PATCH /api/days/:date` - Update day
   - `DELETE /api/days/:date` - Delete day

3. **Implement route handlers**:
   - Use Drizzle ORM queries (via new `storage.ts` abstraction)
   - Validate request bodies with Zod schemas
   - Return consistent JSON responses
   - Handle errors gracefully

4. **Update `/server/storage.ts`**:
   - Create `DBStorage` class with methods for each entity
   - Examples:
     ```typescript
     class DBStorage {
       async getVentures() { ... }
       async getVenture(id: string) { ... }
       async createVenture(data: InsertVenture) { ... }
       async updateVenture(id: string, data: Partial<InsertVenture>) { ... }

       async getTasks(filters: TaskFilters) { ... }
       async getTasksForToday(date: string) { ... }
       // ... etc
     }
     ```

5. **Add authentication middleware** (optional for single-user, but keep infrastructure):
   - Keep existing Passport.js setup
   - For now: auto-login as Sayed
   - Future: proper multi-user auth

**Deliverable**: Full REST API with CRUD for all Phase 1 entities

**Estimated Time**: 2-3 days

---

#### 🔷 Agent 3: Command Center UI (Today View)
**Objective**: Build the main home screen with today-centric layout

**Tasks**:
1. **Create new page**: `/client/src/pages/command-center.tsx`

2. **Layout Structure**:
   ```tsx
   <CommandCenter>
     <TodayHeader />          {/* Date, Title, Top 3, One Thing */}
     <HealthSnapshot />       {/* Sleep, Energy, Mood, Workout */}
     <TasksForToday />        {/* Grouped by Venture → Project */}
     <NutritionSnapshot />    {/* Today's meals, totals */}
     <CaptureInbox />         {/* Unclarified captures */}
     <ThisWeekPreview />      {/* Upcoming 7 days */}
   </CommandCenter>
   ```

3. **TodayHeader Component**:
   - Display day.date, day.title (editable inline)
   - Editable textarea for `top_3_outcomes` (3 bullets)
   - Editable input for `one_thing_to_ship`
   - Save on blur or Cmd+S

4. **HealthSnapshot Component**:
   - Quick form: sleep hours (number input), energy (1-5 slider), mood (dropdown), workout (checkbox + type)
   - Save to Health Entry for today
   - Show existing health data if already logged

5. **TasksForToday Component**:
   - Fetch: `GET /api/tasks/today`
   - Group by venture, then by project
   - Each task row:
     - Checkbox (mark done)
     - Priority badge (P0/P1/P2/P3)
     - Type badge (business/deep_work/admin/etc)
     - Title (clickable → opens task detail modal)
     - Quick actions: Edit, Reschedule, Delete
   - Drag-and-drop to reorder (optional for Phase 1)

6. **NutritionSnapshot Component**:
   - Fetch: `GET /api/nutrition?date=today`
   - List meals with meal type, description, calories, protein
   - Totals footer: total calories, total protein
   - Progress bar: protein goal (e.g., 150g)
   - "+ Add Meal" button → opens meal form modal

7. **CaptureInbox Component**:
   - Fetch: `GET /api/captures?clarified=false`
   - List each capture with title, source, timestamp
   - Quick actions per item:
     - "Convert to Task" → opens modal with pre-filled fields
     - "Archive" → marks clarified=true without creating task
     - "Delete" → deletes capture

8. **ThisWeekPreview Component** (optional for Phase 1):
   - Fetch: `GET /api/tasks?focus_date_gte={today}&focus_date_lte={7_days_from_now}`
   - Group by day, then by venture
   - Show count of tasks per day

9. **Styling**:
   - Use existing shadcn/ui components: Card, Button, Input, Textarea, Checkbox, Badge, Select
   - Tailwind for layout (grid, flex)
   - Consistent spacing, typography

10. **Data Fetching**:
    - Use TanStack Query hooks:
      ```tsx
      const { data: day, isLoading } = useQuery({
        queryKey: ['day', 'today'],
        queryFn: () => apiRequest('GET', '/api/days/today')
      })

      const { data: tasks } = useQuery({
        queryKey: ['tasks', 'today'],
        queryFn: () => apiRequest('GET', '/api/tasks/today')
      })
      ```

**Deliverable**: Fully functional Command Center with all sub-components

**Estimated Time**: 3-4 days

---

#### 🔷 Agent 4: Global Capture Modal
**Objective**: Frictionless capture from anywhere in the app

**Tasks**:
1. **Create modal component**: `/client/src/components/capture-modal.tsx`

2. **Modal Structure**:
   ```tsx
   <Dialog>
     <DialogContent>
       <DialogHeader>Quick Capture</DialogHeader>
       <Form>
         <Input name="title" placeholder="What's on your mind?" autoFocus />
         <Select name="type" options={['idea', 'task', 'note', 'link', 'question']} />
         <Select name="source" options={['brain', 'email', 'chat', 'meeting', 'web']} />
         <Select name="venture" options={ventures} optional />
         <Select name="project" options={projects} optional />
         <Textarea name="notes" placeholder="Additional context..." optional />
         <Button type="submit">Capture</Button>
       </Form>
     </DialogContent>
   </Dialog>
   ```

3. **Trigger Mechanisms**:
   - **Sticky Button**: Fixed position button (bottom-right) with "+ Capture" text
   - **Keyboard Shortcut**: `Cmd+K` or `Ctrl+K` → opens modal
   - Use `useHotkeys` hook or similar

4. **State Management**:
   - Use Zustand or React Context to manage modal open/close state globally
   - Accessible from any screen

5. **API Integration**:
   - On submit: `POST /api/captures` with form data
   - On success: Close modal, show toast notification, invalidate captures query
   - On error: Show error message in modal

6. **UX Enhancements**:
   - Clear form on successful submit
   - "Capture & Open" button (saves and opens task detail if converted)
   - Escape key to close
   - Click outside to close

**Deliverable**: Global capture modal accessible from all screens

**Estimated Time**: 1 day

---

#### 🔷 Agent 5: Navigation & Layout
**Objective**: Update app navigation for Hikma-OS modules

**Tasks**:
1. **Update `/client/src/App.tsx`**:
   - Replace old routes:
     ```tsx
     // Remove:
     <Route path="/dashboard" component={Dashboard} />

     // Add:
     <Route path="/" component={CommandCenter} />
     <Route path="/ventures" component={VentureHQ} />
     <Route path="/ventures/:id" component={VentureDetail} />
     <Route path="/health" component={HealthHub} />
     <Route path="/nutrition" component={NutritionDashboard} />
     <Route path="/knowledge" component={KnowledgeHub} />
     <Route path="/deep-work" component={DeepWork} /> {/* Phase 5 */}
     ```

2. **Create new layout component**: `/client/src/components/layout.tsx`
   ```tsx
   <Layout>
     <TopNav>
       <NavLink to="/">Command Center</NavLink>
       <NavLink to="/ventures">Ventures</NavLink>
       <NavLink to="/health">Health</NavLink>
       <NavLink to="/nutrition">Nutrition</NavLink>
       <NavLink to="/knowledge">Knowledge</NavLink>
       <CaptureButton />
     </TopNav>
     <Main>{children}</Main>
   </Layout>
   ```

3. **TopNav Component**:
   - Horizontal nav bar
   - Active state highlighting
   - Responsive (mobile: hamburger menu)

4. **Remove old components**:
   - Delete `/client/src/pages/dashboard.tsx` (old)
   - Delete message-related components
   - Keep shadcn/ui components

**Deliverable**: Clean navigation with Hikma-OS routes

**Estimated Time**: 1 day

---

#### 🔷 Agent 6: Automation & Backend Logic
**Objective**: Implement core automations for Phase 1

**Tasks**:
1. **Daily Day Auto-Creation**:
   - Middleware in `/server/index.ts` or route handler:
     ```typescript
     // On GET /api/days/today:
     async function getTodayDay(req, res) {
       const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
       let day = await storage.getDay(today);

       if (!day) {
         day = await storage.createDay({
           id: `day_${today}`,
           date: today,
           title: `${today} – [Untitled]`,
           // other fields null
         });
       }

       res.json(day);
     }
     ```

2. **Task Surfacing for "Today"**:
   - Special query in `storage.getTasksForToday()`:
     ```typescript
     async getTasksForToday(date: string) {
       return db.select()
         .from(tasks)
         .where(
           and(
             notInArray(tasks.status, ['done', 'cancelled']),
             or(
               eq(tasks.focus_date, date),
               eq(tasks.due_date, date),
               eq(tasks.day_id, `day_${date}`)
             )
           )
         )
         .orderBy(tasks.priority, tasks.created_at);
     }
     ```

3. **Capture → Task Conversion**:
   - Special endpoint: `POST /api/captures/:id/convert`
     ```typescript
     async function convertCaptureToTask(req, res) {
       const { id } = req.params;
       const taskData = req.body; // title, venture_id, project_id, etc.

       const capture = await storage.getCapture(id);
       if (!capture) return res.status(404).json({ error: 'Capture not found' });

       const task = await storage.createTask({
         title: taskData.title || capture.title,
         venture_id: taskData.venture_id || capture.venture_id,
         project_id: taskData.project_id || capture.project_id,
         notes: taskData.notes || capture.notes,
         status: 'next',
         // ... other fields
       });

       await storage.updateCapture(id, {
         linked_task_id: task.id,
         clarified: true,
       });

       res.json({ task, capture });
     }
     ```

4. **Health Entry Auto-Link to Day**:
   - On `POST /api/health`:
     ```typescript
     async function createHealthEntry(req, res) {
       const { date, ...healthData } = req.body;

       // Ensure Day exists
       let day = await storage.getDay(date);
       if (!day) {
         day = await storage.createDay({
           id: `day_${date}`,
           date,
           title: `${date} – [Untitled]`,
         });
       }

       const healthEntry = await storage.createHealthEntry({
         day_id: day.id,
         date,
         ...healthData,
       });

       res.json(healthEntry);
     }
     ```

5. **Nutrition Entry Auto-Link to Day** (same pattern as health)

**Deliverable**: All Phase 1 automations implemented and tested

**Estimated Time**: 2 days

---

### Phase 1 Summary

**Total Estimated Time**: 10-13 days (2-3 weeks with buffer)

**Parallel Execution**:
- **Week 1**:
  - Agent 1 (Schema) + Agent 2 (API) running in parallel
  - Agent 4 (Capture Modal) + Agent 5 (Navigation) can start mid-week
- **Week 2**:
  - Agent 3 (Command Center UI) depends on Agent 1 & 2 completing
  - Agent 6 (Automations) depends on Agent 2 completing
- **Week 3**:
  - Integration testing, bug fixes, UX polish

**Definition of Done**:
- ✅ User can see Command Center with today's tasks, health, nutrition
- ✅ User can create ventures, projects, tasks
- ✅ User can capture ideas and convert to tasks
- ✅ Daily Day record auto-created
- ✅ Health and nutrition tracked and linked to Day
- ✅ Database schema migrated and seeded
- ✅ All API endpoints functional and documented

---

## Phase 2: Venture & Project Management (Weeks 4-5)

### Sub-Agent Tasks

#### 🔷 Agent 7: Venture HQ UI
**Tasks**:
1. Create `/client/src/pages/venture-hq.tsx`
2. Ventures dashboard (card grid)
3. Venture detail view (tabs: Projects, Tasks, Docs)
4. Project board (Kanban or list by status)
5. Project detail modal

**Estimated Time**: 3-4 days

---

#### 🔷 Agent 8: Task Detail Modal
**Tasks**:
1. Full task edit form with all fields
2. Link to venture, project, SOPs
3. Delete and status change actions
4. Use shadcn/ui Dialog component

**Estimated Time**: 2 days

---

### Phase 2 Summary
**Total Estimated Time**: 5-6 days (1-1.5 weeks)

**Definition of Done**:
- ✅ User can view all ventures in Venture HQ
- ✅ User can drill down into venture → projects → tasks
- ✅ User can create/edit projects with metadata
- ✅ Task detail modal fully functional

---

## Phase 3: Health & Nutrition (Weeks 6-7)

### Sub-Agent Tasks

#### 🔷 Agent 9: Health & Performance Hub
**Tasks**:
1. Create `/client/src/pages/health-hub.tsx`
2. Calendar view (30-day grid with energy/mood indicators)
3. Metrics table (last 30 days)
4. Day-Performance Link view
5. Charts (optional: use Recharts or Chart.js)

**Estimated Time**: 3-4 days

---

#### 🔷 Agent 10: Nutrition Dashboard
**Tasks**:
1. Create `/client/src/pages/nutrition-dashboard.tsx`
2. Today's meals list with totals
3. Add meal form modal
4. Weekly summary table
5. Progress bars for macros

**Estimated Time**: 2-3 days

---

### Phase 3 Summary
**Total Estimated Time**: 5-7 days (1-1.5 weeks)

**Definition of Done**:
- ✅ User can log health metrics daily
- ✅ User can log meals with macros
- ✅ Health Hub shows historical trends
- ✅ Nutrition Dashboard shows daily/weekly summaries

---

## Phase 4: Knowledge Management (Weeks 8-9)

### Sub-Agent Tasks

#### 🔷 Agent 11: Knowledge Hub UI
**Tasks**:
1. Create `/client/src/pages/knowledge-hub.tsx`
2. Add Doc/SOP entity to schema
3. Library view with tabs (SOPs, Prompts, Specs)
4. Search and filter functionality
5. Rich text editor (Tiptap or Lexical)
6. Doc detail view
7. Task ↔ Doc linking

**Estimated Time**: 5-6 days

---

### Phase 4 Summary
**Total Estimated Time**: 5-6 days (1-1.5 weeks)

**Definition of Done**:
- ✅ User can create/edit SOPs and docs
- ✅ Docs can be linked to ventures, projects, tasks
- ✅ Search and filter working
- ✅ Rich text editing functional

---

## Phase 5: Deep Work & Automation (Weeks 10-11)

### Sub-Agent Tasks

#### 🔷 Agent 12: Deep Work Module
**Tasks**:
1. Create `/client/src/pages/deep-work.tsx`
2. Deep Work Queue (filtered tasks)
3. Weekly calendar grid (7 days × 4 slots)
4. Drag-and-drop scheduling
5. Focus session timer (optional)

**Estimated Time**: 4-5 days

---

#### 🔷 Agent 13: Notifications & Reminders
**Tasks**:
1. Daily reminder system (cron jobs)
2. Task due date notifications
3. Weekly planning prompts
4. Toast notifications in UI

**Estimated Time**: 2-3 days

---

### Phase 5 Summary
**Total Estimated Time**: 6-8 days (1.5-2 weeks)

**Definition of Done**:
- ✅ User can schedule deep work sessions
- ✅ Weekly calendar functional with drag-and-drop
- ✅ Notifications and reminders operational

---

## Phase 6: Integrations (Weeks 12-14)

### Sub-Agent Tasks

#### 🔷 Agent 14: Notion Sync
**Tasks**:
1. Add Integration Record entity
2. Notion API integration
3. Bidirectional sync for Tasks, Projects, Ventures
4. Background sync worker

**Estimated Time**: 5-7 days

---

#### 🔷 Agent 15: Analytics & Insights
**Tasks**:
1. Health correlations (sleep vs energy)
2. Productivity metrics (tasks completed per week/venture)
3. Charts and visualizations
4. Trend analysis

**Estimated Time**: 3-4 days

---

### Phase 6 Summary
**Total Estimated Time**: 8-11 days (2-2.5 weeks)

**Definition of Done**:
- ✅ Notion sync operational
- ✅ Analytics dashboard shows insights
- ✅ Health correlations calculated

---

## Next Steps

### Immediate Actions (Today)
1. ✅ Review and approve this implementation plan
2. 🔄 Spawn **6 parallel sub-agents** for Phase 1:
   - Agent 1: Database Schema
   - Agent 2: Backend API
   - Agent 3: Command Center UI
   - Agent 4: Capture Modal
   - Agent 5: Navigation
   - Agent 6: Automations

3. Set up coordination:
   - Agents 1 & 2 start immediately (foundational)
   - Agents 4 & 5 start after Agent 1 completes (need schema)
   - Agent 3 starts after Agents 1 & 2 complete (needs API + schema)
   - Agent 6 starts after Agent 2 completes (needs API)

### Success Criteria
- Each agent produces working, tested code
- All agents commit to the same branch: `claude/hikma-os-platform-design-01VH17QGUpKvV7LqxZSrKaAQ`
- Phase 1 ships in 2-3 weeks with all features functional

---

**End of Implementation Plan**
