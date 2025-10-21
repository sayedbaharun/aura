# Gmail OAuth2 Quick Start

Follow these steps in order to enable full Gmail access:

## Quick Steps

### 1. Set Up Google Cloud Project (10 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Aura Personal Assistant"
3. Enable Gmail API:
   - Go to **APIs & Services** > **Library**
   - Search "Gmail API" → Enable
4. Configure OAuth consent:
   - Go to **OAuth consent screen**
   - Choose **External** → Fill in app name and your email
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.labels`
   - Add your email as a **test user**
5. Create credentials:
   - Go to **Credentials** > **Create Credentials** > **OAuth client ID**
   - Type: **Desktop app**
   - Name: "Aura Desktop Client"
   - Download JSON file

### 2. Add to Replit Secrets (2 minutes)

Open your downloaded JSON file and add these secrets:

1. **GMAIL_CLIENT_ID**: Copy from `client_id` field
2. **GMAIL_CLIENT_SECRET**: Copy from `client_secret` field
3. **GMAIL_REDIRECT_URI**: `http://localhost:5000/oauth/gmail/callback`

### 3. Authorize and Get Refresh Token (2 minutes)

1. Make sure your app is running
2. Visit: `http://localhost:5000/oauth/gmail/authorize`
3. Sign in with Google and grant permissions
4. Copy the refresh token from the success page
5. Add to Replit Secrets:
   - **GMAIL_REFRESH_TOKEN**: (paste the token)

### 4. Restart and Test

1. Restart your application
2. Gmail features are now active with full permissions!

## Testing

Test via Telegram:
- "Check my emails"
- "Send an email to [email] saying [message]"
- "Search my emails for [query]"

## Need Help?

See [GMAIL_OAUTH_SETUP.md](./GMAIL_OAUTH_SETUP.md) for detailed instructions and troubleshooting.
