/**
 * Authentication Routes
 * Handles login, logout, setup, password change, and CSRF token
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import {
  requireAuth,
  authenticateUser,
  setUserPassword,
  logoutUser,
  isAuthRequired,
  isPasswordConfigured,
  createAuditLog,
} from "../auth";
import { DEFAULT_USER_ID } from "./constants";

const router = Router();

// Check if authentication is required and if password is configured
router.get('/status', async (req: Request, res: Response) => {
  try {
    const authRequired = isAuthRequired();
    const passwordConfigured = await isPasswordConfigured();
    const session = req.session as any;

    res.json({
      authRequired,
      passwordConfigured,
      isAuthenticated: !!session?.userId,
      setupRequired: authRequired && !passwordConfigured,
    });
  } catch (error) {
    logger.error({ error }, 'Error checking auth status');
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

// Get current authenticated user
router.get('/user', async (req: Request, res: Response) => {
  const session = req.session as any;

  // If auth not required, return mock user for backward compatibility
  if (!isAuthRequired()) {
    res.json({
      id: DEFAULT_USER_ID,
      email: 'user@sb-os.local',
      firstName: '',
      lastName: '',
      isAuthenticated: true,
    });
    return;
  }

  // Check if user is logged in
  if (!session?.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const user = await storage.getUser(session.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Don't send password hash to client
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      timezone: user.timezone,
      isAuthenticated: true,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching user');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await authenticateUser(email, password, req);

    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    // Set session
    const session = req.session as any;
    session.userId = result.userId;

    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    await logoutUser(req);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error({ error }, 'Logout error');
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Initial setup - create password for the default user
router.post('/setup', async (req: Request, res: Response) => {
  try {
    // Check if already configured
    const configured = await isPasswordConfigured();
    if (configured) {
      res.status(400).json({ error: 'Password already configured. Use change-password instead.' });
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Ensure default user exists with the provided email
    await storage.upsertUser({
      id: DEFAULT_USER_ID,
      email,
    });

    // Set password
    const result = await setUserPassword(DEFAULT_USER_ID, password, req);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Log them in
    const session = req.session as any;
    session.userId = DEFAULT_USER_ID;

    await createAuditLog(DEFAULT_USER_ID, 'account_setup', req, { email }, 'auth');

    res.json({ success: true, message: 'Account setup complete' });
  } catch (error) {
    logger.error({ error }, 'Setup error');
    res.status(500).json({ error: 'Setup failed' });
  }
});

// Change password (requires authentication)
router.post('/change-password', requireAuth, async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    // Verify current password
    const user = await storage.getUser(req.userId);
    if (!user?.email) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    const authResult = await authenticateUser(user.email, currentPassword, req);
    if (!authResult.success) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Set new password
    const result = await setUserPassword(req.userId, newPassword, req);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error({ error }, 'Password change error');
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Get CSRF token
router.get('/csrf-token', (req: Request, res: Response) => {
  const session = req.session as any;
  res.json({ csrfToken: session.csrfToken });
});

export default router;
