# Aura - AI Personal Assistant
## Complete Feature Documentation

---

## 📋 Overview

Aura is an AI-powered personal assistant that manages your calendar through natural conversation via Telegram. Built on cutting-edge AI and calendar technologies, Aura transforms calendar management from a chore into a conversation.

**Primary Use Case:** Calendar Management & Scheduling  
**Platform:** Telegram (with optional WhatsApp support)  
**Authorized User:** Chat ID 7964798688

---

## 🛠 Core Technologies & What They Enable

### 1. **OpenAI GPT-4o** (Natural Language Understanding)
**What it provides:**
- Conversational AI that understands natural language requests
- Multi-turn tool calling - can search, analyze, and take actions
- Context awareness - remembers conversation history (10 messages)
- Intent understanding - knows the difference between "cancel and book" vs "reschedule"

**Features enabled:**
- Natural language appointment booking
- Smart time parsing ("tomorrow at 2pm", "next Monday")
- Intelligent event search
- Conversational confirmations
- Multi-step operations

---

### 2. **Google Calendar API** (Calendar Management)
**What it provides:**
- Full calendar access and control
- Event creation, modification, deletion
- Availability checking and conflict detection
- Attendee management
- Recurring event patterns
- Video conferencing integration
- Focus time with auto-decline

**Features enabled:**
- All calendar operations
- Automatic Google Meet links
- Recurring events (daily/weekly/monthly)
- Custom reminders
- Focus time blocks
- Attendee invitations
- Enhanced event search

---

### 3. **Telegram Bot API** (User Interface)
**What it provides:**
- Real-time messaging interface
- Push notifications
- Secure chat-based interactions
- Message history

**Features enabled:**
- Chat-based calendar management
- Instant notifications for attendee responses
- Confirmation workflows
- Status updates

---

### 4. **PostgreSQL Database** (Data Persistence)
**What it provides:**
- Message history storage
- Appointment tracking
- Settings persistence
- Attendee response tracking
- Audit logging

**Features enabled:**
- Conversation history
- Pending confirmation management
- Attendee status change detection
- Security audit trails

---

## 📅 STEP 1: Calendar Management
### Core Calendar Features

#### **View Schedule**
See your upcoming events for any time period.

**How to use:**
- "What's on my calendar today?"
- "Show my schedule for next week"
- "What meetings do I have tomorrow?"

**What happens:**
- AI retrieves events from Google Calendar
- Returns list with times, titles, and attendees
- Sorted chronologically

---

#### **Book Appointments**
Create new calendar events through natural conversation.

**How to use:**
- "Schedule a team meeting tomorrow at 2pm"
- "Book a client call with john@company.com next Monday at 10am"
- "Add a 30-minute standup every weekday at 9am"

**What happens:**
- AI extracts: title, time, duration, attendees
- Asks for confirmation
- Creates Google Calendar event
- Automatically adds Google Meet link
- Sends invitations if attendees specified
- Stores in database with sync to calendar

**Features included:**
- Automatic Google Meet video links
- Attendee invitations via email
- Recurring patterns (see below)
- Custom reminders (see below)

---

#### **Cancel Appointments**
Remove events from your calendar safely.

**How to use:**
- "Cancel my meeting with Sarah tomorrow"
- "Delete the team standup"

**What happens:**
- AI searches for matching event
- Asks for confirmation with event details
- Deletes from Google Calendar with verification (5 retries)
- Updates database status
- Logs the cancellation

**Safety features:**
- Requires explicit confirmation
- Event search prevents wrong deletions
- Exponential backoff verification (1s, 2s, 4s, 8s, 16s)
- Warns if verification is uncertain

---

#### **Reschedule Appointments**
Move events to new times.

**How to use:**
- "Reschedule the client call to Thursday at 3pm"
- "Move my meeting with John to next week same time"

**What happens:**
- AI searches for the event
- Asks for confirmation with old and new times
- Updates event in Google Calendar
- Notifies attendees of change
- Updates database

---

#### **Check Availability**
See if a time slot is free.

**How to use:**
- "Am I free tomorrow at 3pm?"
- "Do I have any conflicts next Monday morning?"

**What happens:**
- Checks Google Calendar for conflicts
- Returns availability status
- Can suggest alternative times if busy

---

#### **Find Free Slots**
Discover available time periods for scheduling.

**How to use:**
- "When am I free tomorrow afternoon?"
- "Find a 1-hour slot next week for a meeting"

**What happens:**
- Scans calendar for free periods
- Returns up to 5 available slots
- Considers your existing appointments
- Checks every 30 minutes

---

## 🎯 All Current Features (Organized by Category)

### **Meeting Intelligence**

#### ✅ Automatic Google Meet Links
**What it does:** Every calendar event automatically includes a Google Meet video conference link.

**How to use:**
- Just book any meeting - the link is added automatically
- "Schedule a team sync tomorrow at 2pm"

**What you get:**
```
Booked! I've added "team sync" to your calendar

Meet link: meet.google.com/abc-defg-hij
```

