# Aura - AI Personal Assistant - Replit Project Guide

## Overview

This is a Telegram and WhatsApp-integrated AI personal assistant application named "Aura" that manages calendars and appointments through conversational interactions. The system uses OpenAI for natural language processing and Google Calendar for appointment management. Users interact with Aura primarily via Telegram (with optional WhatsApp support), and administrators can monitor conversations and appointments through a secure web dashboard.

The application is built as a full-stack TypeScript application with a React frontend, Express backend, and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **Vite** for development server and production builds with React plugin
- **React 18** with TypeScript for UI components
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** (React Query) for server state management with 5-second auto-refresh intervals

**UI Component System**
- **shadcn/ui** component library based on Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens following healthcare SaaS aesthetic
- **New York** style variant from shadcn with professional blue color scheme
- Custom CSS variables for theming with light/dark mode support

**Design Philosophy**
- Hybrid approach combining Linear's clarity with healthcare-appropriate trust signals
- Professional color palette centered on trust (blue primary) with semantic status colors
- Inter font family for consistent typography
- Elevation-based interaction patterns (hover/active states)

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for REST API
- Custom Vite integration for development with HMR support
- Production build using esbuild for server bundling

**API Structure**
- RESTful endpoints under `/api` prefix:
  - `/api/messages` - Message CRUD operations (supports both Telegram and WhatsApp)
  - `/api/appointments` - Appointment management
  - `/api/settings` - Assistant configuration
  - `/api/telegram-webhook` - Telegram bot webhook endpoint
  - `/api/whatsapp-webhook` - WhatsApp webhook endpoint (optional)
- Query parameters for filtering (e.g., by phone number/chat ID)
- Standardized error handling middleware

**AI Integration**
- **OpenAI API** via Replit AI Integrations for natural language understanding (GPT-4o)
- Conversation context management with message history (10 messages)
- Multi-turn tool calling loop - AI can search events, extract times, and use them for follow-up actions
- Pending confirmation system for user actions requiring approval
- Function calling pattern for calendar operations with structured tool results
- Support for search_events, cancel_appointment, reschedule_appointment, and booking with attendees

**Calendar Integration**
- **Google Calendar API** via googleapis library
- OAuth2 authentication through Replit Connectors
- Token refresh handling with 5-minute TTL buffer to prevent mid-call expirations
- Single-flight mutex for concurrency-safe token refresh
- Supports multiple connector response shapes (settings.access_token and oauth.credentials paths)
- Uncacheable client pattern to ensure fresh credentials

### Data Storage

**Database Technology**
- **PostgreSQL** via Neon serverless driver with WebSocket support
- **Drizzle ORM** for type-safe database operations
- Schema-first approach with TypeScript inference

**Schema Design**

Three main tables:

1. **whatsapp_messages** - Message history tracking
   - Stores user and assistant messages
   - Includes AI response metadata
   - Processing status flag
   - Phone number for conversation threading (or chat_id for Telegram)
   - Platform field to distinguish between Telegram and WhatsApp

2. **appointments** - Calendar event records
   - Links to phone numbers for user association (or chat_id for Telegram)
   - Stores appointment metadata (title, date, duration as INTEGER for type safety)
   - Status tracking (pending, confirmed, cancelled)
   - Google Calendar event ID for synchronization
   - Platform field to distinguish between Telegram and WhatsApp
   - Automatic timestamp updates via triggers
   - B-tree indexes on phoneNumber, googleEventId, appointmentDate for query optimization

3. **assistant_settings** - AI configuration
   - Personalization (assistant name, user name)
   - Timezone and working hours
   - Default meeting duration (INTEGER for type safety)
   - Telegram bot username
   - WhatsApp Business number (optional)
   - Custom preferences text
   - Singleton pattern with fixed ID for concurrency-safe initialization

4. **pendingConfirmations** - Persistent confirmation state
   - Unique constraint on chatId prevents duplicate confirmations
   - TTL-based expiration (5 minutes)
   - Atomic upsert operations prevent race conditions
   - Indexed on expiresAt for efficient cleanup

5. **auditLogs** - Security and compliance tracking
   - Records all calendar operations (view, book, cancel, reschedule)
   - Success/failure tracking with error messages
   - Composite indexes on (chatId, timestamp) for efficient queries

**Data Access Pattern**
- Storage abstraction layer (`IStorage` interface)
- `DBStorage` implementation using Drizzle
- Direct SQL for complex queries, ORM for CRUD operations
- Single shared database connection pool (prevents connection leaks)

**Production Hardening (Completed)**

1. **Saga-Style Compensation** - Ensures atomicity between Google Calendar and database:
   - Book: Create calendar event → Save to DB → Rollback calendar if DB fails
   - Cancel: Update DB → Delete from calendar → Rollback DB if calendar fails (idempotent)
   - Reschedule: Update DB → Update calendar → Rollback DB if calendar fails

2. **Confirmation Text Matching** - Exact word matching prevents false positives:
   - Expands contractions (don't → do not, can't → can not)
   - Handles curly apostrophes and unicode quotes
   - Detects uncertainty markers (maybe, later, not now)
   - Prevents false positives (yesterday, no worries)

