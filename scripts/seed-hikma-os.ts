import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

/**
 * Seed script for Hikma-OS initial data
 * Run with: tsx scripts/seed-hikma-os.ts
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql, schema });

async function seed() {
  console.log("🌱 Starting Hikma-OS seed...");

  try {
    // 1. Create user (Sayed Baharun)
    console.log("Creating user...");
    const [user] = await db
      .insert(schema.users)
      .values({
        email: "sayed@hikmadigital.com",
        firstName: "Sayed",
        lastName: "Baharun",
        timezone: "Asia/Dubai",
      })
      .returning();

    console.log(`✅ User created: ${user.email}`);

    // 2. Create Ventures
    console.log("\nCreating ventures...");

    const ventureData = [
      {
        name: "MyDub.ai",
        domain: "media" as const,
        status: "active" as const,
        oneLiner: "AI-powered Dubai lifestyle media platform",
        primaryFocus: "Automated news and content engine for Dubai",
        color: "#3B82F6", // Blue
        icon: "🌆",
        notes: "Focus on automated content generation and SEO optimization",
      },
      {
        name: "Aivant Realty",
        domain: "realty" as const,
        status: "active" as const,
        oneLiner: "AI-enhanced real estate brokerage in Dubai",
        primaryFocus: "Lead generation and property matching automation",
        color: "#10B981", // Green
        icon: "🏢",
        notes: "Focus on high-value transactions and client relationships",
      },
      {
        name: "GetMeToDub.ai",
        domain: "saas" as const,
        status: "development" as const,
        oneLiner: "AI relocation assistant for Dubai moves",
        primaryFocus: "End-to-end relocation automation",
        color: "#F59E0B", // Amber
        icon: "✈️",
        notes: "MVP in development, focus on visa and housing automation",
      },
      {
        name: "Hikma Digital",
        domain: "saas" as const,
        status: "active" as const,
        oneLiner: "AI-powered productivity and business tools",
        primaryFocus: "Hikma-OS and internal automation tools",
        color: "#8B5CF6", // Purple
        icon: "⚡",
        notes: "Internal tools and consulting services",
      },
      {
        name: "Arab Money Official",
        domain: "media" as const,
        status: "active" as const,
        oneLiner: "Finance and wealth content for MENA region",
        primaryFocus: "Content strategy and audience growth",
        color: "#EF4444", // Red
        icon: "💰",
        notes: "Focus on social media presence and partnerships",
      },
      {
        name: "Trading",
        domain: "trading" as const,
        status: "active" as const,
        oneLiner: "Personal trading and investment portfolio",
        primaryFocus: "Systematic trading strategies",
        color: "#06B6D4", // Cyan
        icon: "📈",
        notes: "Focus on risk management and consistent returns",
      },
    ];

    const ventures = await db
      .insert(schema.ventures)
      .values(ventureData)
      .returning();

    console.log(`✅ Created ${ventures.length} ventures`);

    // 3. Create sample projects
    console.log("\nCreating sample projects...");

    const mydubVenture = ventures.find((v) => v.name === "MyDub.ai");
    const hikmaVenture = ventures.find((v) => v.name === "Hikma Digital");

    const projectData = [
      {
        name: "MyDub.ai v2.0 Launch",
        ventureId: mydubVenture?.id,
        status: "in_progress" as const,
        category: "product" as const,
        priority: "P0" as const,
        startDate: "2025-11-01",
        targetEndDate: "2025-12-15",
        outcome: "Launch v2 with 10k MAU",
        notes: "Focus on UI/UX refresh and GPT-4 integration",
      },
      {
        name: "Hikma-OS MVP Development",
        ventureId: hikmaVenture?.id,
        status: "in_progress" as const,
        category: "product" as const,
        priority: "P0" as const,
        startDate: "2025-11-23",
        targetEndDate: "2025-12-31",
        outcome: "Functional MVP with all core features",
        notes: "Phase 1: Command Center, Tasks, Health tracking",
      },
      {
        name: "MyDub SEO Optimization",
        ventureId: mydubVenture?.id,
        status: "planning" as const,
        category: "marketing" as const,
        priority: "P1" as const,
        outcome: "Improve organic traffic by 50%",
        notes: "Technical SEO audit and content optimization",
      },
    ];

    const projects = await db
      .insert(schema.projects)
      .values(projectData)
      .returning();

    console.log(`✅ Created ${projects.length} projects`);

    // 4. Create sample tasks
    console.log("\nCreating sample tasks...");

    const hikmaProject = projects.find((p) =>
      p.name.includes("Hikma-OS MVP")
    );

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const taskData = [
      {
        title: "Design Command Center UI mockups",
        status: "done" as const,
        priority: "P0" as const,
        type: "deep_work" as const,
        domain: "work" as const,
        ventureId: hikmaVenture?.id,
        projectId: hikmaProject?.id,
        focusDate: today,
        focusSlot: "morning" as const,
        estEffort: 3.0,
        actualEffort: 2.5,
        notes: "Created mockups in Figma",
        completedAt: new Date(),
      },
      {
        title: "Implement database schema for Hikma-OS",
        status: "in_progress" as const,
        priority: "P0" as const,
        type: "deep_work" as const,
        domain: "work" as const,
        ventureId: hikmaVenture?.id,
        projectId: hikmaProject?.id,
        focusDate: today,
        focusSlot: "midday" as const,
        estEffort: 4.0,
        notes: "Using Drizzle ORM with PostgreSQL",
      },
      {
        title: "Build Command Center React components",
        status: "next" as const,
        priority: "P0" as const,
        type: "deep_work" as const,
        domain: "work" as const,
        ventureId: hikmaVenture?.id,
        projectId: hikmaProject?.id,
        focusDate: tomorrow,
        focusSlot: "morning" as const,
        estEffort: 5.0,
        notes: "Use shadcn/ui components",
      },
      {
        title: "Write MyDub content calendar for December",
        status: "next" as const,
        priority: "P1" as const,
        type: "business" as const,
        domain: "work" as const,
        ventureId: mydubVenture?.id,
        dueDate: tomorrow,
        estEffort: 2.0,
        notes: "Plan 30 days of content",
      },
      {
        title: "Morning workout - Upper body strength",
        status: "next" as const,
        priority: "P1" as const,
        type: "health" as const,
        domain: "health" as const,
        focusDate: tomorrow,
        focusSlot: "morning" as const,
        estEffort: 1.0,
        notes: "Chest, shoulders, triceps routine",
      },
    ];

    const tasks = await db.insert(schema.tasks).values(taskData).returning();

    console.log(`✅ Created ${tasks.length} tasks`);

    // 5. Create sample capture items
    console.log("\nCreating sample capture items...");

    const captureData = [
      {
        title: "Idea: Launch MyDub podcast series",
        type: "idea" as const,
        source: "brain" as const,
        domain: "work" as const,
        ventureId: mydubVenture?.id,
        clarified: false,
        notes: "Could tie into new content strategy, interview Dubai founders",
      },
      {
        title: "Research: Best CRM for real estate in Dubai",
        type: "task" as const,
        source: "email" as const,
        domain: "work" as const,
        ventureId: ventures.find((v) => v.name === "Aivant Realty")?.id,
        clarified: false,
        notes: "Need to evaluate Pipedrive, HubSpot, and custom solutions",
      },
    ];

    const captures = await db
      .insert(schema.captureItems)
      .values(captureData)
      .returning();

    console.log(`✅ Created ${captures.length} capture items`);

    // 6. Create today's Day record
    console.log("\nCreating today's day record...");

    const dayId = `day_${today}`;
    const [day] = await db
      .insert(schema.days)
      .values({
        id: dayId,
        date: today,
        title: `${today} - Hikma-OS Foundation Day`,
        top3Outcomes: `1. Transform Aura database to Hikma-OS schema\n2. Create comprehensive seed data\n3. Document migration process`,
        oneThingToShip: "Complete Hikma-OS database transformation",
        reflectionAm: "Focused on building the foundation for the new system",
        mood: "high" as const,
        primaryVentureFocus: hikmaVenture?.id,
      })
      .returning();

    console.log(`✅ Created day record: ${day.id}`);

    // 7. Create sample health entry
    console.log("\nCreating sample health entry...");

    const [healthEntry] = await db
      .insert(schema.healthEntries)
      .values({
        dayId: day.id,
        date: today,
        sleepHours: 7.5,
        sleepQuality: "good" as const,
        energyLevel: 4,
        mood: "high" as const,
        steps: 8500,
        workoutDone: true,
        workoutType: "strength" as const,
        workoutDurationMin: 45,
        stressLevel: "low" as const,
        tags: ["focused", "productive"],
        notes: "Morning workout set a good tone for the day",
      })
      .returning();

    console.log(`✅ Created health entry for ${healthEntry.date}`);

    // 8. Create sample nutrition entries
    console.log("\nCreating sample nutrition entries...");

    const nutritionData = [
      {
        dayId: day.id,
        datetime: new Date(`${today}T08:30:00`),
        mealType: "breakfast" as const,
        description: "Eggs, avocado toast, Greek yogurt",
        calories: 450,
        proteinG: 28,
        carbsG: 35,
        fatsG: 22,
        context: "Home-cooked breakfast",
        tags: ["clean", "high_protein"],
        notes: "Meal prep from Sunday",
      },
      {
        dayId: day.id,
        datetime: new Date(`${today}T13:00:00`),
        mealType: "lunch" as const,
        description: "Grilled chicken, quinoa, mixed vegetables",
        calories: 550,
        proteinG: 45,
        carbsG: 48,
        fatsG: 18,
        context: "Meal delivered",
        tags: ["clean", "balanced"],
      },
    ];

    const nutritionEntries = await db
      .insert(schema.nutritionEntries)
      .values(nutritionData)
      .returning();

    console.log(`✅ Created ${nutritionEntries.length} nutrition entries`);

    // 9. Create sample doc/SOP
    console.log("\nCreating sample doc/SOP...");

    const [doc] = await db
      .insert(schema.docs)
      .values({
        title: "MyDub.ai Content Publishing SOP",
        type: "sop" as const,
        domain: "venture_ops" as const,
        ventureId: mydubVenture?.id,
        status: "active" as const,
        body: `# MyDub.ai Content Publishing SOP

## Workflow

1. **Content Creation**
   - Use GPT-4 for article generation
   - Review for accuracy and tone
   - Add relevant images from Unsplash

2. **SEO Optimization**
   - Add meta title and description
   - Optimize headings (H1, H2, H3)
   - Add internal links

3. **Publishing**
   - Schedule via CMS
   - Share on social media
   - Monitor analytics

## Quality Checklist

- [ ] Fact-checked against primary sources
- [ ] SEO score > 80
- [ ] Mobile-friendly formatting
- [ ] Images optimized
- [ ] Links tested`,
        tags: ["content", "automation", "seo"],
      })
      .returning();

    console.log(`✅ Created doc: ${doc.title}`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 HIKMA-OS SEED COMPLETE!");
    console.log("=".repeat(60));
    console.log(`
📊 Summary:
   - Users: 1 (Sayed Baharun)
   - Ventures: ${ventures.length}
   - Projects: ${projects.length}
   - Tasks: ${tasks.length}
   - Capture Items: ${captures.length}
   - Days: 1 (today)
   - Health Entries: 1
   - Nutrition Entries: ${nutritionEntries.length}
   - Docs/SOPs: 1

✅ Database is ready for Hikma-OS!
`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

// Run seed
seed()
  .then(() => {
    console.log("✅ Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
