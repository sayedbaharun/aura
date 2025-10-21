import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWhatsappMessageSchema, insertAppointmentSchema, insertAssistantSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { processMessage } from "./ai-assistant";
import * as gmail from "./gmail";
// WhatsApp webhook removed - not needed for Phase 1
import { setupAuth, isAuthenticated } from "./replitAuth";
import { logger } from "./logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Health check endpoint (unauthenticated)
  app.get('/health', async (req, res) => {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        openai: false,
        calendar: false,
      }
    };

    // Check database connectivity
    try {
      await storage.getSettings();
      health.checks.database = true;
    } catch (error) {
      logger.error({ error }, 'Health check: Database connectivity failed');
      health.status = 'degraded';
    }

    // Check OpenAI connectivity (light check - just verify config)
    try {
      if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        health.checks.openai = true;
      } else {
        health.status = 'degraded';
      }
    } catch (error) {
      logger.error({ error }, 'Health check: OpenAI configuration check failed');
      health.status = 'degraded';
    }

    // Check Google Calendar connectivity
    try {
      const { getUncachableGoogleCalendarClient } = await import('./google-calendar');
      await getUncachableGoogleCalendarClient();
      health.checks.calendar = true;
    } catch (error) {
      logger.error({ error }, 'Health check: Google Calendar connectivity failed');
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Gmail OAuth2 setup routes (unauthenticated for initial setup)
  app.get('/oauth/gmail/authorize', async (req, res) => {
    try {
      const authUrl = gmail.getAuthUrl();
      if (!authUrl) {
        res.status(400).send(`
          <h1>Gmail OAuth Not Configured</h1>
          <p>Please set the following environment variables in Replit Secrets:</p>
          <ul>
            <li><code>GMAIL_CLIENT_ID</code></li>
            <li><code>GMAIL_CLIENT_SECRET</code></li>
            <li><code>GMAIL_REDIRECT_URI</code> (optional, defaults to http://localhost:5000/oauth/gmail/callback)</li>
          </ul>
          <p>See <a href="/GMAIL_OAUTH_SETUP.md">Setup Guide</a> for instructions.</p>
        `);
        return;
      }
      res.redirect(authUrl);
    } catch (error) {
      logger.error({ error }, 'Error generating Gmail auth URL');
      res.status(500).send('Failed to generate authorization URL');
    }
  });

  app.get('/oauth/gmail/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).send('Authorization code not provided');
        return;
      }

      const tokens = await gmail.getTokensFromCode(code);
      
      if (!tokens.refresh_token) {
        res.status(400).send(`
          <h1>No Refresh Token Received</h1>
          <p>Google did not return a refresh token. This usually happens when you've already authorized this app before.</p>
          <p><strong>To fix this:</strong></p>
          <ol>
            <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a></li>
            <li>Find "Aura Personal Assistant" and remove access</li>
            <li>Try <a href="/oauth/gmail/authorize">authorizing again</a></li>
          </ol>
          <p>The refresh token is only returned on the first authorization with <code>prompt=consent</code>.</p>
        `);
        return;
      }
      
      res.send(`
        <h1>Gmail Authorization Successful!</h1>
        <p>Your refresh token (save this in Replit Secrets as <code>GMAIL_REFRESH_TOKEN</code>):</p>
        <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto;">${tokens.refresh_token}</pre>
        <p><strong>Next steps:</strong></p>
        <ol>
          <li>Copy the refresh token above</li>
          <li>Go to Replit Secrets (Tools → Secrets in the left sidebar)</li>
          <li>Add a new secret: <code>GMAIL_REFRESH_TOKEN</code> = (paste the token)</li>
          <li>Restart your application</li>
        </ol>
        <p>Gmail integration will now work with full permissions!</p>
      `);
    } catch (error) {
      logger.error({ error }, 'Error exchanging code for tokens');
      res.status(500).send('Failed to exchange authorization code for tokens');
    }
  });

  // Auth route - get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      logger.error({ error }, "Error fetching user");
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all messages (protected)
  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      logger.error({ error }, "Error fetching messages");
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create a message (protected)
  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertWhatsappMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid message data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create message" });
      }
    }
  });

  // Get messages by phone number (protected)
  app.get("/api/messages/:phoneNumber", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesByPhone(req.params.phoneNumber);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get all appointments (protected)
  app.get("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      logger.error({ error }, "Error fetching appointments");
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Create an appointment (protected)
  app.post("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid appointment data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create appointment" });
      }
    }
  });

  // Get a specific appointment (protected)
  app.get("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  // Update an appointment (protected)
  app.put("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, updates);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid appointment data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update appointment" });
      }
    }
  });

  // Cancel an appointment (protected)
  app.delete("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const appointment = await storage.cancelAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  // Get assistant settings (protected)
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      logger.error({ error }, "Error fetching settings");
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update assistant settings (protected)
  app.put("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const updates = insertAssistantSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(updates);
      res.json(settings);
    } catch (error) {
      logger.error({ error }, "Error updating settings");
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid settings data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });

  // Email API endpoints (protected)
  
  // Get recent emails
  app.get("/api/emails", isAuthenticated, async (req, res) => {
    try {
      const maxResults = parseInt(req.query.maxResults as string) || 10;
      const unreadOnly = req.query.unreadOnly === 'true';
      const query = req.query.query as string;
      
      const emails = await gmail.listMessages({
        maxResults: Math.min(maxResults, 50),
        query: unreadOnly ? (query ? `${query} is:unread` : 'is:unread') : query,
      });
      
      res.json(emails);
    } catch (error) {
      logger.error({ error }, "Error fetching emails");
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  // Send an email
  app.post("/api/emails/send", isAuthenticated, async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, body" });
      }
      
      const result = await gmail.sendEmail({ to, subject, body });
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ error: result.error || "Failed to send email" });
      }
    } catch (error) {
      logger.error({ error }, "Error sending email");
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Search emails
  app.get("/api/emails/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      const maxResults = parseInt(req.query.maxResults as string) || 10;
      
      if (!query) {
        return res.status(400).json({ error: "Missing search query parameter 'q'" });
      }
      
      const emails = await gmail.searchEmails(query, Math.min(maxResults, 50));
      res.json(emails);
    } catch (error) {
      logger.error({ error }, "Error searching emails");
      res.status(500).json({ error: "Failed to search emails" });
    }
  });

  // Get email summaries for a user
  app.get("/api/email-summaries", isAuthenticated, async (req, res) => {
    try {
      const chatId = req.query.chatId as string;
      
      if (!chatId) {
        return res.status(400).json({ error: "Missing chatId parameter" });
      }
      
      const summaries = await storage.getEmailSummary(chatId);
      res.json(summaries);
    } catch (error) {
      logger.error({ error }, "Error fetching email summaries");
      res.status(500).json({ error: "Failed to fetch email summaries" });
    }
  });

  // Telegram Webhook - Use Telegraf's webhookCallback for proper handling
  // with secret token validation for security
  const setupTelegramWebhookRoute = async () => {
    try {
      const { bot } = await import('./telegram-bot');
      if (bot) {
        // Validate webhook secret token to prevent unauthorized webhook calls
        app.post('/api/telegram-webhook', (req, res, next) => {
          const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

          // Skip validation in development if no secret is set
          if (!webhookSecret && process.env.NODE_ENV === 'development') {
            logger.warn('Telegram webhook running without secret validation in development mode');
            return next();
          }

          // In production, require secret token
          if (!webhookSecret) {
            logger.error('TELEGRAM_WEBHOOK_SECRET not set in production');
            return res.status(500).json({ error: 'Server misconfigured' });
          }

          const receivedToken = req.headers['x-telegram-bot-api-secret-token'];
          if (receivedToken !== webhookSecret) {
            logger.warn({ receivedToken }, 'Invalid Telegram webhook secret token');
            return res.status(403).json({ error: 'Forbidden' });
          }

          next();
        }, bot.webhookCallback('/api/telegram-webhook'));
      }
    } catch (error) {
      logger.error({ error }, 'Failed to setup Telegram webhook route');
    }
  };
  await setupTelegramWebhookRoute();

  const httpServer = createServer(app);
  return httpServer;
}