**Technical details:**
- Uses Google Calendar conferenceData API
- Generates unique meeting ID per event
- Link shared with all attendees in invitation
- Works for all events, recurring or one-time

---

#### ✅ Attendee Response Tracking
**What it does:** Automatically monitors when meeting attendees accept, decline, or tentatively accept invitations. Sends you Telegram notifications when responses come in.

**How it works:**
- Polls Google Calendar every 10 minutes
- Detects status changes (needsAction → accepted/declined/tentative)
- Sends grouped notifications per event

**What you get:**
```
Meeting Update: "Client Presentation"

john@example.com - [ACCEPTED]
sarah@example.com - [TENTATIVE]
mike@example.com - [DECLINED]

Attendance: 1 accepted, 1 declined, 1 tentative
```

**Why it's valuable:**
- Know immediately if key people can't attend
- Proactively reschedule if too many declines
- Track meeting commitment trends

---

#### ✅ Enhanced Event Search
**What it does:** Find events by keywords, attendees, or any search term with full metadata including attendees, meet links, location, and recurrence status.

**How to use:**
- "When was my last meeting with Sarah?"
- "Show all client meetings this month"
- "Find the project kickoff meeting"

**What you get:**
- Event title and time
- All attendee email addresses
- Google Meet link if available
- Location if specified
- Whether it's a recurring event
- Full description

**Why it's valuable:**
- Quick context retrieval for follow-ups
- Find meetings without knowing exact title
- Get complete meeting details instantly

---

### **Workflow Automation**

#### ✅ Recurring Events
**What it does:** Create meetings that repeat on a schedule using natural language.

**How to use:**
- "Schedule team standup every weekday at 9am"
- "Book a monthly review on the 15th at 2pm"
- "Set up weekly 1:1 with my manager every Monday at 10am"

**Supported patterns:**
- Daily: "every day", "daily"
- Weekly: "every Monday", "every Mon/Wed/Fri"
- Monthly: "every 15th", "first Monday of each month"
- Custom: "every 2 weeks", "daily for 10 days"

**Technical format:** Uses RFC5545 RRULE format
- `FREQ=DAILY;COUNT=10` - Daily for 10 days
- `FREQ=WEEKLY;BYDAY=MO,WE,FR` - Mon/Wed/Fri weekly
- `FREQ=MONTHLY;BYMONTHDAY=15` - 15th of each month

---

#### ✅ Smart Event Reminders
**What it does:** Set custom email and popup reminders at any interval before your events.

**How to use:**
- "Remind me about the client call 1 hour before"
- "Set a reminder for the meeting: email 1 day before and popup 15 minutes before"

**Options:**
- **Method:** Email or Popup notification
- **Timing:** Any interval from 0 minutes to 4 weeks (40,320 minutes)
- **Multiple:** Up to 5 reminders per event

**Examples:**
- Popup 10 minutes before
- Email 1 day before
- Popup 1 hour before + Email 24 hours before

---

#### ✅ Focus Time Blocks
**What it does:** Block calendar time for deep work that automatically declines conflicting meeting invitations.

**How to use:**
- "Block 9am to 12pm tomorrow for focused writing"
- "Set focus time from 2pm to 5pm for coding"

**What happens:**
- Creates a calendar block marked as "Focus Time"
- Sets transparency to "busy"
- Enables Google Calendar's auto-decline mode
- Anyone trying to book you gets auto-declined with message:
  > "I am in focus time and cannot attend. Please reschedule."

**Features:**
- Blue color in Google Calendar
- 10-minute popup reminder before start
- Visible to others as "Busy"
- Protects your productive time

**Why it's valuable:**
- Combat meeting overload
- Protect time for important work
- Set healthy boundaries automatically

---

### **Meeting Management**

#### ✅ Multi-Attendee Support
**What it does:** Send calendar invitations to multiple people when booking meetings.

**How to use:**
- "Schedule a planning meeting with john@company.com and sarah@team.com tomorrow at 3pm"
- "Book a client call with client@external.com next Tuesday at 10am"

**What happens:**
- Everyone receives calendar invitation
- Google Meet link included automatically
- Attendees can accept/decline
- You get notifications when they respond (via attendee tracking)

---

#### ✅ Conversational AI with Context
**What it does:** Remembers your conversation and can handle complex multi-step requests.

**How to use:**
- Complex requests: "Cancel my meeting with Warren and book a new one at the same time with Sarah"
- Follow-ups: "Actually, make that 3pm instead"
- Clarifications: "Which meeting?" when multiple matches exist

**What it remembers:**
- Last 10 messages of conversation
- Event details from previous searches
- Your confirmation preferences
- Timezone and working hours

---

### **Smart Scheduling**

#### ✅ Time Extraction & Parsing
**What it does:** Understands natural time expressions and converts them to exact times.

**Examples:**
- "tomorrow at 2pm" → Exact date and time
- "next Monday" → Specific date
- "in 30 minutes" → Calculated future time
- "every weekday at 9am" → Recurring pattern

---

#### ✅ Availability Conflict Detection
**What it does:** Prevents double-booking by checking for conflicts before creating events.

