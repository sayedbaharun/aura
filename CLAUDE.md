# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hikma-OS** (formerly Aura) is a full-stack personal operating system and productivity engine for managing multiple business ventures, projects, tasks, health, and knowledge. Built as a custom "second brain" to replace Notion, Todoist, and other fragmented productivity tools.

## Development Commands

### Core Commands
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

## Architecture

### Monorepo Structure
```
/client   - React frontend (Vite + TypeScript)
/server   - Express backend (Node.js + TypeScript)
/shared   - Shared Zod schemas and database types
```

### Technology Stack
- **Frontend**: React 18, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Express, Drizzle ORM with Neon PostgreSQL
- **Database**: PostgreSQL (Neon serverless)
- **Auth**: Simple session-based auth (currently mock user for single-user system)

### Key Server Files

#### `server/index.ts`
Main entry point that:
- Sets up Express app with Vite dev middleware (dev) or static serving (prod)
- Configures session management with PostgreSQL storage
- Registers API routes and error handlers

#### `server/storage.ts`
Database abstraction layer (`DBStorage` class):
- Implements `IStorage` interface for all database operations
- Uses Drizzle ORM with Neon serverless PostgreSQL
- Handles ventures, projects, tasks, milestones, captures, days, health, nutrition, docs

#### `server/routes.ts`
API route definitions for:
- **Ventures**: GET /api/ventures, POST, PATCH, DELETE
- **Projects**: GET /api/projects (with filters), POST, PATCH, DELETE
- **Milestones**: GET /api/milestones, POST, PATCH, DELETE
- **Tasks**: GET /api/tasks (with filters), GET /api/tasks/today, POST, PATCH, DELETE
- **Captures**: GET /api/captures, POST, PATCH, DELETE, POST /api/captures/:id/convert
- **Days**: GET /api/days/today, GET /api/days/:date, POST, PATCH, DELETE
- **Health**: GET /api/health, POST, PATCH, DELETE
- **Nutrition**: GET /api/nutrition, POST, PATCH, DELETE
- **Docs**: GET /api/docs, GET /api/docs/search, POST, PATCH, DELETE
- **Auth**: GET /api/auth/user (mock)

### Key Client Files

#### `client/src/App.tsx`
Main router with authentication guards using Wouter and TanStack Query for user state.

#### `client/src/pages/`
Main application pages:
- **command-center.tsx** - Daily overview with tasks, health, nutrition snapshots
- **venture-hq.tsx** - Ventures grid and overview
- **venture-detail.tsx** - Single venture with projects, tasks, docs
- **health-hub.tsx** - Health metrics tracking and calendar
- **nutrition-dashboard.tsx** - Meal logging and nutrition goals
- **knowledge-hub.tsx** - Docs library with search and filters
- **doc-detail.tsx** - Single document view/edit
- **deep-work.tsx** - Weekly calendar and focus session planning
- **notifications.tsx** - Notification history

#### `client/src/components/ui/*`
47 shadcn/ui components - prefer these over creating custom components.

### Database Schema (`/shared/schema.ts`)

**Core Entities**:

1. **ventures** - Business/personal initiatives (top level)
   - name, status, domain, oneLiner, primaryFocus
   - color, icon, notes
   - Hierarchy: Ventures contain projects

2. **projects** - Concrete initiatives within ventures
   - name, ventureId, status, category, priority
   - startDate, targetEndDate, actualEndDate
   - outcome, notes
   - **budget, budgetSpent, revenueGenerated** (NEW)

3. **milestones** - Project phases and key deliverables (NEW)
   - name, projectId, status, order
   - targetDate, notes

4. **tasks** - Atomic units of execution
   - title, status, priority, type, domain
   - ventureId, projectId, milestoneId, dayId
   - dueDate, focusDate, focusSlot
   - estEffort, actualEffort (hours)
   - notes, tags

5. **captureItems** - Inbox for raw thoughts (GTD-style)
   - title, type, source, domain
   - ventureId, projectId, linkedTaskId
   - clarified (boolean)

6. **days** - Daily logs (central hub for each day)
   - date, title, mood
   - top3Outcomes, oneThingToShip
   - reflectionAm, reflectionPm
   - primaryVentureFocus

