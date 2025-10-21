import { neon } from "@neondatabase/serverless";
import * as readline from "readline";

// Standalone script to fix production database
// Usage: tsx fix-production-db.ts

async function fixProductionDatabase() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("🔧 PRODUCTION DATABASE FIX TOOL\n");
  console.log("This will convert duration columns from TEXT to INTEGER in your production database.\n");
  
  // Get the production DATABASE_URL
  const prodUrl = await new Promise<string>((resolve) => {
    rl.question("Enter your PRODUCTION DATABASE_URL (from Secrets): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!prodUrl) {
    console.error("❌ No DATABASE_URL provided");
    process.exit(1);
  }

  const sql = neon(prodUrl);

  try {
    console.log("\n🔍 Checking current column types...\n");
    
    const checkResult = await sql`
      SELECT table_name, column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name IN ('appointments', 'assistant_settings')
      AND column_name IN ('appointment_duration', 'default_meeting_duration')
      ORDER BY table_name, column_name
    `;
    
    console.table(checkResult);
    
    const needsFix = checkResult.some((row: any) => row.data_type === 'text');
    
    if (!needsFix) {
      console.log("\n✅ Columns are already INTEGER - no fix needed!");
      process.exit(0);
    }

    console.log("\n🔨 Starting fix...\n");

    // Fix appointments table
    console.log("1️⃣ Dropping default on appointments.appointment_duration...");
    await sql`ALTER TABLE appointments ALTER COLUMN appointment_duration DROP DEFAULT`;
    console.log("   ✅ Default dropped");

    console.log("\n2️⃣ Converting appointments.appointment_duration to INTEGER...");
    await sql`
      ALTER TABLE appointments
      ALTER COLUMN appointment_duration
      TYPE integer USING CASE
        WHEN appointment_duration ~ '^[0-9]+$' THEN appointment_duration::integer
        ELSE 60
      END
    `;
    console.log("   ✅ Converted to INTEGER");

    console.log("\n3️⃣ Setting new default on appointments.appointment_duration...");
    await sql`ALTER TABLE appointments ALTER COLUMN appointment_duration SET DEFAULT 60`;
    console.log("   ✅ Default set to 60");

    // Fix assistant_settings table
    console.log("\n4️⃣ Dropping default on assistant_settings.default_meeting_duration...");
    await sql`ALTER TABLE assistant_settings ALTER COLUMN default_meeting_duration DROP DEFAULT`;
    console.log("   ✅ Default dropped");

    console.log("\n5️⃣ Converting assistant_settings.default_meeting_duration to INTEGER...");
    await sql`
      ALTER TABLE assistant_settings
      ALTER COLUMN default_meeting_duration
      TYPE integer USING CASE
        WHEN default_meeting_duration ~ '^[0-9]+$' THEN default_meeting_duration::integer
        ELSE 60
      END
    `;
    console.log("   ✅ Converted to INTEGER");

    console.log("\n6️⃣ Setting new default on assistant_settings.default_meeting_duration...");
    await sql`ALTER TABLE assistant_settings ALTER COLUMN default_meeting_duration SET DEFAULT 60`;
    console.log("   ✅ Default set to 60");

    // Verify
    console.log("\n🔍 Verifying changes...\n");
    const result = await sql`
      SELECT table_name, column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name IN ('appointments', 'assistant_settings')
      AND column_name IN ('appointment_duration', 'default_meeting_duration')
      ORDER BY table_name, column_name
    `;

    console.table(result);

    const allFixed = result.every((row: any) => row.data_type === 'integer');
    
    if (allFixed) {
      console.log("\n✅ SUCCESS! Production database fixed!");
      console.log("\n📝 Next step: Deploy your app - it will now work!");
    } else {
      console.log("\n⚠️ WARNING: Some columns are still TEXT");
      console.log("Please check the output above and try again");
      process.exit(1);
    }

    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

fixProductionDatabase();
