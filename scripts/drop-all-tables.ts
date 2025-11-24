import pkg from "pg";
const { Client } = pkg;

async function dropAllTables() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  try {
    console.log("🗑️  Dropping all tables...\n");

    const tables = [
      'nutrition_entries', 'health_entries', 'tasks', 'capture_items',
      'projects', 'ventures', 'docs', 'days', 'users', 'sessions',
      'appointments', 'whatsapp_messages', 'assistant_settings'
    ];

    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`   ✅ Dropped ${table}`);
      } catch (error) {
        console.log(`   ⚠️  ${table} doesn't exist`);
      }
    }

    const enums = [
      'venture_status', 'venture_domain', 'project_status', 'project_category',
      'priority', 'task_status', 'task_type', 'domain', 'focus_slot',
      'capture_type', 'capture_source', 'mood', 'sleep_quality', 'workout_type',
      'stress_level', 'meal_type', 'doc_type', 'doc_domain', 'doc_status'
    ];

    console.log("\n🗑️  Dropping all enums...\n");
    for (const enumName of enums) {
      try {
        await client.query(`DROP TYPE IF EXISTS "${enumName}" CASCADE`);
        console.log(`   ✅ Dropped enum ${enumName}`);
      } catch (error) {
        console.log(`   ⚠️  Enum ${enumName} doesn't exist`);
      }
    }

    console.log("\n✅ All tables and enums dropped!");
    console.log("📝 Now run: npm run db:push");

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    await client.end();
    process.exit(1);
  }
}

dropAllTables();