7. **healthEntries** - Daily health metrics
   - dayId, date
   - sleepHours, sleepQuality, energyLevel, mood
   - steps, weightKg, stressLevel
   - workoutDone, workoutType, workoutDurationMin
   - tags, notes

8. **nutritionEntries** - Meal logs
   - dayId, datetime, mealType
   - description, calories
   - proteinG, carbsG, fatsG
   - context, tags, notes

9. **docs** - SOPs, prompts, playbooks, specs, templates
   - title, type, domain, status
   - ventureId, projectId
   - body (markdown), tags

10. **users** - User profile (single-user system)
    - email, firstName, lastName, timezone

11. **sessions** - Express session storage

All schemas defined with Zod for runtime validation. Use Drizzle ORM for queries.

### Focus Slots (Time Blocking System)

Tasks can be assigned to specific time blocks for scheduling:
- **deep_work_1** (9-11am): Deep strategic/creative work
- **deep_work_2** (2-4pm): Deep execution work
- **admin_block_1** (11am-12pm): Email, admin, quick tasks
- **admin_block_2** (4-5pm): Wrap up, admin
- **morning_routine** (6-9am): Health, planning, breakfast
- **evening_review** (5-6pm): Review, reflection, planning
- **meetings**: Anytime: Meetings, calls
- **buffer**: Anytime: Flex time, unexpected

## Code Patterns

### Type Safety
- Use path aliases: `@/` for client code, `@shared/` for shared schemas
- Strict TypeScript enabled - all code must type-check with `npm run check`
- Zod schemas in `/shared/schema.ts` are source of truth for validation
- Use `drizzle-zod` for database schema type inference

### Hierarchy & Relations
```
ventures (saas/media/realty/trading/personal)
  └── projects (product/marketing/ops/etc)
       └── milestones (Phase 1, Phase 2, etc)
            └── tasks (atomic work items)

days (daily logs)
  └── tasks (scheduled for this day)
  └── healthEntries
  └── nutritionEntries

captureItems (inbox)
  └── can convert to tasks
```

### API Communication
- Frontend uses TanStack Query with `apiRequest` helper from `client/src/lib/utils.ts`
- All API calls include credentials for session cookies
- Query keys follow pattern: `["resource", id]` (e.g., `["ventures"]`, `["tasks"]`)

### Error Handling
- Express global error handler catches all route errors
- Zod validation errors return 400 with validation messages
- Database errors logged and return 500

## Environment Configuration

Required environment variables (set via `.env`):
- `DATABASE_URL` - PostgreSQL connection string (Neon or other provider)
- `SESSION_SECRET` - Express session encryption key
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

Optional for AI integration:
- `OPENROUTER_API_KEY` - OpenRouter API key (OpenAI-compatible, supports multiple providers)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

## Important Notes

### Database Migrations
- Schema changes go in `/shared/schema.ts`
- Run `npm run db:push` to apply changes (Drizzle Kit auto-generates migrations)
- Migrations stored in `/migrations` directory
- DO NOT manually edit migration files

### Session Management
- Sessions stored in PostgreSQL via `connect-pg-simple`
- Session cookie name: `connect.sid`
- Currently using mock auth (single-user system)

### Single-User System
This is a personal productivity system built for one user. Authentication is simplified:
- No signup/login flow
- Mock user returned from `/api/auth/user`
- Future: Can add proper OAuth if needed

## Testing

No testing framework currently configured. To add tests:
- Recommended: Vitest (integrates with Vite)
- Test files should match `*.test.ts` pattern
- Add test command to `package.json` scripts

## Common Development Tasks

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

## Future Roadmap

### Phase 1: Complete Foundation (In Progress)
- ✅ Core entities (ventures, projects, tasks, captures, docs)
- ✅ Health & nutrition tracking
- ✅ Daily planning hub (days table)
- 🚧 Milestones for project phases
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

## Project Philosophy

Hikma-OS is designed around these principles:

1. **Single Source of Truth**: All life data in one system
2. **Hierarchy Matters**: Ventures → Projects → Tasks creates clarity
3. **Time Blocking**: Assign work to specific time slots
4. **Daily Rituals**: Morning planning, evening review
5. **Health = Foundation**: Track wellness alongside work
6. **Knowledge Base**: SOPs and playbooks for repeatability
7. **Simple First**: Build what's needed, add complexity later
