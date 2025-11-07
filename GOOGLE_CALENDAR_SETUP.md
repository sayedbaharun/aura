# 🔐 Google Calendar OAuth Setup Guide

This guide will help you set up Google Calendar integration for Aura.

## Prerequisites

- A Google account
- Node.js and npm installed
- Access to Google Cloud Console

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** dropdown → **"NEW PROJECT"**
3. Enter project name: **`Aura Assistant`**
4. Click **"CREATE"**
5. Wait for the project to be created (takes a few seconds)

---

## Step 2: Enable Google Calendar API

1. Make sure your new project is selected (check the project name in the top bar)
2. In the left sidebar, go to **"APIs & Services"** → **"Library"**
3. In the search bar, type: **`Google Calendar API`**
4. Click on **"Google Calendar API"** in the results
5. Click the blue **"ENABLE"** button
6. Wait for it to enable (takes a few seconds)

---

## Step 3: Configure OAuth Consent Screen

1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type
3. Click **"CREATE"**

### OAuth Consent Screen - App Information
4. Fill in the required fields:
   - **App name**: `Aura Assistant`
   - **User support email**: Select your email from dropdown
   - **App logo**: (Optional) Skip for now
   - **App domain**: (Optional) Skip for now
   - **Developer contact information**: Enter your email

5. Click **"SAVE AND CONTINUE"**

### OAuth Consent Screen - Scopes
6. Click **"ADD OR REMOVE SCOPES"**
7. In the filter box, search for: `calendar`
8. Select these two scopes:
   - ✅ `https://www.googleapis.com/auth/calendar`
   - ✅ `https://www.googleapis.com/auth/calendar.events`
9. Click **"UPDATE"**
10. Click **"SAVE AND CONTINUE"**

### OAuth Consent Screen - Test Users
11. Click **"+ ADD USERS"**
12. Enter your Gmail address (the one you'll use with Aura)
13. Click **"ADD"**
14. Click **"SAVE AND CONTINUE"**

### OAuth Consent Screen - Summary
15. Review the summary
16. Click **"BACK TO DASHBOARD"**

---

## Step 4: Create OAuth2 Credentials

1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**
2. At the top, click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth client ID"**

### Create OAuth Client ID
4. **Application type**: Select **"Web application"**
5. **Name**: Enter `Aura Calendar Client`

### Authorized Redirect URIs
6. Under **"Authorized redirect URIs"**, click **"+ ADD URI"**
7. Enter exactly: `http://localhost:3000/oauth2callback`
8. Click **"CREATE"**

### Save Your Credentials
9. A popup will appear with your credentials
10. **IMPORTANT**: Copy and save these values:
    - **Client ID** (looks like: `xxxxx-xxxxx.apps.googleusercontent.com`)
    - **Client Secret** (looks like: `GOCSPX-xxxxxxxxxxxxx`)
11. Click **"OK"**

---

## Step 5: Install Required Dependencies

```bash
npm install googleapis open
```

---

## Step 6: Generate Refresh Token

1. Make sure you're in the Aura project directory:
   ```bash
   cd /home/user/aura
   ```

2. Run the token generator script:
   ```bash
   node get-refresh-token.js
   ```

3. The script will prompt you for:
   - **Client ID**: Paste the Client ID from Step 4
   - **Client Secret**: Paste the Client Secret from Step 4

4. Your browser will automatically open (or you'll see a URL to visit)

5. Sign in with your Google account (the one you added as a test user)

6. You'll see a warning: **"Google hasn't verified this app"**
   - Click **"Advanced"**
   - Click **"Go to Aura Assistant (unsafe)"** (it's safe, it's your own app!)

7. Review the permissions and click **"Allow"**

8. You'll see a success page, and your terminal will display:
   ```
   ✅ SUCCESS! Add these to your .env file:

   GOOGLE_CALENDAR_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-xxxxx
   GOOGLE_CALENDAR_REFRESH_TOKEN=1//xxxxx
   ```

---

## Step 7: Add Credentials to .env File

1. Create or edit `.env` file in the project root:
   ```bash
   nano .env
   ```

2. Add the three lines from the terminal output:
   ```bash
   GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-your-client-secret
   GOOGLE_CALENDAR_REFRESH_TOKEN=1//your-refresh-token
   ```

3. Make sure you also have other required variables (see `.env.example`)

4. Save and close the file (Ctrl+X, then Y, then Enter in nano)

---

## Step 8: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The server should start without errors

3. Check the logs - you should NOT see any errors about missing Google Calendar credentials

4. Test by sending a message to your Telegram bot or WhatsApp:
   ```
   What's on my calendar today?
   ```

5. The bot should respond with your calendar events! 🎉

---

## Troubleshooting

### "No refresh token received"
- This happens if you've already authorized the app before
- **Solution**: Revoke access at https://myaccount.google.com/permissions
  - Find "Aura Assistant" in the list
  - Click it and select "Remove Access"
  - Run `node get-refresh-token.js` again

### "Port 3000 is already in use"
- **Solution**: Stop any other applications using port 3000
- Or change the port in `get-refresh-token.js` (search for `:3000` and change both occurrences)

### "Google Calendar OAuth credentials not configured"
- Make sure all three variables are in your `.env` file
- Make sure there are no extra spaces or quotes
- Restart the server after adding the variables

### "Invalid grant" or "Token has been expired or revoked"
- Your refresh token may have expired
- **Solution**: Run `node get-refresh-token.js` again to get a new one

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in Step 3
- Make sure the redirect URI exactly matches: `http://localhost:3000/oauth2callback`

---

## Security Notes

- ⚠️ **Never commit your `.env` file to Git** (it's in `.gitignore`)
- ⚠️ **Never share your Client Secret or Refresh Token**
- ⚠️ Keep your credentials secure
- 🔒 The refresh token gives access to your Google Calendar - treat it like a password

---

## What's Next?

Once you have Google Calendar working, you can:

1. Ask Aura to check your calendar
2. Book new appointments
3. Reschedule existing events
4. Cancel appointments
5. Find free time slots

All through conversational AI on Telegram or WhatsApp! 🤖✨

---

## Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the server logs for detailed error messages
3. Make sure all environment variables are set correctly
4. Verify your Google Cloud project settings

Good luck! 🚀
