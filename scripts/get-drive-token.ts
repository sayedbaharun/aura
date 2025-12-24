/**
 * Google Drive OAuth Token Helper
 *
 * This script helps you get a refresh token for Google Drive access.
 *
 * Usage:
 * 1. Set your client ID and secret below (or via environment variables)
 * 2. Run: npx ts-node scripts/get-drive-token.ts
 * 3. Open the URL in your browser
 * 4. Authorize and copy the code from the redirect URL
 * 5. Paste the code when prompted
 * 6. Copy the refresh token to your .env file
 */

import { google } from 'googleapis';
import * as readline from 'readline';

// Your OAuth credentials - update these or set environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '934929533291-rf09qoinm2q2vaepb4n1k9bbrr4due2p.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// Scopes needed for Drive access
const SCOPES = [
  'https://www.googleapis.com/auth/drive',           // Full Drive access
  'https://www.googleapis.com/auth/drive.file',      // Access to files created by app
  'https://www.googleapis.com/auth/calendar',        // Calendar (if you want combined token)
];

async function getRefreshToken() {
  if (CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
    console.log('\n❌ ERROR: You need to set your client secret!');
    console.log('\nOptions:');
    console.log('1. Edit this file and replace YOUR_CLIENT_SECRET_HERE');
    console.log('2. Run with: GOOGLE_CLIENT_SECRET=your-secret npx ts-node scripts/get-drive-token.ts');
    console.log('\nTo get your client secret:');
    console.log('- Go to https://console.cloud.google.com/apis/credentials');
    console.log('- Click on your OAuth client "aura"');
    console.log('- Click "ADD SECRET" to create a new one (you cannot view existing secrets)');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // This is required to get a refresh token
    scope: SCOPES,
    prompt: 'consent',       // Force consent screen to always get refresh token
  });

  console.log('\n🔐 Google Drive OAuth Setup\n');
  console.log('Step 1: Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n' + '='.repeat(80) + '\n');
  console.log('Step 2: Sign in and authorize the app');
  console.log('Step 3: You\'ll be redirected to localhost:3000/oauth2callback?code=...');
  console.log('Step 4: Copy the "code" parameter from the URL\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('Paste the authorization code here: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    console.log('\n✅ Success! Here are your tokens:\n');
    console.log('='.repeat(80));

    if (tokens.refresh_token) {
      console.log('\n📋 Add this to your .env file:\n');
      console.log(`GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n' + '='.repeat(80));
      console.log('\n💡 Or if you want to use the same credentials for Calendar:');
      console.log(`GOOGLE_CALENDAR_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_CALENDAR_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      console.log('\n⚠️  No refresh token received!');
      console.log('This usually happens if you\'ve already authorized this app.');
      console.log('Try revoking access at https://myaccount.google.com/permissions');
      console.log('Then run this script again.\n');

      if (tokens.access_token) {
        console.log('Access token (temporary):', tokens.access_token);
      }
    }

    console.log('\n');
  } catch (error: any) {
    console.error('\n❌ Error exchanging code for tokens:', error.message);

    if (error.message.includes('invalid_grant')) {
      console.log('\nThe authorization code may have expired or already been used.');
      console.log('Please run this script again and use the new code immediately.');
    }
  }
}

getRefreshToken();
