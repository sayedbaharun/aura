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
    "January - Learning Systems Setup (daily habits for all 3 tracks)",
    "February - Q1 Consistency (establish Arabic/Trading/AI daily rhythm)",
    "March - First Milestone Check (assess progress, adjust approach)",
    "April - Q2 Acceleration (increase intensity on weakest track)",
    "May - Immersion Month (consume content in Arabic, trade live, ship AI)",
    "June - Mid-Year Assessment (measure all 3 tracks, recalibrate)",
    "July - Skill Stacking (combine learnings - AI for trading, Arabic media)",
    "August - Deep Practice (deliberate practice, push comfort zones)",
    "September - Q3 Push (prepare for year-end milestones)",
    "October - Application Focus (use skills in real ventures/life)",
    "November - Consolidation (lock in gains, fill knowledge gaps)",
    "December - Annual Review (certify progress, plan 2027 curriculum)"
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
    outcome: "Optimal physical and mental performance through consistent health habits",
    notes: "Track: sleep quality, energy levels, workout consistency, nutrition adherence, weight/body composition"
  },
  {
    name: "Wealth & Ventures",
    outcome: "Revenue growth across all ventures with sustainable systems",
    notes: "Track: monthly revenue, runway, key metrics per venture, investment returns"
  },
  {
    name: "Knowledge & Skills",
    outcome: "Master Arabic, elevate trading skills, and stay ahead on AI developments",
    notes: "Track 3 pillars:\n• ARABIC: lessons/week, vocabulary learned, conversation hours, media consumed\n• TRADING: courses completed, strategies backtested, journal entries, win rate improvement\n• AI: papers read, tools mastered, projects built, newsletters/podcasts consumed"
  },
  {
    name: "Systems & Habits",
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

### Knowledge & Skills (3 Parallel Tracks - Daily)
**Arabic**: [ ] fluency level target, [ ] conversation hours/week
**Trading**: [ ] win rate target, [ ] strategies mastered
**AI**: [ ] tools mastered, [ ] projects shipped

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
7. **Learning Block**: 30-60 min across 3 tracks:
   - Arabic: 15 min (vocab, app, or media)
   - Trading: 15 min (journal, analysis, or study)
   - AI: 15 min (newsletter, tool, or build)

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

    // Create Education Track Playbooks folder
    const educationFolder = await storage.createDoc({
      title: "Education Tracks",
      type: "page",
      domain: "personal",
      ventureId: venture.id,
      parentId: mainFolder.id,
      status: "active",
      icon: "🎓",
      isFolder: true,
      order: 6,
      body: "Dedicated playbooks for 2026 education pillars: Arabic, Trading, AI"
    });

    // Arabic Learning Playbook
    await storage.createDoc({
      title: "Arabic Learning Track",
      type: "playbook",
      domain: "personal",
      ventureId: venture.id,
      parentId: educationFolder.id,
      status: "draft",
      icon: "🇦🇪",
      isFolder: false,
      order: 1,
      body: `# Arabic Learning Track 2026

## Goal
Achieve conversational fluency in Arabic by December 2026

## Current Level
- [ ] Complete beginner
- [ ] Know basics (greetings, numbers)
- [ ] Can hold simple conversations
- [ ] Intermediate (can discuss topics)

## Target Level by Dec 2026
[Define your target: e.g., "Hold 15-minute conversations with native speakers"]

---

## 🔄 DAILY HABITS (365 days, non-negotiable)

| Activity | Time | When |
|----------|------|------|
| Vocabulary review (Anki/app) | 15 min | Morning |
| Arabic audio (podcast/music) | During commute/gym | Anytime |
| Read 1 thing in Arabic | 5 min | Evening |

**Weekly minimum: 2 hours total**

---

## 📅 WEEKLY COMMITMENTS

| Activity | Frequency | Duration |
|----------|-----------|----------|
| Formal lesson (tutor/class) | 2x/week | 30-60 min |
| Conversation practice | 1x/week | 30 min |
| Arabic TV/film (with subtitles) | 2x/week | 30 min |
| New vocabulary batch | 1x/week | 20 words |

---

## Resources
### Apps & Tools
- [ ] Duolingo Arabic - daily streak
- [ ] Anki flashcards - spaced repetition
- [ ] Pimsleur - audio lessons
- [ ] italki - native tutors

### Media (consume daily)
- [ ] Arabic podcasts:
- [ ] YouTube channels:
- [ ] Netflix shows in Arabic:
- [ ] Arabic music playlist:

### Courses
- [ ] [Add course name]

---

## Quarterly Milestones

| Quarter | Milestone |
|---------|-----------|
| Q1 (Mar) | 500 words, alphabet mastered, basic greetings |
| Q2 (Jun) | Order food, give directions, small talk |
| Q3 (Sep) | 15-min conversations with tutors |
| Q4 (Dec) | Watch content without subtitles, read news |

## Notes
-
`
    });

    // Trading Education Playbook
    await storage.createDoc({
      title: "Trading Education Track",
      type: "playbook",
      domain: "personal",
      ventureId: venture.id,
      parentId: educationFolder.id,
      status: "draft",
      icon: "📈",
      isFolder: false,
      order: 2,
      body: `# Trading Education Track 2026

## Goal
Become a consistently profitable, systematic trader with documented edge

## Current Level
- [ ] Beginner (learning basics)
- [ ] Intermediate (have strategies, inconsistent)
- [ ] Advanced (profitable but refining)

## 2026 Targets
| Metric | Target |
|--------|--------|
| Win Rate | % |
| Risk:Reward | : |
| Monthly Return | % |
| Max Drawdown | % |
| Strategies Mastered | |

---

## 🔄 DAILY HABITS (365 days, non-negotiable)

| Activity | Time | When |
|----------|------|------|
| Market structure review | 15 min | Pre-market |
| Journal review (if traded) | 10 min | Post-session |
| 1 trading insight (book/video/tweet) | 10 min | Anytime |

**Weekly minimum: 3 hours learning + practice**

---

## 📅 WEEKLY COMMITMENTS

| Activity | Frequency | Duration |
|----------|-----------|----------|
| Full market analysis | 1x/week (Sunday) | 1 hr |
| Strategy backtesting | 2x/week | 1 hr |
| Course/book study | 3x/week | 30 min |
| Review all week's trades | 1x/week (Friday) | 30 min |
| Paper trade or sim | As needed | - |

---

## Quarterly Focus (all run in parallel)

### Q1: Foundation & Strategy
- [ ] Complete [course name]
- [ ] Backtest 3 strategies (100+ trades each)
- [ ] Document trading rules

### Q2: Psychology & Risk
- [ ] Read "Trading in the Zone"
- [ ] Read "The Disciplined Trader"
- [ ] Implement position sizing rules

### Q3: Systems & Automation
- [ ] Build trading checklist system (use SB-OS trading module)
- [ ] Automate trade journaling
- [ ] Create strategy playbooks

### Q4: Mastery & Review
- [ ] Review full year of trades
- [ ] Identify edge leakages
- [ ] Plan 2027 trading goals

---

## Resources
### Books (read throughout year)
- [ ] Trading in the Zone - Mark Douglas
- [ ] The Disciplined Trader - Mark Douglas
- [ ] Market Wizards series
- [ ]

### Courses
- [ ]

### Mentors/Communities
- [ ]

## Notes
-
`
    });

    // AI Education Playbook
    await storage.createDoc({
      title: "AI & Technology Track",
      type: "playbook",
      domain: "personal",
      ventureId: venture.id,
      parentId: educationFolder.id,
      status: "draft",
      icon: "🤖",
      isFolder: false,
      order: 3,
      body: `# AI & Technology Track 2026

## Goal
Stay at the cutting edge of AI developments and apply them to ventures

## Focus Areas
1. **LLM/Foundation Models** - GPT, Claude, Gemini, open source
2. **AI Agents** - Autonomous systems, tool use, workflows
3. **AI for Business** - Automation, content, customer service
4. **Technical Skills** - Prompt engineering, fine-tuning, RAG

---

## 🔄 DAILY HABITS (365 days, non-negotiable)

| Activity | Time | When |
|----------|------|------|
| AI newsletter/feed scan | 15 min | Morning |
| Try 1 new prompt/technique | 10 min | During work |
| Note 1 AI insight | 5 min | Evening |

**Weekly minimum: 3 hours learning + building**

---

## 📅 WEEKLY COMMITMENTS

| Activity | Frequency | Duration |
|----------|-----------|----------|
| Deep-read 1 research paper/post | 1x/week | 1 hr |
| Experiment with new tool/model | 2x/week | 30 min |
| Build/ship AI feature | 1x/week | 2 hrs |
| AI podcast/video | 2x/week | 30 min |

---

## Daily/Weekly Sources (consume consistently)

### Newsletters (subscribe to all)
- [ ] The Rundown AI
- [ ] TLDR AI
- [ ] Import AI (by Jack Clark)
- [ ] Anthropic newsletter

### Twitter/X (check daily)
- [ ] @AnthropicAI
- [ ] @OpenAI
- [ ] @GoogleDeepMind
- [ ] Key researchers in your feed

### YouTube/Podcasts (2-3x/week)
- [ ] AI Explained
- [ ] Two Minute Papers
- [ ] Latent Space podcast
- [ ] Lex Fridman (AI episodes)

---

## Quarterly Focus (all run in parallel)

### Q1: Foundation
- [ ] Master prompt engineering patterns
- [ ] Understand RAG architecture
- [ ] Build 1 AI-powered feature for ventures

### Q2: Agents & Automation
- [ ] Learn AI agent frameworks (LangChain, Claude tools)
- [ ] Build automated workflows
- [ ] Implement AI in SB-OS

### Q3: Advanced Applications
- [ ] Explore fine-tuning
- [ ] Build custom AI tools for ventures
- [ ] Implement AI customer service

### Q4: Future Prep
- [ ] Review 2026 AI developments
- [ ] Identify 2027 trends
- [ ] Plan AI roadmap for ventures

---

## Tools to Master (ongoing)
- [ ] Claude (advanced features, artifacts, projects)
- [ ] ChatGPT + custom GPTs
- [ ] Cursor/Copilot for coding
- [ ] ComfyUI/Midjourney for images
- [ ] Voice AI (ElevenLabs, OpenAI TTS)

## Projects to Build (at least 1/quarter)
1. [ ]
2. [ ]
3. [ ]
4. [ ]

## Notes
-
`
    });

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
          educationFolder: educationFolder.id,
          totalDocs: 12 // Main folder + playbook + goals + 3 folders + 4 domain playbooks + 3 education tracks
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

/**
 * GET /api/setup/2026-arc/audit
 * Detailed audit of what exists vs what's expected
 */
router.get("/2026-arc/audit", async (req, res) => {
  try {
    const ventures = await storage.getVentures();
    const arc2026 = ventures.find(v => v.name === "2026 Arc");

    if (!arc2026) {
      return res.json({
        exists: false,
        message: "2026 Arc venture not found. Run POST /api/setup/2026-arc to create it."
      });
    }

    // Get projects
    const projects = await storage.getProjects({ ventureId: arc2026.id });
    const expectedProjects = ["Health & Energy", "Wealth & Ventures", "Knowledge & Skills", "Systems & Habits"];

    const projectStatus = expectedProjects.map(name => ({
      name,
      exists: projects.some(p => p.name === name),
      id: projects.find(p => p.name === name)?.id
    }));

    // Get phases for each project
    const projectsWithPhases = await Promise.all(
      projects.map(async (p) => {
        const phases = await storage.getPhases(p.id);
        return {
          name: p.name,
          id: p.id,
          phaseCount: phases.length,
          expectedPhases: 12
        };
      })
    );

    // Get docs
    const allDocs = await storage.getDocs({ ventureId: arc2026.id });

    const expectedDocs = [
      "2026 Arc",
      "2026 Arc Playbook",
      "Annual Goals & Metrics",
      "Monthly Reviews",
      "January 2026 Review",
      "Quarterly Reviews",
      "Domain Playbooks",
      "Health & Energy Playbook",
      "Wealth & Ventures Playbook",
      "Knowledge & Skills Playbook",
      "Systems & Habits Playbook",
      "Education Tracks",
      "Arabic Learning Track",
      "Trading Education Track",
      "AI & Technology Track"
    ];

    const docStatus = expectedDocs.map(title => ({
      title,
      exists: allDocs.some(d => d.title === title),
      id: allDocs.find(d => d.title === title)?.id
    }));

    const missingDocs = docStatus.filter(d => !d.exists).map(d => d.title);
    const existingDocs = docStatus.filter(d => d.exists).map(d => d.title);

    res.json({
      exists: true,
      venture: {
        id: arc2026.id,
        name: arc2026.name
      },
      projects: {
        expected: 4,
        found: projects.length,
        details: projectStatus,
        withPhases: projectsWithPhases
      },
      docs: {
        expected: expectedDocs.length,
        found: allDocs.length,
        existing: existingDocs,
        missing: missingDocs
      },
      summary: {
        projectsComplete: projectStatus.every(p => p.exists),
        docsComplete: missingDocs.length === 0,
        missingItems: missingDocs
      }
    });

  } catch (error) {
    logger.error({ error }, "Error auditing 2026 Arc");
    res.status(500).json({
      error: "Failed to audit 2026 Arc"
    });
  }
});

export default router;
