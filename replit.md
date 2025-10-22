# Aura - AI Personal Assistant

## Overview
Aura is an AI personal assistant integrated with Telegram and WhatsApp, designed to manage calendars, emails, knowledge, and quick notes through conversational AI. It uses OpenAI GPT-4o for natural language processing, Google Calendar for scheduling, Gmail for email intelligence, Notion for knowledge management, and GPT-4 Vision for photo OCR. Users interact via chat to manage their productivity seamlessly. The project aims to provide a comprehensive, AI-driven personal assistant experience with professional features.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Frameworks**: React 18 with TypeScript, Vite for bundling, Wouter for routing, TanStack Query for server state.
- **Component Library**: shadcn/ui based on Radix UI, styled with Tailwind CSS, using a professional "New York" theme with a blue color scheme for a healthcare SaaS aesthetic.
- **Design Philosophy**: Hybrid approach combining clarity with trust signals; professional color palette, Inter font, and elevation-based interaction patterns.

### Technical Implementations

#### Backend
- **Server**: Express.js with TypeScript, bundled with esbuild.
- **API**: RESTful endpoints (`/api/messages`, `/api/appointments`, `/api/settings`, `/api/emails`, `/api/telegram-webhook`, `/api/whatsapp-webhook`) with standardized error handling.
- **AI Integration**: OpenAI API (GPT-4o) via Replit AI Integrations for natural language understanding, multi-turn tool calling, pending confirmation system, and function calling for calendar operations (search, cancel, reschedule, book, focus time blocking), email management (check emails, send emails, extract meeting requests), and quick notes (instant capture, auto-categorization, photo OCR with GPT-4 Vision).
- **Calendar Integration**: Google Calendar API via `googleapis` library with OAuth2 (Replit Connectors), robust token refresh, automatic Google Meet links, recurring event support (RFC5545 RRULE), custom reminders, and enhanced event search.
- **Gmail Integration**: Gmail API with dual authentication support - (1) Manual OAuth2 with full Gmail API scopes (gmail.readonly, gmail.send, gmail.modify, gmail.labels) for complete email access, or (2) Replit Connectors fallback. Features include email intelligence - fetching emails with filtering (unread, search queries), AI-powered meeting request extraction, smart email sending with confirmation workflow, and email conversation tracking. Uses URL-safe base64 decoding for proper email body parsing. OAuth setup via `/oauth/gmail/authorize` endpoint with refresh token management.
- **Attendee Response Tracking**: A polling service checks attendee statuses (accepted, declined) every 10 minutes, notifying users via Telegram, and storing statuses in `event_attendees` table.
- **Quick Notes Integration**: AI-powered note capture with auto-categorization (work/personal/ideas/follow_ups), priority detection (high/normal/low), auto-tagging (2-5 keywords), calendar event linking (last 7 days), and optional Notion sync. Photo notes supported via GPT-4 Vision OCR (extracts text from whiteboards, business cards, handwritten notes). Telegram handlers for text and photo messages with empty text protection.
- **Production Hardening**: Saga-style compensation for atomicity between Google Calendar and DB operations, confirmation text matching, database optimization with B-tree and composite indexes, environment validation, and end-to-end type safety.

#### Data Storage
- **Database**: PostgreSQL via Neon serverless driver, Drizzle ORM for type-safe operations.
- **Schema**:
    - `whatsapp_messages`: Stores user/assistant messages with platform distinction.
    - `appointments`: Calendar event records linked to users, with Google Calendar event ID, attendee emails, recurrence rules, and reminders.
    - `assistant_settings`: AI configuration, personalization, timezone, and working hours.
    - `pendingConfirmations`: Manages confirmation states with TTL expiration.
    - `auditLogs`: Tracks all calendar operations for security.
    - `event_attendees`: Stores attendee responses for event tracking.
    - `email_threads`: Tracks email conversations with AI-generated summaries, meeting request flags, and categorization (action/FYI).
    - `quick_notes`: Stores instant notes with AI categorization (noteType, category, priority, tags, linkedEventId, notionPageId).
- **Data Access**: `IStorage` interface with `DBStorage` implementation using Drizzle, shared database connection pool.

## External Dependencies

### Third-Party Services
- **OpenAI API**: For natural language processing and understanding.
- **Google Calendar API**: For all calendar and appointment management.
- **Gmail API**: For email intelligence and management via Replit Connectors.
- **Telegram Bot API**: For primary user interaction and notifications.
- **Twilio WhatsApp API (Optional)**: For WhatsApp messaging, configured manually.
- **Neon Database**: Serverless PostgreSQL hosting.

### Development & Platform
- **Replit Platform Services**: Connectors API, Identity tokens, development plugins.
- **UI Libraries**: Radix UI primitives, `date-fns`, `embla-carousel`, `lucide-react`.
- **Build Tools**: TypeScript, Drizzle Kit, PostCSS, ESBuild.