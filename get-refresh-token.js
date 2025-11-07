import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';
import readline from 'readline';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log(`\n${colors.bright}${colors.blue}🤖 Aura - Google Calendar Refresh Token Generator${colors.reset}\n`);

  console.log(`${colors.yellow}Please enter your Google OAuth2 credentials:${colors.reset}\n`);

  const clientId = await question(`${colors.bright}Client ID:${colors.reset} `);
  const clientSecret = await question(`${colors.bright}Client Secret:${colors.reset} `);

  if (!clientId || !clientSecret) {
    console.log(`\n${colors.red}❌ Error: Client ID and Client Secret are required${colors.reset}\n`);
    rl.close();
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    'http://localhost:3000/oauth2callback'
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Forces refresh token to be returned
  });

  console.log(`\n${colors.green}✓${colors.reset} Starting local server on port 3000...`);

  const server = http.createServer(async (req, res) => {
    if (req.url.indexOf('/oauth2callback') > -1) {
      const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ Authentication failed - no code received</h1>');
        server.close();
        rl.close();
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head>
            <title>Aura - Authentication Successful</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
              }
              h1 { color: #10b981; margin: 0 0 1rem 0; }
              p { color: #6b7280; font-size: 1.1rem; }
              .emoji { font-size: 4rem; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="emoji">🤖✅</div>
              <h1>Authentication Successful!</h1>
              <p>Check your terminal for the refresh token.</p>
              <p style="font-size: 0.9rem; margin-top: 2rem;">You can close this window now.</p>
            </div>
          </body>
        </html>
      `);

      server.close();

      try {
        console.log(`\n${colors.green}✓${colors.reset} Authorization code received, getting tokens...`);
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
          console.log(`\n${colors.red}❌ Error: No refresh token received.${colors.reset}`);
          console.log(`${colors.yellow}This might happen if you've already authorized this app before.${colors.reset}`);
          console.log(`${colors.yellow}Try revoking access at: https://myaccount.google.com/permissions${colors.reset}\n`);
          rl.close();
          return;
        }

        console.log(`\n${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.bright}${colors.green}✅ SUCCESS! Add these to your .env file:${colors.reset}`);
        console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

        console.log(`${colors.bright}GOOGLE_CALENDAR_CLIENT_ID${colors.reset}=${clientId.trim()}`);
        console.log(`${colors.bright}GOOGLE_CALENDAR_CLIENT_SECRET${colors.reset}=${clientSecret.trim()}`);
        console.log(`${colors.bright}GOOGLE_CALENDAR_REFRESH_TOKEN${colors.reset}=${tokens.refresh_token}`);

        console.log(`\n${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

        console.log(`${colors.blue}💡 Next steps:${colors.reset}`);
        console.log(`   1. Copy the above values to your .env file`);
        console.log(`   2. Run: ${colors.bright}npm run dev${colors.reset}`);
        console.log(`   3. Your Aura assistant can now access Google Calendar! 🎉\n`);

      } catch (error) {
        console.log(`\n${colors.red}❌ Error getting tokens:${colors.reset}`, error.message);
      }

      rl.close();
    }
  }).listen(3000, () => {
    console.log(`${colors.green}✓${colors.reset} Server running on http://localhost:3000`);
    console.log(`\n${colors.bright}${colors.yellow}📖 Opening browser for authentication...${colors.reset}\n`);
    console.log(`${colors.blue}If browser doesn't open automatically, visit:${colors.reset}`);
    console.log(`${authUrl}\n`);

    open(authUrl, { wait: false }).catch(() => {
      console.log(`${colors.yellow}⚠️  Could not open browser automatically${colors.reset}`);
      console.log(`${colors.yellow}Please manually open the URL above${colors.reset}\n`);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n${colors.red}❌ Error: Port 3000 is already in use${colors.reset}`);
      console.log(`${colors.yellow}Please close any other applications using port 3000 and try again${colors.reset}\n`);
    } else {
      console.log(`\n${colors.red}❌ Server error:${colors.reset}`, err.message, '\n');
    }
    rl.close();
    process.exit(1);
  });
}

main().catch(err => {
  console.log(`\n${colors.red}❌ Unexpected error:${colors.reset}`, err.message, '\n');
  rl.close();
  process.exit(1);
});