3. **Database Optimization**:
   - B-tree indexes on all frequently queried columns
   - Composite indexes for dominant query patterns (phone+time, chat+time)
   - Unique constraints prevent race conditions
   - Singleton settings pattern with atomic upsert

4. **Environment Validation** - Fail-fast startup checks:
   - Validates DATABASE_URL (accepts both postgres:// and postgresql://)
   - Verifies OpenAI API credentials
   - Checks Replit connector configuration
   - Validates Telegram bot token
   - Ensures session secret is set
   - Warnings for optional features (WhatsApp)

5. **Type Safety**:
   - Duration fields stored as INTEGER (was TEXT)
   - No parsing required for calculations
   - Database-level numeric validation
   - End-to-end TypeScript type enforcement

### External Dependencies

**Third-Party Services**

1. **OpenAI API**
   - Accessed via Replit AI Integrations environment variables
   - Custom base URL and API key configuration
   - Used for conversational AI and intent understanding

2. **Google Calendar API**
   - OAuth2 authentication via Replit Connectors
   - Event creation, updating, and deletion
   - Availability checking and conflict detection
   - Automatic token refresh mechanism

3. **Telegram Integration**
   - **Telegram Bot API** via Telegraf library
   - Webhook support for production deployments
   - Long polling mode for development
   - Message handling with AI assistant integration
   - Bot token stored securely in Replit Secrets
   - Webhook endpoint: `/api/telegram-webhook`
   - Graceful shutdown handling

4. **WhatsApp Integration via Twilio (Optional)**
   - **Twilio WhatsApp API** for sending and receiving messages
   - Manual credential setup (user declined Replit connector)
   - Webhook-based message receiving at `/api/whatsapp-webhook`
   - Supports multiple webhook formats:
     - **Twilio**: TwiML XML response format (primary)
     - **Facebook/Meta**: JSON webhook with async sending
     - **MessageBird**: JSON webhook format (alternative)
   - Auto-detection of webhook provider
   - Message extraction and response generation
   - WhatsApp Business number stored in assistant settings

5. **Neon Database**
   - Serverless PostgreSQL hosting
   - WebSocket-based connection pooling
   - Accessed via `DATABASE_URL` environment variable

**Development Dependencies**

1. **Replit Platform Services**
   - Connectors API for OAuth management
   - Identity tokens for authentication
   - Cartographer and dev banner plugins for development
   - Runtime error overlay for debugging

2. **UI Component Libraries**
   - Multiple Radix UI primitives for accessible components
   - date-fns for date manipulation
   - embla-carousel for image carousels
   - lucide-react for icons

**Build & Development Tools**
- TypeScript compiler for type checking
- Drizzle Kit for database migrations
- PostCSS with Tailwind for CSS processing
- ESBuild for production server bundling

**Deployment & Production Build**

The application supports two serving modes:

1. **Development Mode** (default with `npm run dev`)
   - Uses Vite dev server for hot module replacement
   - Serves source files directly from `client/src`
   - Ideal for active development

2. **Production Mode** (`npm run start`)
   - Serves pre-built static files from `dist/public`
   - Created by running `npm run build`
   - Used automatically when deployed/published on Replit

**Testing Production Build Locally**

If you need to test the production build in development:

1. Build the production assets:
   ```bash
   npm run build
   ```

2. Add `FORCE_STATIC=1` to the `[env]` section in `.replit`:
   ```toml
   [env]
   PORT = "5000"
   FORCE_STATIC = "1"
   ```

3. Restart the workflow - the server will now serve the built files from `dist/public` even in development mode

**Note**: When you publish the app on Replit, it automatically uses the `[deployment]` configuration which runs `npm run build` and `npm run start`, serving the production build correctly.

**Environment Configuration**
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API access
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI endpoint
- `REPLIT_CONNECTORS_HOSTNAME` - Replit services endpoint
- `REPL_IDENTITY` or `WEB_REPL_RENEWAL` - Authentication tokens
- `REPLIT_DOMAINS` - Auto-populated by Replit in deployments (e.g., "aurasb.replit.app")
- `ALLOWED_ORIGINS` - Optional custom CORS origins (comma-separated)
- `TWILIO_ACCOUNT_SID` - Twilio account identifier (manual setup)
- `TWILIO_AUTH_TOKEN` - Twilio authentication token (manual setup)

**CORS Configuration**

The server automatically allows CORS requests from:
- Localhost development servers (`http://localhost:5000`, `http://localhost:5173`)
- Replit deployment domains (auto-detected from `REPLIT_DOMAINS` in production)
- Custom origins specified in `ALLOWED_ORIGINS` environment variable
- All origins when running in development mode (`NODE_ENV=development`)

**Note on Twilio Integration**
- User opted for manual Twilio credential setup instead of Replit connector
- Credentials stored as secrets and accessed via environment variables
- WhatsApp Business number configured in assistant settings
- Supports both Sandbox (testing) and Production WhatsApp Business API