# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aura** is a full-stack AI-powered personal assistant application that manages calendars and appointments through conversational interfaces (WhatsApp, Telegram) and a web dashboard. It integrates Google Calendar with multi-platform messaging via AI conversation handling.

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
- Replit deployment: external port 80 maps to local port 5000

## Architecture

### Monorepo Structure
```
/client   - React frontend (Vite + TypeScript)
/server   - Express backend (Node.js + TypeScript)
/shared   - Shared Zod schemas and database types
```

### Technology Stack
- **Frontend**: React 18, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Express, Drizzle ORM with Neon PostgreSQL, Passport.js auth
- **AI**: OpenAI API via Replit AI Integrations
- **Calendar**: Google Calendar API via Replit Connectors
- **Messaging**: Telegraf (Telegram), Twilio/Meta/MessageBird (WhatsApp)
- **Auth**: Replit OpenID Connect with PostgreSQL session store

### Key Server Files

#### `server/index.ts`
Main entry point that:
- Sets up Express app with Vite dev middleware (dev) or static serving (prod)
- Initializes Telegram bot (webhook in production, polling in development)
- Configures Replit Auth with session management
- Registers API routes and error handlers

#### `server/ai-assistant.ts`
AI conversation handler:
- Processes messages through OpenAI with conversation history
- Implements tool-calling for calendar operations (query, book, reschedule, cancel)
- Manages pending confirmations via `pendingConfirmations` Map
- Builds context-aware prompts with assistant settings and working hours

#### `server/storage.ts`
Database abstraction layer (`DBStorage` class):
- Implements `IStorage` interface for all database operations
- Uses Drizzle ORM with Neon serverless PostgreSQL
- Handles users, messages, appointments, and assistant settings

#### `server/google-calendar.ts`
Google Calendar integration:
- CRUD operations on calendar events
- Free/busy checking and availability queries
- Attendee management with email invitations
- Uses Replit Google Calendar connector credentials

#### `server/telegram-bot.ts` / `server/twilio-whatsapp.ts`
Platform-specific message handlers:
- Telegram: Telegraf bot with webhook/polling modes
- WhatsApp: Multi-provider webhook detection (Twilio, Meta, MessageBird)
- Both delegate to AI assistant for message processing

#### `server/routes.ts`
API route definitions for:
- Authentication (`/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`)
- Messages (`/api/messages`, `/api/messages/:phoneNumber`)
- Appointments (`/api/appointments`, `/api/appointments/:id`)
- Settings (`/api/settings`)
- Webhooks (`/api/whatsapp-webhook`, `/api/telegram-webhook`)

### Key Client Files

#### `client/src/App.tsx`
Main router with authentication guards using Wouter and TanStack Query for user state.

#### `client/src/pages/dashboard.tsx`
Tab-based dashboard with Messages, Appointments, and Settings views.

#### `client/src/components/ui/*`
47 shadcn/ui components - prefer these over creating custom components.

### Database Schema (`/shared/schema.ts`)

**Tables**:
1. `users` - Replit Auth user information (id, email, firstName, lastName, profileImageUrl)
2. `sessions` - Express session storage (sid, sess, expire)
3. `whatsappMessages` - Message history for both WhatsApp and Telegram (platform column distinguishes)
4. `appointments` - Calendar appointments with Google Calendar sync (googleEventId)
5. `assistantSettings` - AI assistant configuration (name, timezone, working hours, preferences)

All schemas defined with Zod for runtime validation. Use Drizzle ORM for queries.

## Code Patterns

### Type Safety
- Use path aliases: `@/` for client code, `@shared/` for shared schemas
- Strict TypeScript enabled - all code must type-check with `npm run check`
- Zod schemas in `/shared/schema.ts` are source of truth for validation
- Use `drizzle-zod` for database schema type inference

### AI Assistant Pattern
The AI assistant uses a confirmation workflow for booking appointments:
1. User requests appointment → AI calls tools to check availability
2. If slot found → Store pending confirmation in `pendingConfirmations` Map
3. User confirms → Execute action (create Google Calendar event + database record)
4. User cancels → Delete pending confirmation

When modifying AI behavior:
- Update system prompt in `server/ai-assistant.ts:49`
- Add new tools in the OpenAI function calling configuration
- Tools must be implemented in the switch statement at the bottom of `processMessage()`

### Multi-Platform Messaging
WhatsApp webhooks support three providers with different payload formats:
- **Twilio**: Returns TwiML XML, extracts `Body` and `From` parameters
- **Meta/Facebook**: JSON payload with `entry[].changes[].value.messages[]`
- **MessageBird**: JSON payload with `contacts[]` and `messages[]`

Provider detection happens in `server/twilio-whatsapp.ts`. The `platform` column in `whatsappMessages` table stores 'whatsapp' or 'telegram'.

### API Communication
- Frontend uses TanStack Query with `apiRequest` helper from `client/src/lib/utils.ts`
- All API calls include credentials for session cookies
- Query keys follow pattern: `["resource", id]` (e.g., `["user"]`, `["appointments"]`)

### Error Handling
- Express global error handler catches all route errors
- Zod validation errors return 400 with validation messages
- AI errors logged but return friendly user-facing messages
- Calendar API errors handled gracefully (e.g., event already deleted)

## Environment Configuration

Required environment variables (set via Replit Secrets or `.env`):
- `DATABASE_URL` - Neon PostgreSQL connection string
- `SESSION_SECRET` - Express session encryption key
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key via Replit connector
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL via Replit connector
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `WEBHOOK_URL` - Public URL for Telegram/WhatsApp webhooks (auto-set by Replit)

Replit Connectors automatically populate Google Calendar credentials.

## Important Notes

### Database Migrations
- Schema changes go in `/shared/schema.ts`
- Run `npm run db:push` to apply changes (Drizzle Kit auto-generates migrations)
- Migrations stored in `/migrations` directory
- DO NOT manually edit migration files

### Telegram Bot Modes
- **Development**: Uses polling (`bot.launch()`) - no webhook setup required
- **Production**: Uses webhook (`bot.telegram.setWebhook()`) - requires public URL

### Replit Deployment
- Only external port 80 is allowed (maps to internal port 5000)
- Server must handle both API routes and static file serving
- Graceful shutdown: Telegram bot cleanup on SIGINT/SIGTERM

### Session Management
- Sessions stored in PostgreSQL via `connect-pg-simple`
- Session cookie name: `connect.sid`
- Auth protected routes check `req.user` (set by Passport.js)

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

### Adding a New AI Tool
1. Define tool schema in `server/ai-assistant.ts` tools array
2. Implement tool handler in `processMessage()` switch statement
3. Update system prompt if tool requires context
4. Test with both WhatsApp and Telegram

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
