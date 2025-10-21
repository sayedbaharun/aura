# Gmail OAuth2 Setup Guide

Follow these steps to enable full Gmail API access for Aura.

## 1. Create/Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "Aura Personal Assistant"

## 2. Enable Gmail API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click on it and press **Enable**

## 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in the required fields:
   - **App name**: Aura Personal Assistant
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or Remove Scopes**
6. Add these Gmail scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` - Read all emails
   - `https://www.googleapis.com/auth/gmail.send` - Send emails
   - `https://www.googleapis.com/auth/gmail.modify` - Modify emails (mark as read, etc.)
   - `https://www.googleapis.com/auth/gmail.labels` - Manage labels
7. Click **Update** then **Save and Continue**
8. Add your email as a test user (under **Test users**)
9. Click **Save and Continue**

## 4. Create OAuth2 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Desktop app** as the application type
4. Name it "Aura Desktop Client"
5. Click **Create**
6. **IMPORTANT**: Download the credentials JSON file (click the download icon)
   - It will be named something like `client_secret_xxx.json`
   - Keep this file safe - you'll need the `client_id` and `client_secret`

## 5. Add Credentials to Replit Secrets

Add these secrets in your Replit project (Secrets tab in the left sidebar):

1. **GMAIL_CLIENT_ID**: The `client_id` from the downloaded JSON
2. **GMAIL_CLIENT_SECRET**: The `client_secret` from the downloaded JSON
3. **GMAIL_REDIRECT_URI**: Set to `http://localhost:5000/oauth/gmail/callback`

## 6. Generate Refresh Token

After updating the code, you'll run a one-time authorization flow:

1. Visit: `http://localhost:5000/oauth/gmail/authorize` in your browser
2. You'll be redirected to Google to authorize the app
3. Sign in and grant all requested permissions
4. You'll be redirected back and see your refresh token
5. Copy the refresh token and add it to Replit Secrets as **GMAIL_REFRESH_TOKEN**

## 7. Restart the Application

Once all secrets are added, restart your app and the Gmail features will work!

## Troubleshooting

- **"Access blocked"**: Make sure your email is added as a test user in the OAuth consent screen
- **"Redirect URI mismatch"**: Ensure the redirect URI in your OAuth client matches exactly: `http://localhost:5000/oauth/gmail/callback`
- **Token expired**: The refresh token should auto-refresh, but if issues persist, re-run the authorization flow
