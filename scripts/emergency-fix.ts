import { Pool } from "@neondatabase/serverless";

// Emergency fix: Convert duration columns from TEXT to INTEGER
// Run this with: DATABASE_URL="your-connection-string" tsx scripts/emergency-fix.ts

async function emergencyFix() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable not set");
    console.error("Usage: DATABASE_URL='your-postgres-url' tsx scripts/emergency-fix.ts");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log("🚨 EMERGENCY FIX: Converting duration columns to INTEGER\n");

    // Fix appointments table
    console.log("1️⃣ Fixing appointments.appointment_duration...");
    await pool.query(`
      ALTER TABLE appointments
      ALTER COLUMN appointment_duration
      TYPE integer USING CASE
        WHEN appointment_duration ~ '^[0-9]+$' THEN appointment_duration::integer
        ELSE 60
      END
    `);
    console.log("   ✅ Fixed appointments.appointment_duration\n");

    // Fix assistant_settings table
    console.log("2️⃣ Fixing assistant_settings.default_meeting_duration...");
    await pool.query(`
      ALTER TABLE assistant_settings
      ALTER COLUMN default_meeting_duration
      TYPE integer USING CASE
        WHEN default_meeting_duration ~ '^[0-9]+$' THEN default_meeting_duration::integer
        ELSE 60
      END
    `);
    console.log("   ✅ Fixed assistant_settings.default_meeting_duration\n");

    // Verify
    console.log("3️⃣ Verifying changes...");
    const result = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        column_default
      FROM information_schema.columns
      WHERE table_name IN ('appointments', 'assistant_settings')
      AND column_name IN ('appointment_duration', 'default_meeting_duration')
      ORDER BY table_name, column_name
    `);

    console.table(result.rows);

    console.log("\n✅ SUCCESS! Both columns converted to INTEGER");
    console.log("\n📝 Next step: Run 'npm run db:push' to complete deployment");

    await pool.end();
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);

    if (error.message.includes("cannot be cast")) {
      console.error("\n💡 TIP: Some rows have non-numeric values.");
      console.error("   Run this SQL to check:");
      console.error("   SELECT appointment_duration FROM appointments WHERE appointment_duration !~ '^[0-9]+$';");
      console.error("   SELECT default_meeting_duration FROM assistant_settings WHERE default_meeting_duration !~ '^[0-9]+$';");
    }

    await pool.end();
    process.exit(1);
  }
}

emergencyFix();
