#!/usr/bin/env npx tsx
/**
 * Emergency Admin Reset Script
 *
 * Use this script when you've lost access to your account and have no way to recover:
 * - Lost password
 * - Lost authenticator device
 * - Lost backup codes
 * - Lost recovery key
 *
 * Run from the server with: npm run admin:reset-credentials
 *
 * This will:
 * 1. Reset your password (you'll set a new one on next login)
 * 2. Disable 2FA completely
 * 3. Clear all failed login attempts and lockouts
 * 4. Invalidate all existing sessions
 * 5. Log this action to the audit log
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import * as readline from "readline";

// Load environment
import "dotenv/config";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          SB-OS EMERGENCY CREDENTIAL RESET                  ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log("║  WARNING: This will reset ALL security on your account!   ║");
  console.log("║                                                            ║");
  console.log("║  After running this script:                                ║");
  console.log("║  • Your password will be cleared                           ║");
  console.log("║  • 2FA will be disabled                                    ║");
  console.log("║  • All sessions will be invalidated                        ║");
  console.log("║  • You'll need to set up security again                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Confirm action
  const confirmed = await askConfirmation("Are you sure you want to reset all credentials? (yes/no): ");

  if (confirmed.toLowerCase() !== "yes") {
    console.log("\n❌ Operation cancelled. No changes made.\n");
    process.exit(0);
  }

  // Double confirm
  const doubleConfirm = await askConfirmation("Type 'RESET' to confirm: ");

  if (doubleConfirm !== "RESET") {
    console.log("\n❌ Confirmation failed. No changes made.\n");
    process.exit(0);
  }

  console.log("\n🔄 Connecting to database...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  try {
    const sql_client = neon(process.env.DATABASE_URL);
    const db = drizzle(sql_client);

    // Get current user info
    const userResult = await db.execute(sql`
      SELECT email, totp_enabled, failed_login_attempts, locked_until
      FROM users
      WHERE id = ${DEFAULT_USER_ID}
    `);

    if (userResult.rows.length === 0) {
      console.error("❌ User not found. Database may not be initialized.");
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`\n📧 User: ${user.email || "(no email set)"}`);
    console.log(`🔐 2FA Enabled: ${user.totp_enabled ? "Yes" : "No"}`);
    console.log(`🚫 Failed Attempts: ${user.failed_login_attempts || 0}`);
    console.log(`🔒 Locked: ${user.locked_until ? "Yes" : "No"}`);

    console.log("\n🔄 Resetting credentials...");

    // Reset all security fields
    await db.execute(sql`
      UPDATE users
      SET
        password_hash = NULL,
        totp_secret = NULL,
        totp_enabled = false,
        totp_backup_codes = NULL,
        totp_recovery_key_hash = NULL,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
      WHERE id = ${DEFAULT_USER_ID}
    `);

    console.log("✅ User credentials reset");

    // Clear all sessions
    const sessionResult = await db.execute(sql`
      DELETE FROM sessions
      WHERE (sess->>'userId')::text = ${DEFAULT_USER_ID}
    `);

    console.log(`✅ Sessions cleared (${(sessionResult as any).rowCount || 0} removed)`);

    // Log to audit
    await db.execute(sql`
      INSERT INTO audit_logs (user_id, action, resource, details, ip_address, status, created_at)
      VALUES (
        ${DEFAULT_USER_ID},
        'admin_credential_reset',
        'auth',
        '{"method": "cli_script", "reason": "emergency_recovery"}'::jsonb,
        'localhost',
        'success',
        NOW()
      )
    `);

    console.log("✅ Audit log entry created");

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                    RESET COMPLETE                          ║");
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log("║  Next steps:                                               ║");
    console.log("║  1. Go to your SB-OS instance in a browser                 ║");
    console.log("║  2. You'll be prompted to set up a new password            ║");
    console.log("║  3. After login, set up 2FA again in Settings > Security   ║");
    console.log("║  4. SAVE your recovery key and backup codes securely!      ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

function askConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

main();
