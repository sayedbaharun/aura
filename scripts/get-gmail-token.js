#!/usr/bin/env node

/**
 * Quick script to get Gmail refresh token
 * Run: CLIENT_ID=your_id CLIENT_SECRET=your_secret node scripts/get-gmail-token.js
 */

const readline = require('readline');
const { google } = require('googleapis');

const CLIENT_ID = process.env.CLIENT_ID || process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5000/oauth/gmail/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Error: Missing credentials!');
  console.error('\nUsage:');
  console.error('  CLIENT_ID=your_client_id CLIENT_SECRET=your_secret node scripts/get-gmail-token.js');
  console.error('\nOr set environment variables:');
  console.error('  export GMAIL_CLIENT_ID=your_client_id');
  console.error('  export GMAIL_CLIENT_SECRET=your_secret');
  console.error('  node scripts/get-gmail-token.js\n');
  process.exit(1);
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/calendar',
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🔐 Gmail OAuth Setup\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Authorize the app');
console.log('3. Copy the "code" parameter from the redirect URL');
console.log('4. Paste it below:\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log('\n✅ Success! Add these to your Railway environment variables:\n');
    console.log('GMAIL_CLIENT_ID=' + CLIENT_ID);
    console.log('GMAIL_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nGOOGLE_CALENDAR_CLIENT_ID=' + CLIENT_ID);
    console.log('GOOGLE_CALENDAR_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GOOGLE_CALENDAR_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\n');
  } catch (error) {
    console.error('Error getting tokens:', error.message);
  }
  rl.close();
});
