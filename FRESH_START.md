# 🆕 FRESH DATABASE SETUP - CLEAN SLATE

Since this is a new project with no production data, we're starting fresh to avoid migration issues.

---

## 🗑️ STEP 1: Drop Old Database (On Replit)

### Option A: Using Replit Database Pane (EASIEST)

1. Open your Replit project
2. Click **Database** in the left sidebar
3. Look for a button like **"Reset Database"** or **"Drop All Tables"**
4. Confirm the action

### Option B: Using SQL Console

1. Open Replit **Database Console** (or Shell with `psql`)
2. Copy and paste this SQL:

```sql
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS pending_confirmations CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS assistant_settings CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

3. Press **Execute**
4. You should see: `DROP TABLE` (7 times)

---

## ✅ STEP 2: Create Fresh Database (On Replit)

Now that the old tables are gone, create fresh ones with correct types:

```bash
# This will create all tables from scratch with INTEGER columns
npm run db:push
```

**Expected output:**
```
✓ Creating table: users
✓ Creating table: sessions
✓ Creating table: whatsapp_messages
✓ Creating table: appointments
✓ Creating table: assistant_settings
✓ Creating table: pending_confirmations
✓ Creating table: audit_logs
✓ All tables created successfully
```

---

## 🔑 STEP 3: Set Environment Variables (Replit Secrets)

Make sure these are all set:

```bash
# REQUIRED - Database
DATABASE_URL=<your-neon-postgres-url>

# REQUIRED - Telegram Bot
TELEGRAM_BOT_TOKEN=<your-bot-token>
AUTHORIZED_TELEGRAM_CHAT_IDS=<your-chat-id>

# REQUIRED - New for security
TELEGRAM_WEBHOOK_SECRET=<generate-this-below>

# REQUIRED - OpenAI
AI_INTEGRATIONS_OPENAI_API_KEY=<openai-key>
AI_INTEGRATIONS_OPENAI_BASE_URL=<openai-base-url>

# REQUIRED - Session security
SESSION_SECRET=<32+-char-random-string>

# REQUIRED - Replit Connectors
REPLIT_CONNECTORS_HOSTNAME=<should-be-set-by-replit>

# OPTIONAL
LOG_LEVEL=info
ALLOWED_ORIGINS=https://your-app.repl.co
```

**Generate webhook secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 STEP 4: Deploy

```bash
# Build for production
npm run build

# Click "Deploy" button in Replit UI
```

---

## ✅ STEP 5: Verify Deployment

```bash
# Check health
curl https://your-app.repl.co/health

# Expected:
{
  "status": "healthy",
  "checks": {
    "database": true,
    "openai": true,
    "calendar": true
  }
}
```

---

## 🎯 WHAT YOU GET

Fresh database with **correct schema from day 1:**

✅ `appointment_duration`: **INTEGER** (not TEXT)
✅ `default_meeting_duration`: **INTEGER** (not TEXT)
✅ All indexes in place
✅ All constraints configured
✅ Singleton settings pattern
✅ Unique constraints on confirmations

**No migration issues, no baggage, ready to go!** 🚀

---

## 📝 NOTES

- All your code is already correct (integer types in schema.ts)
- The old database just had TEXT from before we fixed it
- Starting fresh = no migration headaches
- Perfect time to do this (no production data to lose)
