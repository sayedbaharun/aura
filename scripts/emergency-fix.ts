import { neon } from "@neondatabase/serverless";

// Emergency fix: Convert duration columns from TEXT to INTEGER
// This runs automatically during deployment to fix production database

async function emergencyFix() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable not set");
    console.error("Usage: DATABASE_URL='your-postgres-url' tsx scripts/emergency-fix.ts");
    process.exit(1);
  }

  const sql = neon(connectionString);

  try {
    console.log("🚨 EMERGENCY FIX: Converting duration columns to INTEGER\n");

    // Check if columns need fixing
    console.log("0️⃣ Checking current column types...");
    const checkResult = await sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('appointments', 'assistant_settings')
      AND column_name IN ('appointment_duration', 'default_meeting_duration')
      ORDER BY table_name, column_name
    `;
    
    const needsFix = checkResult.some((row: any) => row.data_type === 'text');
    
    if (!needsFix) {
      console.log("✅ Columns are already INTEGER type - no fix needed!");
      process.exit(0);
    }

    // Fix appointments table
    console.log("\n1️⃣ Fixing appointments.appointment_duration...");
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'appointments'
          AND column_name = 'appointment_duration'
          AND data_type = 'text'
        ) THEN
          ALTER TABLE appointments
          ALTER COLUMN appointment_duration
          TYPE integer USING CASE
            WHEN appointment_duration ~ '^[0-9]+$' THEN appointment_duration::integer
            ELSE 60
          END;
          
          ALTER TABLE appointments
          ALTER COLUMN appointment_duration SET DEFAULT 60;
        END IF;
      END $$;
    `;
    console.log("   ✅ Fixed appointments.appointment_duration");

    // Fix assistant_settings table
    console.log("\n2️⃣ Fixing assistant_settings.default_meeting_duration...");
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'assistant_settings'
          AND column_name = 'default_meeting_duration'
          AND data_type = 'text'
        ) THEN
          ALTER TABLE assistant_settings
          ALTER COLUMN default_meeting_duration
          TYPE integer USING CASE
            WHEN default_meeting_duration ~ '^[0-9]+$' THEN default_meeting_duration::integer
            ELSE 60
          END;
          
          ALTER TABLE assistant_settings
          ALTER COLUMN default_meeting_duration SET DEFAULT 60;
        END IF;
      END $$;
    `;
    console.log("   ✅ Fixed assistant_settings.default_meeting_duration");

    // Verify
    console.log("\n3️⃣ Verifying changes...");
    const result = await sql`
      SELECT
        table_name,
        column_name,
        data_type,
        column_default
      FROM information_schema.columns
      WHERE table_name IN ('appointments', 'assistant_settings')
      AND column_name IN ('appointment_duration', 'default_meeting_duration')
      ORDER BY table_name, column_name
    `;

    console.table(result);

    console.log("\n✅ SUCCESS! Both columns converted to INTEGER");
    console.log("📝 Deployment can now continue...");

    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);

    if (error.message?.includes("cannot be cast")) {
      console.error("\n💡 TIP: Some rows have non-numeric values.");
      console.error("   Check your data manually in the database pane.");
    }

    process.exit(1);
  }
}

emergencyFix();
