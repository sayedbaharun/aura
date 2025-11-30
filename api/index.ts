// Vercel Serverless Function Entry Point
// This wraps the Express app for Vercel deployment

import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

// Create a minimal Express app for Vercel
const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://openrouter.ai", "https://api.telegram.org"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigins: string[] = [];
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
}
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Session (using memory for serverless - sessions will be short-lived)
// For production, consider using a session store that works with serverless
const sessionSecret = process.env.SESSION_SECRET || 'vercel-dev-secret';
app.use(session({
  secret: sessionSecret,
  name: 'sbos.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// CSRF Token
app.use((req, res, next) => {
  const sess = req.session as any;
  if (!sess.csrfToken) {
    sess.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = sess.csrfToken;
  next();
});

// Database connection for serverless
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: 'vercel' });
});

// Note: For full API functionality, you'll need to port the routes from server/routes.ts
// This is a minimal setup - the full app requires significant refactoring for serverless

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Export for Vercel
export default app;
