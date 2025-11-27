/**
 * Authentication & Security Middleware
 *
 * This module provides:
 * - Password hashing with bcrypt
 * - Session-based authentication
 * - Route protection middleware
 * - Audit logging for security events
 * - Account lockout after failed attempts
 */

import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, auditLogs, sessions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

// Constants
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      isAuthenticated?: boolean;
    }
  }
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  req: Request,
  details?: Record<string, unknown>,
  resource?: string,
  resourceId?: string,
  status: "success" | "failure" | "blocked" = "success"
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      resource,
      resourceId,
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || null,
      details,
      status,
    });
  } catch (error) {
    logger.error({ error }, "Failed to create audit log");
  }
}

/**
 * Check if user account is locked
 */
async function isAccountLocked(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ lockedUntil: users.lockedUntil })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
}

/**
 * Update failed login attempts
 */
async function updateFailedAttempts(userId: string, increment: boolean): Promise<void> {
  if (increment) {
    const [user] = await db
      .select({ failedLoginAttempts: users.failedLoginAttempts })
      .from(users)
      .where(eq(users.id, userId));

    const attempts = (user?.failedLoginAttempts || 0) + 1;
    const updates: Record<string, unknown> = { failedLoginAttempts: attempts };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
  } else {
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, userId));
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string,
  req: Request
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      await createAuditLog(null, "login_attempt", req, { email, reason: "user_not_found" }, "auth", undefined, "failure");
      return { success: false, error: "Invalid credentials" };
    }

    // Check if account is locked
    if (await isAccountLocked(user.id)) {
      await createAuditLog(user.id, "login_blocked", req, { reason: "account_locked" }, "auth", undefined, "blocked");
      return { success: false, error: "Account temporarily locked. Please try again later." };
    }

    // Check if password is set
    if (!user.passwordHash) {
      // First-time setup: password not yet configured
      await createAuditLog(user.id, "login_attempt", req, { reason: "no_password_set" }, "auth", undefined, "failure");
      return { success: false, error: "Password not configured. Please set up your account." };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      await updateFailedAttempts(user.id, true);
      await createAuditLog(user.id, "login_failed", req, { reason: "invalid_password" }, "auth", undefined, "failure");
      return { success: false, error: "Invalid credentials" };
    }

    // Success - reset failed attempts and update last login
    await updateFailedAttempts(user.id, false);
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    await createAuditLog(user.id, "login_success", req, {}, "auth");

    return { success: true, userId: user.id };
  } catch (error) {
    logger.error({ error }, "Authentication error");
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Set or update user password
 */
export async function setUserPassword(
  userId: string,
  newPassword: string,
  req: Request
): Promise<{ success: boolean; error?: string }> {
  try {
    // Password strength validation
    if (newPassword.length < 12) {
      return { success: false, error: "Password must be at least 12 characters" };
    }

    if (!/[A-Z]/.test(newPassword)) {
      return { success: false, error: "Password must contain at least one uppercase letter" };
    }

    if (!/[a-z]/.test(newPassword)) {
      return { success: false, error: "Password must contain at least one lowercase letter" };
    }

    if (!/[0-9]/.test(newPassword)) {
      return { success: false, error: "Password must contain at least one number" };
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return { success: false, error: "Password must contain at least one special character" };
    }

    const hash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await createAuditLog(userId, "password_change", req, {}, "auth");

    return { success: true };
  } catch (error) {
    logger.error({ error }, "Error setting password");
    return { success: false, error: "Failed to update password" };
  }
}

/**
 * Check if authentication is required based on environment
 */
export function isAuthRequired(): boolean {
  // Auth is required in production or when explicitly enabled
  return process.env.NODE_ENV === "production" ||
         process.env.REQUIRE_AUTH === "true";
}

/**
 * Check if password has been set for the default user
 */
export async function isPasswordConfigured(): Promise<boolean> {
  try {
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, DEFAULT_USER_ID));

    return !!user?.passwordHash;
  } catch {
    return false;
  }
}

/**
 * Authentication middleware - protects routes that require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Skip auth check if not required
  if (!isAuthRequired()) {
    req.userId = DEFAULT_USER_ID;
    req.isAuthenticated = true;
    return next();
  }

  // Check session
  const session = req.session as any;

  if (!session?.userId) {
    res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return;
  }

  req.userId = session.userId;
  req.isAuthenticated = true;
  next();
}

/**
 * Middleware to check if this is the initial setup (no password configured)
 */
export async function checkInitialSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isAuthRequired()) {
    return next();
  }

  const configured = await isPasswordConfigured();

  if (!configured && !req.path.includes("/auth/setup")) {
    // Allow setup endpoints even without auth
    if (req.path.includes("/auth/")) {
      return next();
    }
    res.status(403).json({
      error: "Initial setup required",
      code: "SETUP_REQUIRED",
      message: "Please configure your password to secure your account"
    });
    return;
  }

  next();
}

/**
 * Log out user and destroy session
 */
export async function logoutUser(req: Request): Promise<void> {
  const session = req.session as any;
  const userId = session?.userId;

  if (userId) {
    await createAuditLog(userId, "logout", req, {}, "auth");
  }

  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ error: err }, "Error destroying session");
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
