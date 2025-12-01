# SB-OS: The Sayed Baharun Personal Operating System

> **Complete Technical & Product Specification**

This file is the single source of truth for the SB-OS codebase. It provides guidance for development (including Claude Code), architecture details, API reference, and product specifications.

---

## Table of Contents

1. [Identity & Philosophy](#1-identity--philosophy)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Development Commands](#4-development-commands)
5. [Architecture](#5-architecture)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Key Files](#8-key-files)
9. [UX Modules & Screens](#9-ux-modules--screens)
10. [Focus Slots (Time Blocking)](#10-focus-slots-time-blocking)
11. [Automation & Logic Layer](#11-automation--logic-layer)
12. [Integration Points](#12-integration-points)
13. [Environment Configuration](#13-environment-configuration)
14. [Code Patterns](#14-code-patterns)
15. [Common Development Tasks](#15-common-development-tasks)
16. [Roadmap](#16-roadmap)

---

## 1. Identity & Philosophy

### What is SB-OS?

**SB-OS** (formerly Aura) is a full-stack personal operating system and productivity engine for managing multiple business ventures, projects, tasks, health, and knowledge. Built as a custom "second brain" to replace Notion, Todoist, and other fragmented productivity tools.

SB-OS is **the operating system for one founder: Sayed Baharun**.

It is:
- A **thinking partner + execution engine**, not a task manager
- **Single-brain, multi-venture**: everything rolls up to one person across multiple businesses
- **Today-centric**: every day is a unified view of tasks, health, nutrition, and focus
- **Context-preserving**: relations ensure no information is orphaned

### Core Capabilities

- **Multiple Ventures** - Business initiatives across different domains (SaaS, media, realty, trading, personal)
- **Project Management** - Time-bound initiatives with phases, budgets, and outcomes
- **Task Execution** - Atomic work items with time blocking and effort tracking
- **Health & Wellness** - Daily health metrics and nutrition logging
- **Knowledge Base** - SOPs, playbooks, specs, and templates
- **Daily Operations** - Morning planning, evening review, and reflection rituals

### Design Principles

1. **Capture → Clarify → Commit → Complete**
   - Every input flows through a canonical pipeline
   - Nothing falls through cracks; everything is processed

2. **Leverage → Precision → Defensibility**
   - Focus on high-leverage work first
   - Precision in execution (deep work slots, clear outcomes)
   - Build defensible moats (SOPs, systems, documented knowledge)

3. **Few Canonical Entities**
   - Core entities: Ventures, Projects, Tasks, Days, Health, Nutrition, Docs
   - Heavy use of relations (never duplicate data)
   - Every entity connects to Ventures or Days for context

4. **Health & Clarity First, Then Output**
   - Health metrics are first-class citizens
   - Energy and mood inform task planning
   - Deep work > shallow busywork

5. **One Source of Truth**
   - Every piece of data lives in exactly one place
   - Relations create views, not copies
   - Built for iteration and evolution

6. **Simple First**
   - Build what's needed, add complexity later

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS |
| **Backend** | Express.js, Node.js, TypeScript |
| **ORM** | Drizzle ORM with drizzle-zod |
| **Database** | PostgreSQL (Neon serverless) |
| **Build** | Vite (client), esbuild (server) |
| **Validation** | Zod schemas (shared between client/server) |
| **Auth** | Simple session-based auth (single-user system) |
| **Session Storage** | PostgreSQL via connect-pg-simple |

---

## 3. Project Structure

```
/client         React frontend (Vite + TypeScript)
  /src
    /components   UI components (shadcn/ui)
    /pages        Page components
    /lib          Utilities and helpers
    /hooks        Custom React hooks
/server         Express backend (Node.js + TypeScript)
  index.ts        Main entry point
  routes.ts       API route definitions
  storage.ts      Database abstraction layer
/shared         Shared Zod schemas and database types
  schema.ts       All entity schemas
/migrations     Database migrations (auto-generated)
```

---

## 4. Development Commands

```bash
npm run dev      # Start development server with hot reload (port 5000)
npm run build    # Build client (Vite) and server (esbuild) for production
npm run start    # Run production build
npm run check    # TypeScript type checking
npm run db:push  # Push database schema changes to PostgreSQL
```

### Development Workflow

- Local development uses Vite dev middleware integrated into Express server
- Production build creates `/dist/public` (client) and `/dist/index.js` (server)
- Server serves static files from `/dist/public` in production

---

## 5. Architecture

### Monorepo Structure

```
/client   - React frontend (Vite + TypeScript)
/server   - Express backend (Node.js + TypeScript)
/shared   - Shared Zod schemas and database types
```

### Data Hierarchy & Relations

```
ventures (saas/media/realty/trading/personal)
  └── projects (product/marketing/ops/etc)
       └── phases (Phase 1, Phase 2, etc)
            └── tasks (atomic work items)

days (daily logs)
  └── tasks (scheduled for this day)
  └── healthEntries
  └── nutritionEntries

captureItems (inbox)
  └── can convert to tasks
```

---

## 6. Database Schema

All schemas defined with Zod in `/shared/schema.ts` for runtime validation. Use Drizzle ORM for queries.

### 6.1. ventures

Business/personal initiatives (top level).

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `name` | string | Venture name |
| `status` | enum | `active`, `development`, `paused`, `archived` |
| `domain` | enum | `saas`, `media`, `realty`, `trading`, `personal`, `other` |
| `oneLiner` | string | One-sentence description |
| `primaryFocus` | text | Main strategic focus |
| `color` | string | Display color |
| `icon` | string | Display icon |
| `notes` | text | Additional notes |
| `createdAt` | timestamp | Creation timestamp |
| `updatedAt` | timestamp | Last update |

### 6.2. projects

Concrete initiatives within ventures.

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `name` | string | Project title |
| `ventureId` | fk → ventures | Parent venture |
| `status` | enum | `not_started`, `active`, `on_hold`, `done`, `cancelled` |
| `category` | enum | `product`, `marketing`, `operations`, `finance`, `research` |
| `priority` | enum | `P0`, `P1`, `P2`, `P3` |
| `startDate` | date | Planned start |
| `targetEndDate` | date | Target completion |
| `actualEndDate` | date | Actual completion (nullable) |
| `outcome` | text | What success looks like |
| `notes` | text | Strategy, plan, links |
| `budget` | number | Budget amount |
| `budgetSpent` | number | Spent amount |
| `revenueGenerated` | number | Revenue generated |

### 6.3. phases

Project phases and key deliverables.

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `name` | string | Phase name |
| `projectId` | fk → projects | Parent project |
| `status` | enum | Phase status |
| `order` | number | Display order |
| `targetDate` | date | Target date |
| `notes` | text | Phase notes |

### 6.4. tasks

Atomic units of execution.

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `title` | string | Task title |
| `status` | enum | `idea`, `next`, `in_progress`, `blocked`, `done`, `cancelled` |
| `priority` | enum | `P0`, `P1`, `P2`, `P3` |
| `type` | enum | `business`, `deep_work`, `admin`, `personal`, `learning` |
| `domain` | enum | `work`, `health`, `finance`, `learning`, `personal` |
| `ventureId` | fk → ventures | Parent venture (nullable) |
| `projectId` | fk → projects | Parent project (nullable) |
| `phaseId` | fk → phases | Parent phase (nullable) |
| `dayId` | fk → days | Day explicitly scheduled (nullable) |
| `dueDate` | date | Hard deadline (nullable) |
| `focusDate` | date | Day planned to work on it |
| `focusSlot` | enum | Time slot (see Focus Slots) |
| `estEffort` | float | Estimated hours |
| `actualEffort` | float | Actual hours (nullable) |
| `notes` | text | Details, context, links |
| `tags` | text | Comma-separated tags |
| `completedAt` | timestamp | Completion timestamp |

### 6.5. captureItems

GTD-style inbox for raw thoughts.

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `title` | text | Capture text |
| `type` | enum | `idea`, `task`, `note`, `link`, `reminder` |
| `source` | enum | `brain`, `whatsapp`, `email`, `meeting`, `web` |
| `domain` | enum | `work`, `health`, `finance`, `learning`, `personal` |
| `ventureId` | fk → ventures | Link to venture (nullable) |
| `projectId` | fk → projects | Link to project (nullable) |
| `linkedTaskId` | fk → tasks | If converted to task (nullable) |
| `clarified` | boolean | Has this been processed? |
| `notes` | text | Additional context |
| `clarifiedAt` | timestamp | When processed (nullable) |

### 6.6. days

Daily logs (central hub for each day).

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `date` | date | YYYY-MM-DD (unique) |
| `title` | string | Day theme/title |
| `mood` | enum | `low`, `medium`, `high`, `peak` |
| `top3Outcomes` | text | Three most important outcomes |
| `oneThingToShip` | text | Single most leveraged deliverable |
| `reflectionAm` | text | Morning intention |
| `reflectionPm` | text | Evening review |
| `primaryVentureFocus` | fk → ventures | Main venture for the day |

### 6.7. healthEntries

Daily health metrics (one per day).

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `dayId` | fk → days | Parent day |
| `date` | date | Entry date |
| `sleepHours` | float | Hours slept |
| `sleepQuality` | enum | `poor`, `fair`, `good`, `excellent` |
| `energyLevel` | int | 1–5 scale |
| `mood` | enum | `low`, `medium`, `high`, `peak` |
| `steps` | int | Steps walked |
| `weightKg` | float | Weight in kg |
| `stressLevel` | enum | `low`, `medium`, `high` |
| `workoutDone` | boolean | Did workout happen? |
| `workoutType` | enum | `strength`, `cardio`, `yoga`, `sports`, `none` |
| `workoutDurationMin` | int | Workout duration in minutes |
| `tags` | text | Context tags |
| `notes` | text | Subjective context |

### 6.8. nutritionEntries

Meal logs (multiple per day).

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `dayId` | fk → days | Parent day |
| `datetime` | timestamp | Date + time of meal |
| `mealType` | enum | `breakfast`, `lunch`, `dinner`, `snack` |
| `description` | string | Meal description |
| `calories` | float | Approximate calories |
| `proteinG` | float | Protein in grams |
| `carbsG` | float | Carbs in grams |
| `fatsG` | float | Fats in grams |
| `context` | enum | `home`, `restaurant`, `office`, `travel` |
| `tags` | text | Meal tags |
| `notes` | text | Additional context |

### 6.9. docs

SOPs, prompts, playbooks, specs, templates.

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `title` | string | Doc title |
| `type` | enum | `sop`, `prompt`, `playbook`, `spec`, `template`, `note` |
| `domain` | enum | `venture_ops`, `marketing`, `product`, `personal`, `finance` |
| `status` | enum | `draft`, `active`, `archived` |
| `ventureId` | fk → ventures | Parent venture (nullable) |
| `projectId` | fk → projects | Parent project (nullable) |
| `body` | text | Markdown content |
| `tags` | text | Tags for search |

### 6.10. users

User profile (single-user system).

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `email` | string | Email address |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `timezone` | string | Default timezone |

### 6.11. sessions

Express session storage (managed by connect-pg-simple).

---

## 7. API Reference

All routes prefixed with `/api`.

### Ventures
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ventures` | List all ventures |
| POST | `/api/ventures` | Create venture |
| PATCH | `/api/ventures/:id` | Update venture |
| DELETE | `/api/ventures/:id` | Delete venture |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects (supports `?ventureId=` filter) |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Phases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/phases` | List phases (supports `?projectId=` filter) |
| POST | `/api/phases` | Create phase |
| PATCH | `/api/phases/:id` | Update phase |
| DELETE | `/api/phases/:id` | Delete phase |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (supports filters: `ventureId`, `projectId`, `status`) |
| GET | `/api/tasks/today` | Get today's tasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

### Captures
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/captures` | List capture items |
| POST | `/api/captures` | Create capture |
| PATCH | `/api/captures/:id` | Update capture |
| DELETE | `/api/captures/:id` | Delete capture |
| POST | `/api/captures/:id/convert` | Convert capture to task |

### Days
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/days/today` | Get or create today's day record |
| GET | `/api/days/:date` | Get day by date (YYYY-MM-DD) |
| POST | `/api/days` | Create day record |
| PATCH | `/api/days/:id` | Update day |
| DELETE | `/api/days/:id` | Delete day |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | List health entries |
| POST | `/api/health` | Create health entry |
| PATCH | `/api/health/:id` | Update health entry |
| DELETE | `/api/health/:id` | Delete health entry |

### Nutrition
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nutrition` | List nutrition entries |
| POST | `/api/nutrition` | Create nutrition entry |
| PATCH | `/api/nutrition/:id` | Update nutrition entry |
| DELETE | `/api/nutrition/:id` | Delete nutrition entry |

### Docs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docs` | List docs (supports filters) |
| GET | `/api/docs/search` | Search docs by query |
| POST | `/api/docs` | Create doc |
| PATCH | `/api/docs/:id` | Update doc |
| DELETE | `/api/docs/:id` | Delete doc |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/user` | Get current user (mock for single-user) |

---

## 8. Key Files

### Server

#### `server/index.ts`
Main entry point that:
- Sets up Express app with Vite dev middleware (dev) or static serving (prod)
- Configures session management with PostgreSQL storage
- Registers API routes and error handlers

#### `server/storage.ts`
Database abstraction layer (`DBStorage` class):
- Implements `IStorage` interface for all database operations
- Uses Drizzle ORM with Neon serverless PostgreSQL
- Handles ventures, projects, tasks, phases, captures, days, health, nutrition, docs

#### `server/routes.ts`
All API route definitions and handlers.

### Client

#### `client/src/App.tsx`
Main router with authentication guards using Wouter and TanStack Query for user state.

#### `client/src/pages/`
| File | Description |
|------|-------------|
| `command-center.tsx` | Daily overview with tasks, health, nutrition snapshots |
| `venture-hq.tsx` | Ventures grid and overview |
| `venture-detail.tsx` | Single venture with projects, tasks, docs |
| `health-hub.tsx` | Health metrics tracking and calendar |
| `nutrition-dashboard.tsx` | Meal logging and nutrition goals |
| `knowledge-hub.tsx` | Docs library with search and filters |
| `doc-detail.tsx` | Single document view/edit |
| `deep-work.tsx` | Weekly calendar and focus session planning |
| `notifications.tsx` | Notification history |

#### `client/src/components/ui/*`
47 shadcn/ui components - prefer these over creating custom components.

---

## 9. UX Modules & Screens

### 9.1. Command Center (Home)

The default screen. Unified view of today's tasks, health, nutrition, and inbox.

**Components:**
- **Today Overview**: Day title, date, primary venture focus
- **Top 3 Outcomes**: `Day.top3Outcomes`
- **One Thing to Ship**: `Day.oneThingToShip`
- **Tasks: Today**: Filtered by `focusDate = today` OR `dueDate = today`, grouped by venture
- **Health Snapshot**: Sleep, energy, mood, workout status
- **Nutrition Snapshot**: Total calories, protein, carbs, fats
- **Capture Inbox**: Unclarified items with convert-to-task action
- **This Week Preview**: Upcoming tasks grouped by venture

### 9.2. Venture HQ

High-level view of all ventures with drill-down.

**Components:**
- **Venture Dashboard**: List of ventures with status, project count, task count
- **Venture Detail View**:
  - Projects Board (Kanban or list by status)
  - Tasks List (grouped by project)
  - Docs & SOPs
  - Metrics (future)

### 9.3. Deep Work & Planning

Dedicated view for planning and executing deep work sessions.

**Components:**
- **Deep Work Queue**: Tasks filtered by `type = deep_work`
- **Weekly Calendar**: 7 days × focus slots grid with drag-and-drop
- **Focus Session Timer** (optional): Track actual effort

### 9.4. Health & Performance Hub

Track health metrics and correlate with performance.

**Components:**
- **Health Calendar**: 30-day view with color-coded energy/mood
- **Health Table**: Last 30 entries with all metrics
- **Weekly/Monthly Summary**: Averages and trends

### 9.5. Nutrition Dashboard

Track meals, macros, and nutrition trends.

**Components:**
- **Today's Meals**: List with macro totals
- **Weekly Summary**: Daily calories/protein chart
- **Add/Edit Meal**: Form for meal logging

### 9.6. Knowledge Hub

Central repository for SOPs, prompts, playbooks.

**Components:**
- **Knowledge Library**: Tabs for All, SOPs, Prompts, Playbooks, Specs
- **Search**: By title, tags, domain, venture
- **Doc Detail View**: Rich text/markdown display with edit capability

---

## 10. Focus Slots (Time Blocking)

Tasks can be assigned to specific time blocks for scheduling:

| Slot | Time | Purpose |
|------|------|---------|
| `deep_work_1` | 9-11am | Deep strategic/creative work |
| `deep_work_2` | 2-4pm | Deep execution work |
| `admin_block_1` | 11am-12pm | Email, admin, quick tasks |
| `admin_block_2` | 4-5pm | Wrap up, admin |
| `morning_routine` | 6-9am | Health, planning, breakfast |
| `evening_review` | 5-6pm | Review, reflection, planning |
| `meetings` | Anytime | Meetings, calls |
| `buffer` | Anytime | Flex time, unexpected |

---

## 11. Automation & Logic Layer

### 11.1. Daily Day Record Auto-Creation

**Trigger**: First load of Command Center each day

**Logic**: If no Day record exists for today, create one with default values.

### 11.2. Task Surfacing: Today's Tasks

**Trigger**: Load Command Center

**Logic**:
```sql
SELECT * FROM tasks
WHERE status NOT IN ('done', 'cancelled')
  AND (focus_date = today OR due_date = today OR day_id = today_id)
ORDER BY priority ASC, focus_slot ASC
```

### 11.3. Capture → Task Conversion

**Trigger**: User clicks "Convert to Task"

**Logic**:
1. Create Task with capture's title, notes, venture/project
2. Update Capture: set `linkedTaskId`, `clarified = true`, `clarifiedAt = now()`

### 11.4. Health/Nutrition → Day Linking

**Trigger**: User logs entry

**Logic**: Ensure Day record exists for the date, link entry to Day.

### 11.5. Project Status Auto-Suggest

**Trigger**: Task marked done

**Logic**: If all project tasks are done, suggest marking project as done.

### 11.6. Task → Day Auto-Linking

**Trigger**: Task scheduled to focus slot

**Logic**: Create/get Day for selected date, link task via `dayId` and `focusDate`.

---

## 12. Integration Points

### 12.1. Notion Integration (Future)

- Bidirectional sync for Ventures, Projects, Tasks, Days, Docs
- Store `externalId` (Notion page ID) on entities

### 12.2. Google Calendar (Future)

- Map tasks with `focusDate + focusSlot` → GCal events
- Sync task scheduling changes

### 12.3. WhatsApp/Telegram Quick Capture (Future)

- Webhook endpoints for message capture
- Parse "Task:", "Idea:", "Note:" prefixes
- Create Capture Items with `source = whatsapp/telegram`

### 12.4. AI Integration (Future)

Environment variables (optional):
- `OPENROUTER_API_KEY` - OpenRouter API key (OpenAI-compatible)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

---

## 13. Environment Configuration

Required environment variables (`.env`):

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | Express session encryption key | Random string |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |

Optional:
| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |

---

## 14. Code Patterns

### Type Safety
- Use path aliases: `@/` for client code, `@shared/` for shared schemas
- Strict TypeScript enabled - all code must type-check with `npm run check`
- Zod schemas in `/shared/schema.ts` are source of truth for validation
- Use `drizzle-zod` for database schema type inference

### API Communication
- Frontend uses TanStack Query with `apiRequest` helper from `client/src/lib/utils.ts`
- All API calls include credentials for session cookies
- Query keys follow pattern: `["resource", id]` (e.g., `["ventures"]`, `["tasks"]`)

### Error Handling
- Express global error handler catches all route errors
- Zod validation errors return 400 with validation messages
- Database errors logged and return 500

### Session Management
- Sessions stored in PostgreSQL via `connect-pg-simple`
- Session cookie name: `connect.sid`
- Currently using mock auth (single-user system)

### Database Migrations
- Schema changes go in `/shared/schema.ts`
- Run `npm run db:push` to apply changes (Drizzle Kit auto-generates migrations)
- Migrations stored in `/migrations` directory
- DO NOT manually edit migration files

---

## 15. Common Development Tasks

### Adding a New API Route
1. Define Zod schema in `/shared/schema.ts` if needed
2. Add route handler in `server/routes.ts`
3. Update frontend API call in appropriate page component
4. Use TanStack Query for data fetching/mutations

### Modifying Database Schema
1. Update schema in `/shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Check `/migrations` for generated migration file
4. Update relevant `storage.ts` methods if needed

### Adding shadcn/ui Components
Components are already installed. To add new ones:
```bash
npx shadcn-ui@latest add [component-name]
```
Components appear in `client/src/components/ui/`.

### Adding a New Page
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Add navigation link if needed
4. Use TanStack Query for data fetching

---

## 16. Roadmap

### Phase 1: Complete Foundation ✅
- ✅ Core entities (ventures, projects, tasks, captures, docs)
- ✅ Health & nutrition tracking
- ✅ Daily planning hub (days table)
- ✅ Phases for project organization
- 🚧 Budget tracking for projects
- 🚧 Focus slot scheduling system

### Phase 2: Daily Operations
- Build comprehensive daily dashboard
- Morning planning + evening review workflow
- Focus session timer
- Task-to-slot assignment UI

### Phase 3: AI Integration
- Telegram bot for quick queries and task creation
- GPT assistant for context-aware help
- Natural language task creation
- Meeting management and calendar sync

### Phase 4: Integrations
- Notion bidirectional sync
- Google Calendar sync
- WhatsApp/Telegram quick capture
- Webhook events for automation tools

### Phase 5: Advanced Features
- Venture-specific dashboards (Trading P&L, content calendars)
- AI-powered task prioritization
- Smart scheduling based on energy levels
- Analytics and insights

---

## Deployment

The app can be deployed to:
- **Railway** (recommended for PostgreSQL + web hosting)
- **Vercel** (with external database)
- Any Node.js hosting platform

---

## License

Private project - not open source.

---

**SB-OS: Built with focus and intention.**
