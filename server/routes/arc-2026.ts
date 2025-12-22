/**
 * 2026 Arc Setup Routes
 *
 * API endpoint to set up the complete 2026 Arc structure:
 * - 2026 Arc venture (domain: personal)
 * - 4 domain projects with 12 monthly phases each
 * - 2026 Arc Playbook doc structure
 */

import { Router } from "express";
import { storage } from "../storage";
import { logger } from "../logger";

const router = Router();

// Month names for phases
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Monthly sprint focus suggestions
const MONTHLY_SPRINTS: Record<string, string[]> = {
  "Health & Energy": [
    "January - Foundation (establish baseline routines)",
    "February - Fitness Push (strength training 5x/week)",
    "March - Nutrition Dial-In (hit protein targets daily)",
    "April - Cardio Month (zone 2 training)",
    "May - Recovery Focus (sleep optimization)",
    "June - Summer Cut (body composition)",
    "July - Strength Block (progressive overload)",
    "August - Endurance (maintain consistency)",
    "September - Health Reset (blood work, check-ups)",
    "October - Pre-Winter Prep (vitamin D, immunity)",
    "November - Consolidation (lock in gains)",
    "December - Maintenance & Review"
  ],
  "Wealth & Ventures": [
    "January - Q1 Planning (revenue targets)",
    "February - Execution Sprint (ship features)",
    "March - Q1 Close (revenue push)",
    "April - Q2 Launch (new initiatives)",
    "May - Growth Focus (marketing/sales)",
    "June - Mid-Year Review (adjust strategy)",
    "July - Scale Systems (automation)",
    "August - Summer Build (deep work)",
    "September - Q3 Push (revenue sprint)",
    "October - Q4 Prep (year-end planning)",
    "November - Black Friday/EOY Push",
    "December - Review & 2027 Planning"
  ],
  "Knowledge & Skills": [
    "January - Learning Plan (set curriculum)",
    "February - Course Sprint (complete one course)",
    "March - Reading Month (4 books)",
    "April - Skill Practice (apply learning)",
    "May - Certification Prep",
    "June - Mid-Year Assessment",
    "July - Deep Dive (one topic mastery)",
    "August - Technical Skills (coding/tools)",
    "September - Business Skills (negotiation, sales)",
    "October - Teaching/Writing (share knowledge)",
    "November - Review & Consolidate",
    "December - Plan 2027 Learning"
  ],
  "Systems & Habits": [
    "January - Ritual Establishment (morning/evening)",
    "February - Environment Design (workspace, tools)",
    "March - Automation (systems, templates)",
    "April - Habit Stacking (add new habits)",
    "May - Friction Reduction (remove obstacles)",
    "June - Mid-Year Habit Audit",
    "July - Deep Work Systems (focus protocols)",
    "August - Energy Management (rest, recovery)",
    "September - Productivity Reset",
    "October - Q4 Systems Check",
    "November - Wind-Down Routines (stress management)",
    "December - Annual Review Process"
  ]
};

// Project configurations
const PROJECT_CONFIGS = [
  {
    name: "Health & Energy",
    category: "operations" as const,
    outcome: "Optimal physical and mental performance through consistent health habits",
    notes: "Track: sleep quality, energy levels, workout consistency, nutrition adherence, weight/body composition"
  },
  {
    name: "Wealth & Ventures",
    category: "finance" as const,
    outcome: "Revenue growth across all ventures with sustainable systems",
    notes: "Track: monthly revenue, runway, key metrics per venture, investment returns"
  },
  {
    name: "Knowledge & Skills",
    category: "research_dev" as const,
    outcome: "Continuous learning and skill development for competitive advantage",
    notes: "Track: books read, courses completed, certifications earned, skills practiced"
  },
  {
    name: "Systems & Habits",
    category: "operations" as const,
    outcome: "Bulletproof routines and systems that compound over time",
    notes: "Track: morning ritual streak, evening review streak, deep work hours, habit completion rate"
  }
];

/**
 * POST /api/setup/2026-arc
 * Creates the complete 2026 Arc structure
 */
