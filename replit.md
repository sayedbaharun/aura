# WhatsApp AI Personal Assistant - Replit Project Guide

## Overview

This is a WhatsApp-integrated AI personal assistant application named "Aura" that manages calendars and appointments through conversational interactions. The system uses OpenAI for natural language processing and Google Calendar for appointment management. Users interact with Aura via WhatsApp, and administrators can monitor conversations and appointments through a web dashboard.

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
  - `/api/messages` - WhatsApp message CRUD operations
  - `/api/appointments` - Appointment management
  - `/api/settings` - Assistant configuration
- Query parameters for filtering (e.g., by phone number)
- Standardized error handling middleware

**AI Integration**
- **OpenAI API** via Replit AI Integrations for natural language understanding
- Conversation context management with message history (10 messages)
- Pending confirmation system for user actions requiring approval
- Function calling pattern for calendar operations

**Calendar Integration**
- **Google Calendar API** via googleapis library
- OAuth2 authentication through Replit Connectors
- Token refresh handling with expiry checking
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
   - Phone number for conversation threading

2. **appointments** - Calendar event records
   - Links to phone numbers for user association
   - Stores appointment metadata (title, date, duration)
   - Status tracking (pending, confirmed, cancelled)
   - Google Calendar event ID for synchronization
   - Automatic timestamp updates via triggers

3. **assistant_settings** - AI configuration
   - Personalization (assistant name, user name)
   - Timezone and working hours
   - Default meeting duration
   - Custom preferences text

**Data Access Pattern**
- Storage abstraction layer (`IStorage` interface)
- `DBStorage` implementation using Drizzle
- Direct SQL for complex queries, ORM for CRUD operations

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

3. **WhatsApp Integration via Twilio**
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

4. **Neon Database**
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

**Environment Configuration**
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API access
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI endpoint
- `REPLIT_CONNECTORS_HOSTNAME` - Replit services endpoint
- `REPL_IDENTITY` or `WEB_REPL_RENEWAL` - Authentication tokens
- `TWILIO_ACCOUNT_SID` - Twilio account identifier (manual setup)
- `TWILIO_AUTH_TOKEN` - Twilio authentication token (manual setup)

**Note on Twilio Integration**
- User opted for manual Twilio credential setup instead of Replit connector
- Credentials stored as secrets and accessed via environment variables
- WhatsApp Business number configured in assistant settings
- Supports both Sandbox (testing) and Production WhatsApp Business API