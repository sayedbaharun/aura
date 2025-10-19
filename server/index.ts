import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
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
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Initialize Telegram bot webhook or polling AFTER server starts
    let telegramBot: any = null;
    try {
      const { setupTelegramWebhook, removeTelegramWebhook, bot } = await import('./telegram-bot');
      telegramBot = bot;
      
      if (bot) {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT;
        
        if (isProduction && process.env.REPL_SLUG) {
          // Production: use webhook
          const webhookUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/telegram-webhook`;
          await setupTelegramWebhook(webhookUrl);
          log(`Telegram webhook configured: ${webhookUrl}`);
        } else {
          // Development: use polling
          await removeTelegramWebhook();
          await bot.launch();
          log('Telegram bot running in polling mode (development)');
        }
      }
    } catch (error) {
      log('Telegram bot setup skipped:', String(error));
    }
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      log('Shutting down gracefully...');
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