router.post("/2026-arc", async (req, res) => {
  try {
    logger.info("Starting 2026 Arc setup...");

    // 1. Create the 2026 Arc Venture
    const venture = await storage.createVenture({
      name: "2026 Arc",
      status: "ongoing",
      domain: "personal",
      oneLiner: "Year-long transformation across health, wealth, knowledge, and systems",
      primaryFocus: "Disciplined execution across all life domains for compounding growth",
      color: "#8B5CF6",
      icon: "🎯",
      notes: `# 2026 Arc

## Philosophy
The 2026 Arc is a year-long transformation framework built on parallel execution, not sequential phases.

## Structure
- **Tier 1: Non-Negotiables** - Daily habits that run 365 days
- **Tier 2: Core Execution** - Primary venture/work (5-6 hrs/day)
- **Tier 3: Growth Sprints** - Monthly rotating focus areas

## Domains
1. Health & Energy - Physical foundation
2. Wealth & Ventures - Revenue and business growth
3. Knowledge & Skills - Continuous learning
4. Systems & Habits - Routines and productivity

## Monthly Cadence
- 1st of month: Set monthly sprint goal, review last month
- Weekly: Quick review (30 min Sunday)
- End of month: Full review with metrics

## Identity Goal
Who are you becoming by Dec 31, 2026?
[Define your identity goal here]`
    });

    logger.info({ ventureId: venture.id }, "Created 2026 Arc venture");

    // 2. Create the 4 domain projects with phases
    const createdProjects: { id: string; name: string; phaseCount: number }[] = [];

    for (const config of PROJECT_CONFIGS) {
      const project = await storage.createProject({
        name: config.name,
        ventureId: venture.id,
        status: "in_progress",
        category: config.category,
        priority: "P1",
        startDate: "2026-01-01",
        targetEndDate: "2026-12-31",
        outcome: config.outcome,
        notes: config.notes
      });

      // Create 12 monthly phases
      const monthlyNames = MONTHLY_SPRINTS[config.name];

      for (let i = 0; i < 12; i++) {
        const month = i + 1;
        const monthStr = month.toString().padStart(2, "0");
        const targetDate = `2026-${monthStr}-28`;

        await storage.createPhase({
          name: monthlyNames[i],
          projectId: project.id,
          status: "not_started",
          order: i + 1,
          targetDate,
          notes: `Monthly sprint for ${MONTHS[i]} 2026`
        });
      }

      createdProjects.push({ id: project.id, name: project.name, phaseCount: 12 });
      logger.info({ projectId: project.id, name: config.name }, "Created project with phases");
    }

    // 3. Create the 2026 Arc Playbook doc structure
    const mainFolder = await storage.createDoc({
      title: "2026 Arc",
      type: "page",
      domain: "personal",
      ventureId: venture.id,
      status: "active",
      icon: "🎯",
      isFolder: true,
      order: 0,
      body: "2026 Arc documentation and planning"
    });

    // Playbook doc
    await storage.createDoc({
      title: "2026 Arc Playbook",
      type: "playbook",
      domain: "personal",
      ventureId: venture.id,
      parentId: mainFolder.id,
      status: "active",
      icon: "📘",
      isFolder: false,
      order: 1,
      body: `# 2026 Arc Playbook

## Vision
[Define your 2026 vision here]

## Identity Goal
Who are you becoming by Dec 31, 2026?
> [Your identity statement]

## Annual Targets

### Health & Energy
- [ ] Target weight/body composition
- [ ] Workout consistency %
- [ ] Sleep average hours
- [ ] Energy level average

### Wealth & Ventures
- [ ] Annual revenue target
- [ ] Net worth target
- [ ] Key venture milestones

### Knowledge & Skills
- [ ] Books to read
- [ ] Courses to complete
- [ ] Certifications to earn

### Systems & Habits
- [ ] Morning ritual streak target
- [ ] Deep work hours/week target
- [ ] Habit completion rate target

## Non-Negotiables (Tier 1)
These run every single day, 365 days:

1. **Sleep**: 7+ hours
2. **Movement**: 30 min (walk/workout)
3. **Morning Ritual**: Press-ups, reading, planning
4. **Top 3 Outcomes**: Set every morning
5. **Evening Review**: 10 min reflection
6. **Nutrition**: Log meals, hit protein target

## Weekly Rhythm
- **Monday**: Planning + highest leverage tasks
- **Tuesday-Thursday**: Deep execution
- **Friday**: Ship + tie loose ends
- **Saturday**: Sprint focus (monthly theme)
- **Sunday**: Review, rest, prep

## Monthly Cadence
- **1st of month**: Set monthly sprint goal, review last month
- **Weekly**: Quick review (30 min Sunday)
- **End of month**: Full review with metrics

## Quarterly Check-ins
- Q1 (Apr 1): First quarter assessment
- Q2 (Jul 1): Mid-year review
- Q3 (Oct 1): Q3 assessment, Q4 planning
- Q4 (Jan 1, 2027): Annual review
`
    });

    // Annual Goals doc
    await storage.createDoc({
      title: "Annual Goals & Metrics",
      type: "spec",
      domain: "personal",
      ventureId: venture.id,
      parentId: mainFolder.id,
      status: "active",
      icon: "📊",
      isFolder: false,
      order: 2,
      body: `# 2026 Annual Goals & Metrics

## Health & Energy Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Weight | | | |
| Body Fat % | | | |
| Workout Days/Week | 5 | | |
| Avg Sleep Hours | 7.5 | | |
| Avg Energy (1-5) | 4 | | |

## Wealth & Ventures Metrics

| Venture | Revenue Target | Current | Status |
|---------|---------------|---------|--------|
| [Venture 1] | | | |
| [Venture 2] | | | |
| Total | | | |

## Knowledge & Skills Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Books Read | 24 | 0 | |
| Courses Completed | 4 | 0 | |
| Certifications | 1 | 0 | |

## Systems & Habits Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Morning Ritual Streak | 365 | 0 | |
| Evening Review Streak | 365 | 0 | |
| Deep Work Hrs/Week | 20 | | |
`
    });

    // Monthly Reviews folder
    const monthlyFolder = await storage.createDoc({
      title: "Monthly Reviews",
      type: "page",
      domain: "personal",
      ventureId: venture.id,
      parentId: mainFolder.id,
      status: "active",
      icon: "📅",
      isFolder: true,
      order: 3,
      body: "Monthly review documents"
    });

    // Create January template
    await storage.createDoc({
      title: "January 2026 Review",
      type: "meeting_notes",
      domain: "personal",
      ventureId: venture.id,
      parentId: monthlyFolder.id,
      status: "draft",
      icon: "📝",
      isFolder: false,
      order: 1,
      body: `# January 2026 Review

## Monthly Sprint: [Sprint Name]

### What I Set Out to Do
-

### What I Actually Did
-

### Wins 🎉
1.
2.
3.

### Lessons Learned
1.
2.

### By the Numbers

| Domain | Target | Actual | Notes |
|--------|--------|--------|-------|
| Health | | | |
| Wealth | | | |
| Knowledge | | | |
| Systems | | | |

### Next Month Focus
-

### Gratitude
What am I grateful for this month?
-
`
    });

    // Quarterly Reviews folder
    await storage.createDoc({
      title: "Quarterly Reviews",
      type: "page",
      domain: "personal",
      ventureId: venture.id,
      parentId: mainFolder.id,
      status: "active",
      icon: "📊",
      isFolder: true,
      order: 4,
      body: "Quarterly review documents"
    });

    // Domain Playbooks folder
    const domainFolder = await storage.createDoc({
      title: "Domain Playbooks",
      type: "page",
      domain: "personal",
      ventureId: venture.id,
      parentId: mainFolder.id,
      status: "active",
      icon: "📚",
      isFolder: true,
      order: 5,
      body: "Individual playbooks for each domain"
    });

    // Create domain playbook docs
    for (const config of PROJECT_CONFIGS) {
      await storage.createDoc({
        title: `${config.name} Playbook`,
        type: "playbook",
        domain: "personal",
        ventureId: venture.id,
        parentId: domainFolder.id,
        status: "draft",
        icon: config.name === "Health & Energy" ? "💪" :
              config.name === "Wealth & Ventures" ? "💰" :
              config.name === "Knowledge & Skills" ? "📚" : "⚙️",
        isFolder: false,
        order: PROJECT_CONFIGS.indexOf(config) + 1,
        body: `# ${config.name} Playbook

## Outcome
${config.outcome}

## Key Metrics
${config.notes}

## Strategies
-

## Resources
-

## Weekly Habits
-

## Monthly Rituals
-
`
      });
    }

    logger.info("2026 Arc setup complete!");

    res.json({
      success: true,
      message: "2026 Arc setup complete!",
      data: {
        venture: {
          id: venture.id,
          name: venture.name
        },
        projects: createdProjects,
        docs: {
          mainFolder: mainFolder.id,
          totalDocs: 8 // Main folder + playbook + goals + 2 folders + 4 domain playbooks
        }
      }
    });

  } catch (error) {
    logger.error({ error }, "Error setting up 2026 Arc");
    res.status(500).json({
      success: false,
      error: "Failed to set up 2026 Arc",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/setup/2026-arc/status
 * Check if 2026 Arc has already been set up
 */
router.get("/2026-arc/status", async (req, res) => {
  try {
    const ventures = await storage.getVentures();
    const arc2026 = ventures.find(v => v.name === "2026 Arc");

    if (arc2026) {
      const projects = await storage.getProjects({ ventureId: arc2026.id });

      res.json({
        exists: true,
        venture: {
          id: arc2026.id,
          name: arc2026.name,
          status: arc2026.status
        },
        projectCount: projects.length
      });
    } else {
      res.json({
        exists: false
      });
    }
  } catch (error) {
    logger.error({ error }, "Error checking 2026 Arc status");
    res.status(500).json({
      error: "Failed to check 2026 Arc status"
    });
  }
});

export default router;
