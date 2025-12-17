import pkg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pkg;

// Password Reset CLI Script
// Usage: npm run reset-password -- <email> <new-password>
// Example: npm run reset-password -- sb@revolvgroup.com MyNewPassword123!

const BCRYPT_ROUNDS = 12;

// Password strength validation (same as server/auth.ts)
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character (!@#$%^&* etc.)" };
  }
  return { valid: true };
}

async function resetPassword() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("\n🔐 SB-OS Password Reset Utility\n");
    console.log("Usage: npm run reset-password -- <email> <new-password>\n");
    console.log("Example:");
    console.log("  npm run reset-password -- sb@revolvgroup.com MyNewPassword123!\n");
    console.log("Password requirements:");
    console.log("  • At least 12 characters");
    console.log("  • At least one uppercase letter (A-Z)");
    console.log("  • At least one lowercase letter (a-z)");
    console.log("  • At least one number (0-9)");
    console.log("  • At least one special character (!@#$%^&* etc.)\n");
    process.exit(1);
  }

  const [email, newPassword] = args;

  // Validate password
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    console.error(`\n❌ Password validation failed: ${validation.error}\n`);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("\n❌ DATABASE_URL environment variable not set");
    console.error("Usage: DATABASE_URL='your-postgres-url' npm run reset-password -- <email> <password>\n");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log("\n🔐 SB-OS Password Reset\n");
    console.log(`📧 Email: ${email}`);

    // Check if user exists
    const userResult = await client.query(
      "SELECT id, email, first_name, last_name FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`\n❌ No user found with email: ${email}\n`);

      // List available users
      const allUsers = await client.query("SELECT email, first_name, last_name FROM users");
      if (allUsers.rows.length > 0) {
        console.log("Available users:");
        allUsers.rows.forEach((u: any) => {
          console.log(`  • ${u.email} (${u.first_name} ${u.last_name})`);
        });
        console.log("");
      }

      await client.end();
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`👤 User: ${user.first_name} ${user.last_name}`);

    // Hash the new password
    console.log("\n⏳ Hashing password...");
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update user password and reset lockout
    console.log("💾 Updating database...");
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    console.log("\n✅ Password reset successful!\n");
    console.log("You can now log in with:");
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${"*".repeat(newPassword.length)}\n`);

    await client.end();
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    await client.end();
    process.exit(1);
  }
}

resetPassword();
