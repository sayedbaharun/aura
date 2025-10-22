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
- **AI Integration**: OpenAI API via Replit AI Integrations with multi-model fallback system (GPT-4o → GPT-4o-mini → GPT-4-turbo) for reliability and cost optimization. Features natural language understanding, multi-turn tool calling, pending confirmation system, and function calling for calendar operations (search, cancel, reschedule, book, focus time blocking), email management (check emails, send emails, extract meeting requests), and quick notes (instant capture, auto-categorization, photo OCR with GPT-4 Vision). All AI calls automatically track interactions for pattern learning and inject historical context via RAG system.
- **Calendar Integration**: Google Calendar API via `googleapis` library with OAuth2 (Replit Connectors), robust token refresh, automatic Google Meet links, recurring event support (RFC5545 RRULE), custom reminders, and enhanced event search.
- **Gmail Integration**: Gmail API with dual authentication support - (1) Manual OAuth2 with full Gmail API scopes (gmail.readonly, gmail.send, gmail.modify, gmail.labels) for complete email access, or (2) Replit Connectors fallback. Features include email intelligence - fetching emails with filtering (unread, search queries), AI-powered meeting request extraction, smart email sending with confirmation workflow, and email conversation tracking. Uses URL-safe base64 decoding for proper email body parsing. OAuth setup via `/oauth/gmail/authorize` endpoint with refresh token management.
- **Attendee Response Tracking**: A polling service checks attendee statuses (accepted, declined) every 10 minutes, notifying users via Telegram, and storing statuses in `event_attendees` table.
- **Quick Notes Integration**: AI-powered note capture with auto-categorization (work/personal/ideas/follow_ups), priority detection (high/normal/low), auto-tagging (2-5 keywords), calendar event linking (last 7 days), and optional Notion sync. Photo notes supported via GPT-4 Vision OCR (extracts text from whiteboards, business cards, handwritten notes). Telegram handlers for text and photo messages with empty text protection.
- **Multi-Model Fallback System (Phase 2.3)**: Intelligent cascading fallback (GPT-4o → GPT-4o-mini → GPT-4-turbo) with automatic retry logic, error tracking, and smart model selection based on task complexity. Main message processing uses "complex" tier (GPT-4o first), while structured extraction tasks (email analysis, note categorization) use "simple" tier (GPT-4o-mini first) for cost optimization. Tracks model usage and token consumption for all AI operations.
- **Advanced Context Memory (Phase 2.3 - P2)**: RAG-powered historical context injection system that enhances AI responses with user patterns. Analyzes interaction history to detect meeting patterns (preferred times, recurring conflicts), email habits (response times, important contacts), and note preferences (common categories, topics). Automatically builds user profiles with timezone, working hours, and behavioral patterns. Injects top 3 relevant historical interactions into every AI conversation for personalized responses. All AI operations automatically tracked in `interaction_history` for continuous learning.
- **Proactive Suggestions System (Phase 2.3 - P3)**: Automated daily briefings and real-time proactive checks. Morning briefing (8 AM) summarizes today's schedule, unread emails, pending tasks, and detected conflicts. Evening summary (6 PM) reviews completed events, action items from emails, and upcoming priorities. Hourly real-time checks detect schedule conflicts, overdue tasks, meeting preparation needs, and calendar gaps. Suggestions ranked by priority (high/normal/low) with automatic Telegram delivery. All suggestions tracked in `proactive_suggestions` table with status (pending/sent/dismissed) and user feedback.
- **Scheduled Jobs System**: Cron-style scheduling for automated workflows. Supports multiple users via `TELEGRAM_CHAT_ID` environment variable (comma-separated chat IDs). Morning briefings scheduled at 8 AM daily, evening summaries at 6 PM daily, and real-time proactive checks every hour. Per-user error handling ensures one user's failure doesn't cascade to others. Manual trigger functions available for testing (triggerMorningBriefing, triggerEveningSummary).
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
    - `user_profiles` (Phase 2.3): Learned user preferences and patterns - timezone, working hours, meeting patterns (preferred times, durations, recurring conflicts), email habits (response times, important contacts), note preferences (common categories, topics), and last pattern update timestamp.
    - `interaction_history` (Phase 2.3): Complete audit trail of all user interactions - chat messages, calendar operations, email actions, note captures. Tracks interaction type, action performed, input/output data, success status, AI model used, token consumption, and metadata for pattern analysis. Enables RAG context injection and behavioral learning.
    - `proactive_suggestions` (Phase 2.3): Automated briefings and proactive alerts - suggestion type (morning_briefing/evening_summary/conflict_alert/task_reminder), content with Telegram-formatted text, priority (high/normal/low), trigger source (scheduled/real_time), status (pending/sent/dismissed), user feedback, and timestamps for sent/dismissed actions.
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