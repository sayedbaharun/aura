# Railway Deployment Guide

This guide walks you through deploying Aura to Railway.app.

## Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app)
- Google Cloud Console project (for Calendar/Gmail)
- Telegram bot token
- OpenAI API key

---

## Step 1: Prepare Credentials

### 1.1 Get Gmail Refresh Token

Run this script locally to generate your refresh token:

```bash
CLIENT_ID=your-google-client-id.apps.googleusercontent.com \
CLIENT_SECRET=your-google-client-secret \
node scripts/get-gmail-token.js
```

Follow the prompts and save the `GMAIL_REFRESH_TOKEN` output.

### 1.2 Telegram Bot Setup

Get your bot token from @BotFather in Telegram.
Get your chat ID by messaging your bot and visiting: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`

---

## Step 2: Deploy to Railway

### 2.1 Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `sayedbaharun/aura`
5. Select branch: `claude/codebase-analysis-review-011CUr959whXxSnp3oWGShBe` (or `main` after merge)

### 2.2 Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically creates the database and sets `DATABASE_URL`

### 2.3 Configure Environment Variables

In Railway project settings → Variables, add:

```bash
# Database (auto-set by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Node Environment
NODE_ENV=production

# OpenAI API
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-random-32-character-secret-here

# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
AUTHORIZED_TELEGRAM_CHAT_IDS=your-telegram-chat-id
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-here

# Google Calendar OAuth2
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_REFRESH_TOKEN=<from-step-1.1>

# Gmail OAuth2
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=<from-step-1.1>

# Notion Integration (optional)
NOTION_API_KEY=secret_your-notion-api-key
```

### 2.4 Configure Build & Start Commands

Railway should auto-detect from `package.json`, but verify:

- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

---

## Step 3: Run Database Migration

After first deployment:

1. Go to Railway project → Your service
2. Click "..." → "Shell"
3. Run: `npm run db:push`

This creates all database tables.

---

## Step 4: Set Up Telegram Webhook

After deployment, Railway provides a domain like: `your-app.up.railway.app`

The webhook is automatically configured on startup! Just verify in logs:

```
Telegram webhook configured: https://your-app.up.railway.app/api/telegram-webhook
```

---

## Step 5: Test Your Deployment

### 5.1 Test Health Check

Visit: `https://your-app.up.railway.app/health`

Should return:
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

### 5.2 Test Telegram Bot

1. Open Telegram
2. Send message to your bot: `/start`
3. Try: "Schedule a meeting tomorrow at 3pm"
4. Bot should respond with AI assistance

### 5.3 Test Dashboard

Visit: `https://your-app.up.railway.app`

Should see Aura dashboard (no login required).

---

## Step 6: Monitor & Maintain

### View Logs

Railway Dashboard → Your Service → Logs

### Database Management

Railway Dashboard → PostgreSQL → Data (use built-in pgAdmin)

### Restart Service

Railway Dashboard → Your Service → "..." → "Restart"

---

## Troubleshooting

### Issue: "Database connection failed"

**Solution**: Check `DATABASE_URL` is set correctly. Railway should auto-set this when you add PostgreSQL.

### Issue: "OpenAI API error"

**Solution**: Verify `OPENAI_API_KEY` is valid and starts with `sk-`

### Issue: "Telegram webhook not working"

**Solution**:
1. Check `TELEGRAM_BOT_TOKEN` is correct
2. Verify Railway domain is accessible (not private)
3. Check logs for webhook setup confirmation

### Issue: "Gmail not working"

**Solution**:
1. Run `scripts/get-gmail-token.js` again to get fresh refresh token
2. Ensure all 3 Gmail variables are set: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN

### Issue: "Calendar integration fails"

**Solution**:
1. Same as Gmail - verify all 3 GOOGLE_CALENDAR variables
2. Check Google Cloud Console: APIs enabled
3. Verify OAuth consent screen is published

---

## Cost Estimates

Railway Pricing (as of 2024):
- **Hobby Plan**: $5/month credit (enough for this app)
- **PostgreSQL**: Included in Hobby
- **Bandwidth**: 100GB/month included

Expected monthly cost: **$5-10/month**

---

## Updating Your Deployment

Railway auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Railway detects the push and redeploys automatically!

---

## Custom Domain (Optional)

1. Railway Dashboard → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `aura.yourdomain.com`)
4. Add CNAME record in your DNS provider:
   ```
   CNAME aura.yourdomain.com → your-app.up.railway.app
   ```

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Aura Issues**: https://github.com/sayedbaharun/aura/issues

---

## Differences from Replit

| Feature | Replit | Railway |
|---------|--------|---------|
| **Auth** | Built-in OpenID | None (removed) |
| **Database** | PostgreSQL 16 | PostgreSQL (latest) |
| **Domains** | `.replit.app` | `.up.railway.app` |
| **Connectors** | Automatic OAuth | Manual refresh tokens |
| **Deployment** | Manual/on-save | Git push auto-deploy |
| **Cost** | $20-50/month | $5-10/month |
| **Sleep** | Can sleep ❌ | Always-on ✅ |

---

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Test all features
3. ⏭️ Add custom domain (optional)
4. ⏭️ Set up monitoring (Sentry, LogTail)
5. ⏭️ Add rate limiting to API routes
6. ⏭️ Implement caching layer

---

**Deployment Date**: 2025-11-06
**Version**: Railway Migration v1.0
**Status**: ✅ Production Ready