**How to use:**
- Automatic: AI checks before booking
- Manual: "Am I free Thursday at 2pm?"

**What happens:**
- Scans existing calendar
- Identifies overlapping events
- Warns about conflicts
- Suggests alternative times

---

### **Security & Reliability**

#### ✅ Confirmation Workflows
**What it does:** Requires explicit confirmation before making calendar changes.

**Protected actions:**
- Booking new appointments
- Canceling events
- Rescheduling meetings

**How it works:**
- AI proposes the action with full details
- You must explicitly confirm ("yes", "confirm", "ok")
- Uncertainty words rejected ("maybe", "not now")
- Expires after 5 minutes for security

---

#### ✅ Calendar Sync Verification
**What it does:** Verifies calendar operations completed successfully with retry logic.

**For deletions:**
- Attempts to verify deletion
- Retries up to 5 times with exponential backoff
- Waits: 1s, 2s, 4s, 8s, 16s between attempts
- Warns if uncertain after all retries

**For all operations:**
- Saga-style compensation patterns
- Rollback on failure
- Detailed audit logging

---

#### ✅ Audit Logging
**What it does:** Tracks all calendar operations for security and compliance.

**What's logged:**
- Action type (view, book, cancel, reschedule)
- Timestamp
- User identifier (chat ID)
- Success/failure status
- Error messages if failed
- Event details

**Why it matters:**
- Security monitoring
- Troubleshooting issues
- Compliance requirements
- Usage analytics

---

## 🎨 User Experience Features

### Smart Messaging
- Concise, professional tone
- Clear confirmation requests
- Detailed success messages with all relevant info
- Error messages with helpful suggestions
- Emoji-free for professional compliance

### Timezone Support
- Default: Asia/Dubai
- Configurable per user
- All times displayed in user's timezone
- Automatic DST handling

### Working Hours Awareness
- Configured in settings (default: 9am-5pm)
- AI considers when suggesting times
- Respects your schedule preferences

---

## 📊 Feature Statistics

**Total Features:** 16 major features  
**Completed Roadmap Items:** 6 of 13 from Phase 2  
**Integration Partners:** 4 (OpenAI, Google, Telegram, PostgreSQL)  
**Supported Platforms:** Telegram (primary), WhatsApp (optional)

---

## 🔮 Coming Soon (Roadmap)

### Available for Implementation
- Event colors for visual organization
- Event visibility control (public/private/confidential)
- Working location tracking (Office/Home/Custom)
- Out of office auto-decline periods
- Google Drive attachment support
- Meeting pattern analytics

---

## 💬 Example Conversations

### Booking a Team Meeting
```
You: "Schedule a team planning meeting tomorrow at 2pm with john@company.com 
     and sarah@team.com. Remind everyone 1 hour before."

Aura: "I'll book 'team planning meeting' for Oct 22, 2pm and send invites 
      to john@company.com, sarah@team.com with reminders: popup 1 hour before. 
      Confirm?"

You: "yes"

Aura: "Booked! I've added 'team planning meeting' to your calendar

      Meet link: meet.google.com/abc-defg-hij
      
      Invitations sent to: john@company.com, sarah@team.com"
```

### Setting Up Recurring Focus Time
```
You: "Block every morning 9am to 11am for deep work"

Aura: "Focus time blocked! I've set aside 'deep work' on your calendar.
      
      This time is marked as busy and will automatically decline any 
      meeting invitations during this period. Perfect for deep work!"
```

### Finding and Rescheduling
```
You: "When is my meeting with Warren?"

Aura: "Found: 'Project Discussion' with warren@startup.com
      Tomorrow (Oct 22) at 3:00 PM"

You: "Reschedule it to Thursday at 10am"

Aura: "I'll reschedule 'Project Discussion' to Oct 24, 10:00 AM. Confirm?"

You: "confirm"

Aura: "Done! Rescheduled 'Project Discussion' to Thursday, Oct 24 at 10:00 AM.
      Warren has been notified of the change."
```

---

## 🔐 Security & Privacy

**Data Storage:**
- Messages stored in PostgreSQL database
- End-to-end encryption via Telegram
- No message content shared with third parties
- Audit logs for all calendar operations

**Access Control:**
- Authorized chat ID only: 7964798688
- OAuth2 for Google Calendar access
- Secure token refresh mechanism
- Session management with 5-minute TTL

**Compliance:**
- No emoji in notifications (professional requirement)
- Confirmation required for destructive actions
- Detailed audit trail
- GDPR-ready data handling

---

## 📱 How to Use Aura

1. **Open Telegram** and find your Aura bot
2. **Start a conversation** with natural language
3. **Ask for what you need** - schedule, check, search, or block time
4. **Confirm actions** when prompted
5. **Get notifications** for attendee responses and reminders

**Remember:** Talk to Aura like you would a human assistant. No special commands or syntax needed!

---

**Last Updated:** October 21, 2025  
**Version:** Phase 2 (16 features live)  
**Status:** Production-ready and deployed at aurasb.replit.app
