# Aura - AI Personal Assistant

Aura is an AI-powered personal assistant that manages your calendar and email through natural conversation via Telegram.

## 🚀 Quick Start

### For Users
- **See what Aura can do**: [View Complete Documentation](./docs/AURA_MASTER_DOCUMENTATION.md)
- **Features**: 21+ calendar and email management features
- **Platform**: Telegram bot with natural language interface

### For Developers
- **Gmail Setup**: [Quick Start Guide](./docs/GMAIL_QUICK_START.md) (15 minutes)
- **Detailed Setup**: [OAuth Configuration](./docs/GMAIL_OAUTH_SETUP.md)
- **Architecture**: See `replit.md` for technical details

## 📚 Documentation

All documentation is located in the [`docs/`](./docs/) folder:
- **AURA_MASTER_DOCUMENTATION.md** - Complete feature documentation
- **GMAIL_QUICK_START.md** - Quick Gmail OAuth setup
- **GMAIL_OAUTH_SETUP.md** - Detailed Gmail configuration

## 🎯 Key Features

### Calendar Management
- Natural language appointment booking
- Smart scheduling with conflict detection
- Recurring events (daily/weekly/monthly)
- Automatic Google Meet links
- Attendee tracking and notifications
- Focus time blocks with auto-decline

### Email Intelligence
- Check and search emails
- Send emails with confirmation
- AI-powered meeting request extraction
- Email conversation tracking
- Smart categorization

## 🔧 Tech Stack

- **AI**: OpenAI GPT-4o
- **Calendar**: Google Calendar API
- **Email**: Gmail API (OAuth2)
- **Platform**: Telegram Bot API
- **Database**: PostgreSQL (Neon)
- **Backend**: Express.js + TypeScript
- **Frontend**: React + Vite (dashboard)

## 📝 Environment Setup

Required secrets in Replit:
- `GMAIL_CLIENT_ID` - Google OAuth client ID
- `GMAIL_CLIENT_SECRET` - Google OAuth client secret
- `GMAIL_REFRESH_TOKEN` - Gmail refresh token
- See [Gmail Quick Start](./docs/GMAIL_QUICK_START.md) for setup instructions

## 🏃 Running the App

```bash
npm run dev
```

The app runs on port 5000 and includes:
- Express backend with API routes
- Vite frontend for dashboard
- Telegram bot for user interaction

## 📞 Support

For setup issues or questions, refer to the documentation in the `docs/` folder.

---

**Status**: Production-ready and deployed  
**Version**: Phase 2 with Gmail Integration (21 features)  
**Authorized User**: Chat ID 7964798688
