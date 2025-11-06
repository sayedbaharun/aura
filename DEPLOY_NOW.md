# 🚀 DEPLOY TO RAILWAY - SIMPLIFIED (NO GMAIL)

This deployment skips Gmail for now. You'll have:
✅ Telegram Bot (messages, scheduling)
✅ Google Calendar (appointments, meetings)
✅ Notion (notes, knowledge base)
✅ Web Dashboard (view data)
⏭️ Gmail (add later when needed)

**Time Required**: 15-20 minutes

---

## Step 1: Create Railway Account (2 minutes)

1. Go to https://railway.app
2. Click "Login" → Sign in with GitHub
3. Authorize Railway

---

## Step 2: Deploy Your App (5 minutes)

### 2.1 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: **sayedbaharun/aura**
4. Select branch: **claude/codebase-analysis-review-011CUr959whXxSnp3oWGShBe**
5. Click "Deploy"

### 2.2 Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Done! Railway auto-sets DATABASE_URL

---

## Step 3: Set Environment Variables (5 minutes)

Go to: **Railway Project → Settings → Variables**

Copy and paste these (replace placeholders):

```bash
# Database (auto-set by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Node Environment
NODE_ENV=production

# OpenAI API
OPENAI_API_KEY=sk-proj-your-openai-key-here

# Session Secret (already generated for you)
SESSION_SECRET=your-generated-session-secret-here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
AUTHORIZED_TELEGRAM_CHAT_IDS=your-telegram-chat-id-here
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-here

# Google Calendar (using your existing credentials)
GOOGLE_CALENDAR_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALENDAR_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_HERE

# Notion
NOTION_API_KEY=secret_your-notion-api-key-here
```

**⚠️ IMPORTANT**: Replace `YOUR_REFRESH_TOKEN_HERE` with your actual Calendar refresh token!

### Need Calendar Refresh Token?

If you don't have it, run this on Replit:
```bash
CLIENT_ID=your-google-client-id CLIENT_SECRET=your-google-client-secret node scripts/get-gmail-token.js
```

Or visit: https://aurasb.replit.app/oauth/gmail/authorize

---

## Step 4: Update Google Cloud Console (5 minutes)

**Important**: Tell Google about your Railway domain

1. Go to https://console.cloud.google.com/apis/credentials
2. Click your OAuth Client ID
3. Under **"Authorized redirect URIs"**, add:
   ```
   https://your-app.up.railway.app/oauth/gmail/callback
   ```
   (Replace `your-app` with your actual Railway subdomain)
4. Click "Save"

**How to find your Railway domain:**
- Railway Dashboard → Your Service → Settings → Domain
- It will be something like: `aura-production-xyz123.up.railway.app`

---

## Step 5: Run Database Migration (2 minutes)

After deployment completes:

1. Railway Dashboard → Your Service → "..." → "Shell"
2. Run:
   ```bash
   npm run db:push
   ```
3. Wait for "✓ Tables created successfully"

---

## Step 6: Test Your Deployment (5 minutes)

### 6.1 Check Health

Visit: `https://your-app.up.railway.app/health`

Should show:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "openai": true,
    "calendar": true
  }
}
```

### 6.2 Test Telegram Bot

1. Open Telegram
2. Message your bot: `/start`
3. Try: **"Schedule a meeting tomorrow at 3pm"**
4. Bot should respond! 🎉

### 6.3 Test Dashboard

Visit: `https://your-app.up.railway.app`

You should see the Aura dashboard.

---

## What Works Without Gmail

✅ **Calendar Management**:
- Schedule appointments via Telegram
- Check your calendar
- Reschedule/cancel meetings
- Recurring events
- Google Meet links

✅ **Notion Integration**:
- Save quick notes
- Create pages
- Knowledge management

✅ **Telegram Bot**:
- Natural language commands
- AI assistance
- Photo OCR (send images to extract text)

❌ **Not Available** (until you add Gmail):
- Check emails
- Send emails
- Email summaries
- Meeting request extraction from emails

---

## Add Gmail Later (When You Need It)

When you're ready to add Gmail:

1. Run the refresh token script (5 minutes)
2. Add 3 environment variables to Railway:
   ```
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   ```
3. Restart your Railway service
4. Done! ✅

---

## Troubleshooting

### "Calendar integration fails"

**Check**:
1. Is `GOOGLE_CALENDAR_REFRESH_TOKEN` set?
2. Run the token script if not
3. Make sure redirect URI is in Google Cloud Console

### "Telegram webhook not working"

**Check**:
1. Railway logs: Should see "Telegram webhook configured"
2. Bot token is correct
3. Chat ID matches (including the minus sign: `-7964798688`)

### "Health check shows degraded"

**Check Railway logs**:
```bash
Railway Dashboard → Your Service → Logs
```

Look for error messages and check which integration is failing.

---

## Cost Estimate

**Railway Pricing**:
- Hobby Plan: $5/month (includes 100GB bandwidth)
- PostgreSQL: Included
- Your app: ~$5-10/month total

**vs Replit**: Saving $15-40/month! 💰

---

## Next Steps After Deployment

1. ✅ Test all features
2. ⏭️ Add custom domain (optional)
3. ⏭️ Set up error monitoring (Sentry)
4. ⏭️ Add Gmail when needed
5. ⏭️ Optimize performance (caching)

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Issues: https://github.com/sayedbaharun/aura/issues

---

**Ready to Deploy?** 🚀

Start with **Step 1** and you'll be live in 15-20 minutes!
