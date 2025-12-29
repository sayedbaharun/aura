/**
 * Authentication Routes
 * Handles login, logout, setup, password change, CSRF token, and 2FA
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
  invalidateOtherSessions,
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  verifyTwoFactorLogin,
  completeTwoFactorLogin,
  disableTwoFactor,
  regenerateBackupCodes,
  getTwoFactorStatus,
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

    // If 2FA is required, return early with pending state
    if (result.requiresTwoFactor && result.userId) {
      // Store userId temporarily in session for 2FA verification
      const session = req.session as any;
      session.pendingTwoFactorUserId = result.userId;
      session.pendingTwoFactorExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

      res.json({
        success: false,
        requiresTwoFactor: true,
        message: 'Two-factor authentication required',
        isNewDevice: result.isNewDevice,
        isNewIp: result.isNewIp,
      });
      return;
    }

    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    // Set session
    const session = req.session as any;
    session.userId = result.userId;

    // Single active session enforcement: invalidate all other sessions
    await invalidateOtherSessions(result.userId!, session.id);

    res.json({
      success: true,
      message: 'Login successful',
      isNewDevice: result.isNewDevice,
      isNewIp: result.isNewIp,
      passwordAgeWarning: result.passwordAgeWarning,
      daysSincePasswordChange: result.daysSincePasswordChange,
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify 2FA code during login
router.post('/verify-2fa', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const session = req.session as any;

    if (!token) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    // Check for pending 2FA
    if (!session.pendingTwoFactorUserId) {
      res.status(400).json({ error: 'No pending two-factor authentication. Please login again.' });
      return;
    }

    // Check expiry
    if (session.pendingTwoFactorExpiry && Date.now() > session.pendingTwoFactorExpiry) {
      delete session.pendingTwoFactorUserId;
      delete session.pendingTwoFactorExpiry;
      res.status(400).json({ error: 'Two-factor authentication expired. Please login again.' });
      return;
    }

    const userId = session.pendingTwoFactorUserId;

    // Verify the 2FA token
    const verifyResult = await verifyTwoFactorLogin(userId, token, req);

    if (!verifyResult.success) {
      res.status(401).json({ error: verifyResult.error });
      return;
    }

    // Complete the login
    const loginResult = await completeTwoFactorLogin(userId, req);

    // Clear pending state and set authenticated session
    delete session.pendingTwoFactorUserId;
    delete session.pendingTwoFactorExpiry;
    session.userId = userId;

    // Single active session enforcement
    await invalidateOtherSessions(userId, session.id);

    res.json({
      success: true,
      message: 'Login successful',
      usedBackupCode: verifyResult.usedBackupCode,
      isNewDevice: loginResult.isNewDevice,
      passwordAgeWarning: loginResult.passwordAgeWarning,
      daysSincePasswordChange: loginResult.daysSincePasswordChange,
    });
  } catch (error) {
    logger.error({ error }, '2FA verification error');
    res.status(500).json({ error: 'Two-factor verification failed' });
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

// ============================================================================
// TWO-FACTOR AUTHENTICATION ROUTES
// ============================================================================

// Get 2FA status
router.get('/2fa/status', requireAuth, async (req: any, res: Response) => {
  try {
    const status = await getTwoFactorStatus(req.userId);
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Error getting 2FA status');
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

// Initiate 2FA setup - returns QR code and backup codes
router.post('/2fa/setup', requireAuth, async (req: any, res: Response) => {
  try {
    const result = await setupTwoFactor(req.userId, req);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code to enable 2FA.',
    });
  } catch (error) {
    logger.error({ error }, 'Error setting up 2FA');
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify and enable 2FA
router.post('/2fa/enable', requireAuth, async (req: any, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    const result = await verifyAndEnableTwoFactor(req.userId, token, req);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully. Keep your backup codes safe!',
    });
  } catch (error) {
    logger.error({ error }, 'Error enabling 2FA');
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// Disable 2FA
router.post('/2fa/disable', requireAuth, async (req: any, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required to disable 2FA' });
      return;
    }

    const result = await disableTwoFactor(req.userId, password, req);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      message: 'Two-factor authentication disabled.',
    });
  } catch (error) {
    logger.error({ error }, 'Error disabling 2FA');
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Regenerate backup codes
router.post('/2fa/regenerate-backup-codes', requireAuth, async (req: any, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required to regenerate backup codes' });
      return;
    }

    const result = await regenerateBackupCodes(req.userId, password, req);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      backupCodes: result.backupCodes,
      message: 'New backup codes generated. Your old codes are now invalid.',
    });
  } catch (error) {
    logger.error({ error }, 'Error regenerating backup codes');
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

// Get security audit log (recent security events)
router.get('/security-log', requireAuth, async (req: any, res: Response) => {
  try {
    const logs = await storage.getRecentAuditLogs(req.userId, 50);
    res.json({ logs });
  } catch (error) {
    logger.error({ error }, 'Error fetching security log');
    res.status(500).json({ error: 'Failed to fetch security log' });
  }
});

export default router;
