# Aura - AI Personal Assistant
## Complete Feature Documentation

---

## 📋 Overview

Aura is an AI-powered personal assistant that manages your calendar and email through natural conversation via Telegram. Built on cutting-edge AI, calendar, and email technologies, Aura transforms calendar management and email intelligence from chores into conversations.

**Primary Use Cases:** 
- Calendar Management & Scheduling
- Email Intelligence & Management
- Meeting Request Extraction

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

### 3. **Gmail API** (Email Management)
**What it provides:**
- Full email access (read, send, modify)
- Advanced email search capabilities
- Email thread tracking
- Label management
- Message metadata and body parsing

**Features enabled:**
- Check and read emails
- Search emails by any criteria
- Send emails with confirmation
- AI-powered meeting request extraction
- Email conversation tracking
- Smart email categorization

**Authentication:**
- Manual OAuth2 with full scopes (primary)
- Automatic refresh token management
- Replit Connector fallback (limited scopes)

---

### 4. **Telegram Bot API** (User Interface)
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

### 5. **PostgreSQL Database** (Data Persistence)
**What it provides:**
- Message history storage
- Appointment tracking
- Settings persistence
- Attendee response tracking
- Email thread tracking
- Audit logging

**Features enabled:**
- Conversation history
- Pending confirmation management
- Attendee status change detection
- Email conversation tracking
- Meeting request detection storage
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

## 📧 STEP 2: Email Management (Gmail Integration)
### Core Email Features

#### **Check Emails**
View your recent emails, unread messages, or search for specific content.

**How to use:**
- "Check my emails"
- "Do I have any unread emails?"
- "Show me my last 5 emails"

**What happens:**
- AI retrieves emails from Gmail
- Returns sender, subject, snippet, and read/unread status
- Sorted by most recent first
- Can filter by unread only

**What you get:**
```
You have 3 unread emails:

From: john@company.com
Subject: Project Update
Preview: Hey, I wanted to share the latest progress on...

From: sarah@client.com
Subject: Meeting Follow-up
Preview: Thanks for the great discussion yesterday...
```

---

#### **Search Emails**
Find specific emails by sender, subject, or content.

**How to use:**
- "Search my emails for invoice"
- "Find emails from john@company.com"
- "Show emails about project budget"

**What happens:**
- AI uses Gmail's powerful search
- Supports full Gmail query syntax
- Returns matching emails with context
- Can search body, subject, sender, or all

**Search capabilities:**
- By sender: "from:john@company.com"
- By subject: "subject:invoice"
- By content: Any keyword or phrase
- Date ranges: "after:2024/10/01"
- Combinations: Multiple criteria at once

---

#### **Send Emails**
Compose and send emails through natural conversation with confirmation workflow.

**How to use:**
- "Send an email to john@company.com saying thanks for the update"
- "Email sarah@client.com about tomorrow's meeting"
- "Reply to john@company.com with the project timeline"

**What happens:**
- AI asks for confirmation with full email preview
- You review recipient, subject, and body
- Confirm to send
- Email sent through your Gmail account
- Confirmation with message ID

**Confirmation flow:**
```
I'll send this email to john@company.com:

Subject: Thanks for the update
Body: Thanks for the update

Ready to send? (yes/no)

[You confirm]

Email sent successfully! Message ID: abc123
```

---

#### **AI Meeting Request Extraction**
Automatically detect and extract meeting requests from your emails.

**How to use:**
- "Check if I have any meeting requests in my email"
- "Are there any emails asking to schedule a meeting?"

**What happens:**
- AI scans your emails for meeting-related content
- Identifies requests to schedule, calendar invites, or meeting suggestions
- Extracts key details: proposed times, attendees, topics
- Can automatically convert to calendar events

**What it detects:**
- Direct meeting requests
- Calendar invitations
- Rescheduling requests
- Availability inquiries
- Conference call details

**Example response:**
```
Found 2 meeting requests:

1. From: client@external.com
   Topic: Q4 Planning Discussion
   Proposed: Next Tuesday 2pm or Wednesday 10am
   
2. From: team@company.com
   Topic: Sprint Retrospective
   Proposed: Friday at 3pm
```

