import { db } from "../db";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log("🔄 Starting migration: Convert duration columns to integer...\n");

    // Step 1: Check current state
    console.log("1️⃣ Checking current column types...");
    const currentState = await db.execute(sql`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name IN ('appointments', 'assistant_settings')
      AND column_name IN ('appointment_duration', 'default_meeting_duration')
      ORDER BY table_name, column_name
    `);

    console.table(currentState.rows);

    // Step 2: Convert appointments.appointment_duration
    console.log("\n2️⃣ Converting appointments.appointment_duration...");
    const appointmentResult = await db.execute(sql`
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'appointments'
              AND column_name = 'appointment_duration'
              AND data_type = 'text'
          ) THEN
              ALTER TABLE appointments
              ALTER COLUMN appointment_duration
              TYPE integer USING appointment_duration::integer;

              RAISE NOTICE 'Successfully converted appointments.appointment_duration to integer';
          ELSE
              RAISE NOTICE 'appointments.appointment_duration is already integer or does not exist';
          END IF;
      END $$;
    `);
    console.log("✅ Appointments table updated");

    // Step 3: Convert assistant_settings.default_meeting_duration
    console.log("\n3️⃣ Converting assistant_settings.default_meeting_duration...");
    const settingsResult = await db.execute(sql`
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'assistant_settings'
              AND column_name = 'default_meeting_duration'
              AND data_type = 'text'
          ) THEN
              ALTER TABLE assistant_settings
              ALTER COLUMN default_meeting_duration
              TYPE integer USING default_meeting_duration::integer;

              RAISE NOTICE 'Successfully converted assistant_settings.default_meeting_duration to integer';
          ELSE
              RAISE NOTICE 'assistant_settings.default_meeting_duration is already integer or does not exist';
          END IF;
      END $$;
    `);
    console.log("✅ Settings table updated");

    // Step 4: Verify final state
    console.log("\n4️⃣ Verifying migration...");
    const finalState = await db.execute(sql`
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

    console.table(finalState.rows);

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📝 Next step: Run 'npm run db:push' to sync remaining schema changes");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
