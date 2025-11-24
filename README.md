# Hikma-OS

**Personal Operating System & Productivity Engine**

A full-stack web application for managing multiple business ventures, projects, tasks, health tracking, and knowledge management. Built as a custom "second brain" to replace Notion, Todoist, and other fragmented productivity tools.

## 🎯 What is Hikma-OS?

Hikma-OS (formerly Aura) is a personal productivity system designed for managing:
- **Multiple Ventures** - Business initiatives across different domains (SaaS, media, realty, trading, personal)
- **Project Management** - Time-bound initiatives with milestones, budgets, and outcomes
- **Task Execution** - Atomic work items with time blocking and effort tracking
- **Health & Wellness** - Daily health metrics and nutrition logging
- **Knowledge Base** - SOPs, playbooks, specs, and templates
- **Daily Operations** - Morning planning, evening review, and reflection rituals

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Neon, Railway, or local)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd aura

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your DATABASE_URL

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

## 📁 Project Structure

```
/client         React frontend (Vite + TypeScript)
/server         Express backend (Node.js + TypeScript)
/shared         Shared Zod schemas and database types
/docs           Documentation (mostly historical)
```

## 🛠 Tech Stack

- **Frontend**: React 18, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Express, Drizzle ORM, PostgreSQL
- **Database**: PostgreSQL (Neon serverless)
- **Build**: Vite (client), esbuild (server)

## 📊 Data Model

### Core Hierarchy
```
Ventures (Business/Life Areas)
  └── Projects (Time-bound initiatives)
       └── Milestones (Project phases)
            └── Tasks (Atomic work items)
```

### Additional Entities
- **Days** - Daily logs with planning and reflection
- **Captures** - GTD-style inbox for quick thoughts
- **Health Entries** - Daily wellness metrics
- **Nutrition Entries** - Meal logging
- **Docs** - Knowledge base (SOPs, playbooks, specs)

## 🎯 Key Features

### Strategic Management
- Multi-venture portfolio view
- Project tracking with budgets and ROI
- Milestone-based project phases
- Priority-based task organization

### Time Blocking
Tasks can be assigned to specific focus slots:
- **Deep Work 1** (9-11am) - Strategic/creative work
- **Deep Work 2** (2-4pm) - Execution work
- **Admin Blocks** (11am-12pm, 4-5pm) - Email, admin tasks
- **Morning Routine** (6-9am) - Health, planning
- **Evening Review** (5-6pm) - Reflection, planning

### Health & Wellness
- Sleep, energy, mood tracking
- Workout logging (type, duration)
- Weight and step tracking
- Nutrition logging with macro tracking

### Knowledge Management
- SOPs, prompts, specs, templates, playbooks
- Full-text search across docs
- Tag-based organization
- Venture/project associations

## 🗓 Daily Workflow

1. **Morning** (6-9am)
   - Health check-in
   - Review today's schedule
   - Set "one thing to ship"

2. **Deep Work Blocks**
   - Scheduled focus sessions
   - No interruptions
   - Effort tracking

3. **Evening Review** (5-6pm)
   - Review completed tasks
   - Log reflections
   - Plan tomorrow

## 📚 Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive development documentation including:
- Architecture overview
- Database schema details
- API routes reference
- Development patterns
- Common tasks

## 🛣 Roadmap

### Phase 1: Foundation (In Progress)
- ✅ Core entities (ventures, projects, tasks)
- ✅ Health & nutrition tracking
- 🚧 Milestones and budget tracking
- 🚧 Focus slot scheduling UI

### Phase 2: Daily Operations
- Daily dashboard with time blocks
- Morning planning workflow
- Evening review workflow
- Focus session timer

### Phase 3: AI Integration
- Telegram bot for quick queries
- GPT assistant for context-aware help
- Natural language task creation
- Meeting management

## 🔧 Development Commands

```bash
npm run dev      # Start dev server (port 5000)
npm run build    # Build for production
npm run start    # Run production build
npm run check    # TypeScript type checking
npm run db:push  # Push schema changes to database
```

## 🏗 Deployment

The app can be deployed to:
- Railway (recommended for PostgreSQL + web hosting)
- Vercel (with external database)
- Any Node.js hosting platform

Environment variables required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

## 📄 License

Private project - not open source.

## 🤝 Contributing

This is a personal productivity system. Not accepting external contributions.

---

**Built with focus and intention.**