---

#### **Email Conversation Tracking**
Track email threads with AI-generated summaries and categorization.

**How to use:**
- Automatic: All emails are tracked in conversation threads
- Manual: "What's the latest on the project discussion thread?"

**What it provides:**
- Thread continuity across multiple emails
- AI-generated summaries of conversations
- Meeting request flags on relevant threads
- Action vs FYI categorization

**Database storage:**
- Thread ID linking related emails
- Conversation summaries
- Meeting request detection flags
- Read/unread status per thread

---

### Gmail OAuth Setup

Aura uses **manual OAuth2** authentication for full Gmail access with these scopes:
- **gmail.readonly**: Read all emails and settings
- **gmail.send**: Send emails on your behalf
- **gmail.modify**: Mark emails as read/unread, add labels
- **gmail.labels**: Manage email labels

**Setup process:**
1. Create OAuth client in Google Cloud Console (Web application type)
2. Add credentials to Replit Secrets (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET)
3. Visit `/oauth/gmail/authorize` to get refresh token
4. Add refresh token to Replit Secrets (GMAIL_REFRESH_TOKEN)

**Fallback:** Replit Connector with limited scopes (if manual OAuth not configured)

**Documentation:** See `GMAIL_QUICK_START.md` and `GMAIL_OAUTH_SETUP.md` for detailed setup instructions.

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

### **Knowledge Management**

#### ✅ Quick Notes - Text Capture
**What it does:** Instantly save thoughts, ideas, tasks, or meeting notes with AI-powered auto-categorization.

**How to use:**
- "Remind me to call Dr. Smith tomorrow"
- "Idea: Build analytics dashboard for user metrics"
- "Meeting note: John approved 20% budget increase"
- "Save this: Review Q4 performance next week"

**What you get:**
- Automatic categorization (work/personal/ideas/follow_ups)
- Note type detection (task/idea/meeting_note/general)
- Priority assignment (high/normal/low)
- Auto-generated tags (2-5 keywords)
- Notion sync (creates page automatically)
- Calendar linking (connects to recent meetings)

**Example Response:**
```
✅ Note saved! I've categorized this as a "work" note (type: task) 
with priority: high and tags: budget, q4-planning
Synced to Notion ✓
```

---

#### ✅ Quick Notes - Photo OCR
**What it does:** Extract text from photos using GPT-4 Vision and save as organized notes.

**How to use:**
- Send a photo of whiteboard notes, business cards, or handwritten text
- Add optional caption for context
- Aura extracts text and auto-categorizes

**What you can capture:**
- Whiteboard brainstorming sessions
- Business cards with contact info
- Meeting agendas and handwritten notes
- Printed documents or screenshots

