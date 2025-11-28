
import { storage } from "../server/storage";
import OpenAI from "openai";
import { config } from "dotenv";

// Load environment variables
config();

async function diagnose() {
  console.log("🔍 Starting Venture Chat Diagnosis...");
  console.log("=====================================");

  // 1. Check Environment Variables
  console.log("\n1. Checking Environment Configuration");
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY is missing!");
    console.log("   Please add it to your .env file.");
  } else {
    console.log("✅ OPENROUTER_API_KEY is set");
    console.log(`   Key length: ${apiKey.length} characters`);
    console.log(`   Key prefix: ${apiKey.substring(0, 8)}...`);
  }

  // 2. Check Database Connection & Ventures
  console.log("\n2. Checking Database & Ventures");
  try {
    const ventures = await storage.getVentures();
    console.log(`✅ Database connected. Found ${ventures.length} ventures.`);
    
    if (ventures.length === 0) {
      console.warn("⚠️ No ventures found in database. Create a venture to test chat.");
    } else {
      console.log("   Latest venture:", ventures[0].name, `(ID: ${ventures[0].id})`);
    }
  } catch (error) {
    console.error("❌ Database check failed:", error);
    process.exit(1);
  }

  // 3. Test OpenRouter Connectivity
  if (apiKey) {
    console.log("\n3. Testing OpenRouter Connectivity");
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });

    try {
      console.log("   Sending test request to openai/gpt-4o-mini...");
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hello, are you working?" }],
        max_tokens: 10,
      });

      console.log("✅ OpenRouter API responded successfully!");
      console.log("   Response:", completion.choices[0].message.content);
      console.log("   Model used:", completion.model);
    } catch (error: any) {
      console.error("❌ OpenRouter API test failed!");
      console.error("   Error:", error.message);
      if (error.status) console.error("   Status:", error.status);
      if (error.code) console.error("   Code:", error.code);
      console.log("\n   Possible causes:");
      console.log("   - Invalid API key");
      console.log("   - Out of credits");
      console.log("   - OpenRouter downtime");
    }
  } else {
    console.log("\n3. Skipping OpenRouter Test (No API Key)");
  }

  console.log("\n=====================================");
  console.log("Diagnosis Complete.");
  process.exit(0);
}

diagnose().catch(console.error);
