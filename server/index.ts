// Load environment variables from .env file (must be first)
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { validateEnvironmentOrExit } from "./env-validator";

// Validate environment variables before starting the application
validateEnvironmentOrExit();

const app = express();

// Security: HTTP headers protection with helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to prevent blocking static assets
  crossOriginEmbedderPolicy: false, // Allow embedding in iframes
}));

// Security: CORS configuration
const buildAllowedOrigins = () => {
  const origins = ['http://localhost:5000', 'http://localhost:5173'];

  // Add Railway deployment domain (automatically set by Railway)
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    origins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }

  // Add custom origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }

  return origins;
};

const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Security: Limit request body size to prevent memory exhaustion attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error but don't re-throw (prevents server crash)
    log(`Error ${status}: ${message}`);
    if (status === 500) {
      console.error('Server error:', err);
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // FORCE_STATIC=1 can be used to serve production build in development mode
  const forceStatic = process.env.FORCE_STATIC === '1' || process.env.FORCE_STATIC === 'true';
  
  if (app.get("env") === "development" && !forceStatic) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: process.platform === 'linux', // Only supported on Linux
  }, async () => {
    log(`serving on port ${port}`);

    // Start cleanup job for expired confirmations (runs every 5 minutes)
    const cleanupInterval = setInterval(async () => {
      try {
        const deleted = await storage.cleanupExpiredConfirmations();
        if (deleted > 0) {
          log(`Cleaned up ${deleted} expired confirmation(s)`);
        }
      } catch (error) {
        log('Error cleaning up expired confirmations:', String(error));
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Initialize attendee tracking service (starts polling every 10 minutes)
    try {
      const { startAttendeeTracking } = await import('./attendee-tracker');
      startAttendeeTracking();
      log('✓ Attendee tracking service started');
    } catch (error) {
      log('Attendee tracking setup skipped:', String(error));
    }

    // Initialize Telegram bot webhook or polling AFTER server starts
    let telegramBot: any = null;
    try {
      const { setupTelegramWebhook, removeTelegramWebhook, bot } = await import('./telegram-bot');
      telegramBot = bot;
      
      if (bot) {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

        if (isProduction) {
          // Production: use webhook with Railway domain
          const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;

          if (!domain) {
            log('⚠️ No Railway domain found, Telegram webhook not configured');
            log('Set RAILWAY_PUBLIC_DOMAIN environment variable or use Railway auto-generated domain');
          } else {
            const webhookUrl = `https://${domain}/api/telegram-webhook`;
            await setupTelegramWebhook(webhookUrl);
            log(`Telegram webhook configured: ${webhookUrl}`);
          }
        } else {
          // Development: use polling
          log('Starting Telegram bot in development mode...');
          await removeTelegramWebhook();
          log('Webhook removed, launching bot...');
          try {
            // Launch bot with timeout to prevent hanging
            const launchPromise = bot.launch({
              dropPendingUpdates: true, // Skip old updates
            });
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Bot launch timeout')), 10000)
            );
            
            await Promise.race([launchPromise, timeoutPromise]);
            log('✓ Telegram bot running in polling mode (development)');
          } catch (launchError) {
            log('⚠ Telegram bot launch issue:', String(launchError));
            log('Bot may still receive messages via webhook when deployed');
          }
        }
      }
    } catch (error) {
      log('Telegram bot setup skipped:', String(error));
    }

    // Initialize scheduled jobs (proactive briefings and suggestions)
    try {
      const { initializeScheduledJobs, stopScheduledJobs } = await import('./scheduled-jobs');
      const { sendProactiveMessage } = await import('./telegram-bot');

      initializeScheduledJobs(sendProactiveMessage);
      log('✓ Scheduled jobs system initialized (briefings, proactive checks)');

      // Store reference for cleanup
      (globalThis as any).stopScheduledJobs = stopScheduledJobs;
    } catch (error) {
      log('Scheduled jobs setup skipped:', String(error));
    }

    // Initialize Hikma-OS automations
    try {
      const { scheduleDailyDayCreation } = await import('./automations/daily-day-creation');
      const { scheduleWeeklyPlanningReminder } = await import('./automations/weekly-planning-reminder');
      const { scheduleDailyReflectionReminder } = await import('./automations/daily-reflection-reminder');

      scheduleDailyDayCreation();
      scheduleWeeklyPlanningReminder();
      scheduleDailyReflectionReminder();

      log('✓ Hikma-OS automations initialized (day creation, reminders)');
    } catch (error) {
      log('Hikma-OS automations setup skipped:', String(error));
    }
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      log('Shutting down gracefully...');
      clearInterval(cleanupInterval);
      
      // Stop attendee tracking
      try {
        const { stopAttendeeTracking } = await import('./attendee-tracker');
        stopAttendeeTracking();
        log('Attendee tracking stopped');
      } catch (error) {
        log('Error stopping attendee tracking:', String(error));
      }
      
      // Stop scheduled jobs
      try {
        if ((globalThis as any).stopScheduledJobs) {
          (globalThis as any).stopScheduledJobs();
          log('Scheduled jobs stopped');
        }
      } catch (error) {
        log('Error stopping scheduled jobs:', String(error));
      }
      
      if (telegramBot) {
        try {
          await telegramBot.stop();
          log('Telegram bot stopped');
        } catch (error) {
          log('Error stopping Telegram bot:', String(error));
        }
      }
      process.exit(0);
    };
    
    process.once('SIGINT', gracefulShutdown);
    process.once('SIGTERM', gracefulShutdown);
  });
})();