**Processing:**
- GPT-4 Vision OCR for high-accuracy extraction
- Combines extracted text with caption
- Empty text protection (won't create blank notes)
- Same auto-categorization as text notes

---

#### ✅ View & Filter Notes
**What it does:** Access all saved notes with smart filtering options.

**How to use:**
- "Show me my notes" - all recent notes
- "Show me my work notes" - filter by category
- "Show me my task notes" - filter by type
- "Show me my ideas" - filter for ideas only

**Display includes:**
- Priority level indicator
- Note content
- Category and type
- Tags
- 🔗 Calendar link (if connected to event)
- 📒 Notion sync status

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

## 🤖 AI Intelligence & Automation (Phase 2.3)

### **Advanced AI Systems**

#### ✅ Multi-Model Fallback System
**What it does:** Ensures 99.9% uptime with intelligent cascading between AI models and automatic cost optimization.

**How it works:**
- **Cascading Fallback:** GPT-4o → GPT-4o-mini → GPT-4-turbo
- **Smart Task Routing:** 
  - Complex tasks (main conversations) → GPT-4o first
  - Simple tasks (email analysis, note categorization) → GPT-4o-mini first
- **Automatic Retry:** If one model fails, seamlessly switches to next
- **Metrics Tracking:** Logs which model was used and token consumption

**What you get:**
- No downtime if primary model is unavailable
- Optimized costs: 90% cheaper for simple extraction tasks
- Full transparency on model usage
- Consistent AI quality across all operations

**Why it's valuable:**
- Production reliability: Never blocked by API issues
- Cost efficiency: Right model for the job
- Performance tracking: Complete visibility into AI usage

---

#### ✅ Advanced Context Memory (RAG + Pattern Detection)
**What it does:** Makes Aura learn from your behavior and personalize responses using Retrieval-Augmented Generation (RAG).

**How it works:**
- **Interaction Tracking:** Every chat, calendar action, email, and note is logged
- **Pattern Detection Algorithms:**
  - Meeting patterns (preferred times, durations, recurring conflicts)
  - Email habits (response times, important contacts)
  - Note preferences (common categories, topics)
- **User Profile Building:** Automatically learns timezone, working hours, behaviors
- **RAG Context Injection:** Top 3 relevant historical interactions injected into every conversation

**What you get:**
```
Example: You ask "Schedule a team meeting"

Without Context Memory:
"When would you like to schedule the meeting?"

With Context Memory:
"Based on your pattern, you typically schedule team meetings 
on Tuesdays at 2pm. Would you like me to book it then?"
```

**Auto-detected patterns:**
- "You usually schedule 1:1s for 30 minutes on Monday mornings"
- "You frequently meet with john@company.com about project updates"
- "Your focus time is typically 2-3 hours in the mornings"
- "You prefer high-priority tasks get Notion synced"

**Database storage:**
- `interaction_history`: Complete audit trail of all actions
- `user_profiles`: Learned preferences and behavioral patterns
- All AI model usage and token consumption tracked

**Why it's valuable:**
- Personalized suggestions based on YOUR patterns
- Reduces back-and-forth: AI knows your preferences
- Learns continuously: Gets smarter over time
- Context-aware responses: Remembers what matters to you

---

#### ✅ Proactive Suggestions System
**What it does:** Automatically monitors your calendar and emails to send you helpful briefings and real-time alerts.

**Daily Briefings:**

**Morning Briefing (8 AM Daily):**
```
🌅 Good morning! Here's your day:

📅 TODAY'S SCHEDULE (3 events)
• 9:00 AM - Team Standup (meet.google.com/abc-defg)
• 2:00 PM - Client Presentation (john@client.com)
• 4:30 PM - Sprint Planning

📧 UNREAD EMAILS (5 messages)
• client@external.com - Q4 Budget Discussion (ACTION)
• sarah@team.com - Project Update (FYI)

⚠️ CONFLICTS DETECTED
• Client Presentation overlaps with your focus time block

✅ PENDING TASKS
• Follow up with Sarah on budget approval
```

**Evening Summary (6 PM Daily):**
```
🌙 Your day in review:

✅ COMPLETED TODAY (3 events)
• Team Standup - Done
• Client Presentation - Done (2 attendees accepted)
• Sprint Planning - Done

📋 ACTION ITEMS FROM EMAILS
• client@external.com requested Q4 budget meeting
• team@company.com needs feedback by Friday

📅 TOMORROW'S PRIORITIES (2 events)
• 10:00 AM - 1:1 with Manager
• 3:00 PM - Design Review
```

**Real-Time Proactive Checks (Every Hour):**
- **Conflict Alerts:** "Your 2pm meeting overlaps with existing appointment"
- **Overdue Tasks:** "You haven't followed up with client request from yesterday"
- **Meeting Prep:** "Client call in 30 mins - reviewed their last email?"
- **Calendar Gaps:** "You have 2-hour gap tomorrow afternoon - good for focus time?"

**Priority Levels:**
- **High:** Urgent conflicts, meeting conflicts, critical deadlines
- **Normal:** Daily briefings, general reminders
- **Low:** Suggestions, optimization ideas

**How to use:**
- Automatic: Briefings arrive at scheduled times
- Personalized: Based on your actual calendar and emails
- Actionable: Click-to-act on suggestions
- Dismissible: Feedback improves future suggestions

**Database tracking:**
- `proactive_suggestions`: All briefings and alerts logged
- Status tracking: pending → sent → dismissed
- User feedback: Improves suggestion quality over time

**Why it's valuable:**
- Never miss important updates
- Start day informed and prepared
- Catch conflicts before they happen
- End day with clear action items
- Saves 15-30 minutes of daily planning

---

#### ✅ Scheduled Jobs System
**What it does:** Cron-style automation for all proactive features with multi-user support.

**What runs automatically:**
- Morning briefings: 8 AM daily
- Evening summaries: 6 PM daily
- Real-time proactive checks: Every hour
- Attendee response tracking: Every 10 minutes

**Multi-user support:**
- Configure via `TELEGRAM_CHAT_ID` environment variable
- Supports comma-separated IDs: `"123,456,789"`
- Per-user error handling (one failure doesn't cascade)
- Manual trigger functions for testing

**Technical implementation:**
- Timezone-aware scheduling
- Graceful degradation on errors
- Retry logic with exponential backoff
- Complete logging and observability

**Why it's valuable:**
- Set it and forget it: Runs 24/7
- Multi-tenant ready: Supports teams
- Reliable: Built-in error recovery
- Observable: Full logging of all jobs

---

## 📊 Feature Statistics

**Total Features:** 31+ major features  
**Calendar Features:** 11 features
**Email Features:** 5 features
**Knowledge Management:** 9 features (Notion integration + Quick Notes)
**Quick Notes:** 3 features (text notes, photo OCR, view/filter notes)
**AI Intelligence & Automation:** 4 features (Multi-Model Fallback, Context Memory, Proactive Suggestions, Scheduled Jobs)
**Intelligence Features:** 5 features (AI, tracking, search, reminders, focus time)
**Integration Partners:** 6 (OpenAI, Google Calendar, Gmail, Notion, Telegram, PostgreSQL)  
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

### Managing Emails
```
You: "Check my emails"

Aura: "You have 5 unread emails:

      1. From: client@company.com
         Subject: Project proposal review
         Preview: I've reviewed the proposal and have a few questions...
      
      2. From: john@team.com
         Subject: Meeting request for Q4 planning
         Preview: Can we schedule a meeting next week to discuss...
      
      3. From: newsletter@startup.com
         Subject: Weekly digest
         Preview: This week's top stories in tech..."

You: "Send an email to client@company.com saying I'll review the questions
     and send my response by end of day"

Aura: "I'll send this email to client@company.com:

      Subject: Re: Project proposal review
      Body: I'll review the questions and send my response by end of day

      Ready to send?"

You: "yes"

Aura: "Email sent successfully! Message ID: 18c5a2f3b4d1e9a7"
```

### Meeting Request Extraction
```
You: "Check if I have any meeting requests"

Aura: "Found 1 meeting request in your emails:

      From: john@team.com
      Subject: Meeting request for Q4 planning
      Proposed time: Next Tuesday 2pm or Wednesday 10am
      Topic: Q4 planning discussion
      
      Would you like me to schedule this?"

You: "Yes, book it for Tuesday at 2pm with John"

Aura: "I'll book 'Q4 planning discussion' for Oct 29, 2:00 PM and send
      an invite to john@team.com. Confirm?"

You: "confirm"

Aura: "Booked! I've added 'Q4 planning discussion' to your calendar.
      
      Meet link: meet.google.com/xyz-abcd-efg
      Invitation sent to john@team.com"
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

## 📝 STEP 3: Knowledge Management (Notion Integration)

### Core Notion Features

#### **Search Notion**
Find pages, notes, and database entries across your entire Notion workspace.

**How to use:**
- "Search Notion for project planning"
- "Find my meeting notes from last week"
- "Show me notes about quarterly goals"

**What you get:**
- Page title and type
- Direct URL to the page
- Last edited timestamp
- Up to 50 results per search

**Features:**
- Full-text search across all accessible pages
- Sorted by most recently edited
- Fast and accurate results

---

#### **Create Notion Notes**
Create new pages and notes in your Notion workspace through chat.

**How to use:**
- "Create a note in Notion titled 'Project Ideas' with content..."
- "Add a note about the client feedback to my Work Notes page"
- "Make a new page called 'Meeting Action Items'"

**What happens:**
- Creates a new page under your specified parent page
- Adds the title and content you provide
- Returns the page ID for future reference

**Requirements:**
- You need the parent page ID (get from Notion URL)
- Content is optional - can create empty pages

---

#### **Query Notion Databases**
View and filter entries in your Notion databases (tasks, projects, etc.)

**How to use:**
- "Show me my pending tasks in Notion"
- "List all entries in my Projects database"
- "What's in my Content Calendar database?"

**What you get:**
- All database entries and their properties
- Creation timestamps
- Direct URLs to each entry
- Up to 100 results per query

**Use cases:**
- Task management
- Project tracking
- Content planning
- CRM databases

---

#### **Create Database Entries**
Add new entries to your Notion databases via chat.

**How to use:**
- "Add a task 'Review Q4 report' to my Tasks database"
- "Create a new project entry called 'Website Redesign'"
- "Add 'Client Meeting Notes' to my Work Log database"

**What happens:**
- Creates a new entry in the specified database
- Sets the title/name property
- Can include additional properties (status, tags, dates, etc.)
- Returns confirmation and entry ID

**Benefits:**
- Quick task capture
- Update databases without opening Notion
- Maintain databases while on the go

---

#### **Update Notion Pages**
Modify existing pages or database entries.

**How to use:**
- "Archive that meeting notes page"
- "Update the status of task XYZ to Done"
- "Mark page ABC as complete"

**What you can update:**
- Page properties
- Archive status
- Database entry fields

**Requirements:**
- Need the page ID (from search or create operations)

---

### **Benefits of Notion Integration**

**Unified Knowledge Base:**
- Access all your notes and databases through Aura
- No need to switch between apps
- Quick information retrieval

**Productivity Boost:**
- Capture thoughts and tasks instantly
- Update databases on the go
- Search across all your knowledge

**Workflow Integration:**
- Connect calendar events to Notion pages
- Document meeting outcomes
- Track action items from conversations

---

**Last Updated:** October 22, 2025  
**Version:** Phase 2.2 with Quick Notes (28 features live)  
**Status:** Production-ready and deployed at aurasb.replit.app

---

## 📝 STEP 4: Quick Notes with Auto-Categorization

Instantly capture thoughts, ideas, tasks, and meeting notes with AI-powered organization. Aura automatically categorizes your notes, detects priority, generates tags, and optionally syncs to Notion.

### Core Quick Notes Features

#### **Text Notes - Instant Capture**
Save any thought or idea instantly with automatic AI categorization.

**How to use:**
- "Remind me to call Dr. Smith tomorrow"
- "Idea: Build a new analytics dashboard"
- "Meeting note: John agreed to 20% budget increase"
- "Save this: Review Q4 performance metrics"

**AI Auto-Categorization:**
- **Note Type**: task, idea, meeting_note, general
- **Category**: work, personal, ideas, follow_ups
- **Priority**: high, normal, low
- **Tags**: 2-5 relevant keywords automatically generated

**Smart Features:**
- Calendar linking - connects meeting notes to recent events (last 7 days)
- Notion sync - automatically creates pages in your default parent
- Priority detection - identifies urgency from context
- Tag generation - extracts key topics and themes

---

#### **Photo Notes - OCR Extraction**
Take a photo of anything with text and Aura will extract and organize it.

**How to use:**
- Send a photo of a whiteboard, business card, or handwritten notes
- Add an optional caption to provide context
- Aura extracts text using GPT-4 Vision
- Automatically categorizes and saves as a note

**What you can capture:**
- Whiteboard diagrams and brainstorming sessions
- Business cards with contact information
- Handwritten meeting notes
- Printed documents or agendas
- Screenshots with important text

**Photo Processing:**
- GPT-4 Vision OCR - high-accuracy text extraction
- Caption support - add context to your photos
- Empty text protection - won't create blank notes
- Automatic categorization of extracted content

**Example:**
```
[Send photo of whiteboard]
Caption: "Product roadmap ideas from team meeting"

Aura Response:
✅ Photo note saved! I've categorized this as a "work" note (type: meeting_note) 
with tags: product-roadmap, team-meeting, q4-planning
Synced to Notion ✓
```

---

#### **View Notes**
Access all your saved notes with smart filtering.

**How to use:**
- "Show me my notes" - view all recent notes
- "Show me my work notes" - filter by category
- "Show me my task notes" - filter by note type
- "Show me my ideas" - see just ideas

**Display Format:**
Each note shows:
- Priority level (HIGH/NORMAL/LOW)
- Note content
- Category and note type
- Tags
- 🔗 Calendar link indicator (if linked to event)
- 📒 Notion sync indicator (if synced)

**Example Response:**
```
📋 Your Notes (5)

1. [HIGH] Call Dr. Smith tomorrow
   📁 personal | 📝 task | 🏷️ health, appointment

2. [NORMAL] Build analytics dashboard 🔗 📒
   📁 work | 📝 idea | 🏷️ product, analytics, dashboard

3. [NORMAL] John agreed to 20% budget increase 🔗 📒
   📁 work | 📝 meeting_note | 🏷️ budget, approval, john
```

---

### **Quick Notes Technology Stack**

**AI Processing:**
- GPT-4o - natural language understanding for categorization
- GPT-4 Vision - OCR for photo text extraction
- Structured outputs - consistent note metadata

**Database Storage:**
- `quick_notes` table - stores all note metadata
- Fields: noteType, category, priority, content, tags
- Photo URL tracking for image notes
- Calendar event linking (linkedEventId)
- Notion page tracking (notionPageId)

**Integrations:**
- **Notion**: Auto-sync to default parent page
- **Google Calendar**: Link notes to recent meeting events
- **Telegram**: Text and photo message handlers

---

### **Benefits of Quick Notes**

**Never Lose a Thought:**
- Capture ideas instantly via text or photo
- No need to switch apps or format notes
- AI handles organization automatically

**Smart Organization:**
- Automatic categorization (work vs personal)
- Priority detection from context
- Relevant tags generated automatically
- Connected to calendar events when relevant

**Seamless Workflow:**
- Syncs to Notion for permanent storage
- Links to calendar events for context
- View and filter notes anytime
- Photo OCR for capturing physical notes

---

## 🔧 Technical Architecture

### Email Integration Stack
- **Gmail API**: Full OAuth2 access with manual credentials
- **Authentication**: Dual-mode (Manual OAuth2 primary, Replit Connector fallback)
- **Scopes**: gmail.readonly, gmail.send, gmail.modify, gmail.labels
- **Security**: Refresh token management, automatic token refresh
- **Storage**: Email thread tracking with AI summaries in PostgreSQL
- **AI Processing**: Meeting request extraction, email categorization

### OAuth Authorization Flow
1. User visits `/oauth/gmail/authorize` endpoint
2. Redirected to Google for consent
3. Callback receives authorization code
4. Exchange code for refresh token
5. Store refresh token in environment
6. Automatic access token refresh on each request

---

### Notion Integration Stack
- **Notion API**: Full workspace access via Replit Connector
- **Authentication**: OAuth2 via Replit Connectors (automatic token refresh)
- **Permissions**: user:read, user:write, content:read, content:write, workspace:read, workspace:write
- **Storage**: Operation audit logging in PostgreSQL
- **Features**: Search, create pages, query databases, create entries, update pages
- **SDK**: @notionhq/client v5.3.0

### Notion API Capabilities
- Search across all accessible pages and databases
- Create new pages and notes
- Query databases with filters and sorting
- Create database entries with properties
- Update page properties and archive status
- Automatic handling of 2000-character content limits

---

## 📚 Documentation Files

- **AURA_MASTER_DOCUMENTATION.md**: Complete feature documentation (this file)
- **GMAIL_QUICK_START.md**: 15-minute Gmail setup guide
- **GMAIL_OAUTH_SETUP.md**: Detailed OAuth2 configuration instructions
- **replit.md**: Technical architecture and system design
