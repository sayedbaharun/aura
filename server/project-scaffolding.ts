import { storage } from "./storage";
import { logger } from "./logger";
import * as modelManager from "./model-manager";
import type { Venture, Project, Phase, Task, InsertProject, InsertPhase, InsertTask, InsertVenture } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface VentureIntakeData {
  ventureName: string;
  ventureDomain: "saas" | "media" | "realty" | "trading" | "personal" | "other";
  ventureOneLiner: string;
}

export interface ProjectIntakeData {
  ventureId?: string; // Optional - if not provided, must provide newVenture
  newVenture?: VentureIntakeData; // For creating a new venture
  projectName: string;
  projectCategory: string;
  desiredOutcome: string;
  scope: "small" | "medium" | "large";
  keyConstraints?: string;
  domainContext?: string;
}

export interface GeneratedTask {
  title: string;
  type: "business" | "deep_work" | "admin" | "learning";
  priority: "P0" | "P1" | "P2" | "P3";
  estEffort: number; // hours
  notes?: string;
}

export interface GeneratedPhase {
  name: string;
  order: number;
  notes?: string;
  tasks: GeneratedTask[];
}

export interface GeneratedVenture {
  name: string;
  domain: "saas" | "media" | "realty" | "trading" | "personal" | "other";
  oneLiner: string;
  primaryFocus: string;
  icon: string;
  color: string;
}

export interface GeneratedProjectPlan {
  venture?: GeneratedVenture; // Only present if creating new venture
  project: {
    name: string;
    category: string;
    outcome: string;
    notes: string;
    priority: "P0" | "P1" | "P2" | "P3";
  };
  phases: GeneratedPhase[];
}

export interface CommittedProjectPlan {
  venture?: Venture; // Only present if created new venture
  project: Project;
  phases: Phase[];
  tasks: Task[];
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const SCOPE_GUIDELINES = {
  small: {
    phases: "2-3 phases",
    tasksPerPhase: "3-5 tasks",
    totalEffort: "10-40 hours total",
  },
  medium: {
    phases: "3-4 phases",
    tasksPerPhase: "4-7 tasks",
    totalEffort: "40-120 hours total",
  },
  large: {
    phases: "4-6 phases",
    tasksPerPhase: "5-10 tasks",
    totalEffort: "120+ hours total",
  },
};

function buildProjectScaffoldingPrompt(intake: ProjectIntakeData, venture: Venture): string {
  const scope = SCOPE_GUIDELINES[intake.scope];

  return `You are an expert project manager helping to scaffold a new project for a venture.

## VENTURE CONTEXT
- Venture Name: ${venture.name}
- Venture Description: ${venture.oneLiner || "No description provided"}
- Venture Status: ${venture.status}
${venture.domain ? `- Domain: ${venture.domain}` : ""}

## PROJECT REQUEST
- Project Name: ${intake.projectName}
- Category: ${intake.projectCategory}
- Desired Outcome: ${intake.desiredOutcome}
- Scope: ${intake.scope} (${scope.phases}, ${scope.tasksPerPhase}, ${scope.totalEffort})
${intake.keyConstraints ? `- Key Constraints: ${intake.keyConstraints}` : ""}
${intake.domainContext ? `- Domain Context: ${intake.domainContext}` : ""}

## YOUR TASK
Generate a comprehensive project plan with phases and tasks. Follow these guidelines:

1. **Phases**: Create ${scope.phases} that represent logical stages of the project
   - Each phase should have a clear name and brief description
   - Order them sequentially (phase 1 comes before phase 2, etc.)

2. **Tasks**: Create ${scope.tasksPerPhase} per phase
   - Tasks should be atomic, actionable items (not vague goals)
   - Each task should be completable in 0.5-8 hours
   - Include a mix of task types: deep_work (strategic/creative), business (meetings/coordination), admin (setup/config), learning (research/upskilling)
   - Assign priorities: P0 (critical path), P1 (important), P2 (normal), P3 (nice to have)

3. **Effort Estimation**: Be realistic
   - Deep work tasks: typically 2-4 hours
   - Admin tasks: typically 0.5-2 hours
   - Business tasks: typically 1-2 hours
   - Learning tasks: typically 1-3 hours

4. **Project Summary**:
   - Write a clear project outcome
   - Add strategy/approach notes
   - Set appropriate priority based on urgency

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "project": {
    "name": "string - the project name",
    "category": "string - one of: marketing, sales_biz_dev, customer_success, product, tech_engineering, operations, research_dev, finance, people_hr, legal_compliance, admin_general, strategy_leadership",
    "outcome": "string - what success looks like",
    "notes": "string - strategy, approach, key considerations",
    "priority": "string - P0, P1, P2, or P3"
  },
  "phases": [
    {
      "name": "string - phase name",
      "order": 1,
      "notes": "string - what this phase covers",
      "tasks": [
        {
          "title": "string - specific, actionable task title",
          "type": "string - business, deep_work, admin, or learning",
          "priority": "string - P0, P1, P2, or P3",
          "estEffort": 2.0,
          "notes": "string - optional context or steps"
        }
      ]
    }
  ]
}

Important: Return ONLY the JSON object, no markdown code blocks or other text.`;
}

function buildVentureAndProjectPrompt(intake: ProjectIntakeData): string {
  const newVenture = intake.newVenture!;
  const scope = SCOPE_GUIDELINES[intake.scope];

  return `You are an expert business strategist and project manager helping to set up a new venture with its first project.

## NEW VENTURE REQUEST
- Venture Name: ${newVenture.ventureName}
- Domain: ${newVenture.ventureDomain}
- Description: ${newVenture.ventureOneLiner}

## FIRST PROJECT REQUEST
- Project Name: ${intake.projectName}
- Category: ${intake.projectCategory}
- Desired Outcome: ${intake.desiredOutcome}
- Scope: ${intake.scope} (${scope.phases}, ${scope.tasksPerPhase}, ${scope.totalEffort})
${intake.keyConstraints ? `- Key Constraints: ${intake.keyConstraints}` : ""}
${intake.domainContext ? `- Domain Context: ${intake.domainContext}` : ""}

## YOUR TASK
Generate both the venture details and a comprehensive project plan.

### For the Venture:
- Refine the primary focus based on the venture description
- Suggest an appropriate emoji icon (single emoji)
- Suggest a hex color that fits the domain (e.g., #3B82F6 for tech, #10B981 for finance, #F59E0B for media)

### For the Project:
1. **Phases**: Create ${scope.phases} that represent logical stages
2. **Tasks**: Create ${scope.tasksPerPhase} per phase
   - Atomic, actionable items (0.5-8 hours each)
   - Mix of types: deep_work, business, admin, learning
   - Priorities: P0 (critical), P1 (important), P2 (normal), P3 (nice to have)

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "venture": {
    "name": "string - the venture name",
    "domain": "string - saas, media, realty, trading, personal, or other",
    "oneLiner": "string - one sentence description",
    "primaryFocus": "string - main strategic focus for this venture",
    "icon": "string - single emoji that represents the venture",
    "color": "string - hex color code like #3B82F6"
  },
  "project": {
    "name": "string - the project name",
    "category": "string - one of: marketing, sales_biz_dev, customer_success, product, tech_engineering, operations, research_dev, finance, people_hr, legal_compliance, admin_general, strategy_leadership",
    "outcome": "string - what success looks like",
    "notes": "string - strategy, approach, key considerations",
    "priority": "string - P0, P1, P2, or P3"
  },
  "phases": [
    {
      "name": "string - phase name",
      "order": 1,
      "notes": "string - what this phase covers",
      "tasks": [
        {
          "title": "string - specific, actionable task title",
          "type": "string - business, deep_work, admin, or learning",
          "priority": "string - P0, P1, P2, or P3",
          "estEffort": 2.0,
          "notes": "string - optional context or steps"
        }
      ]
    }
  ]
}

Important: Return ONLY the JSON object, no markdown code blocks or other text.`;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate a project plan using AI based on intake data
 * If newVenture is provided, will also generate venture details
 */
export async function generateProjectPlan(intake: ProjectIntakeData): Promise<GeneratedProjectPlan> {
  const isCreatingNewVenture = !!intake.newVenture;
  let prompt: string;

  if (isCreatingNewVenture) {
    // Creating new venture + project
    prompt = buildVentureAndProjectPrompt(intake);
    logger.info({
      ventureName: intake.newVenture?.ventureName,
      projectName: intake.projectName,
      scope: intake.scope
    }, "Generating venture and project plan with AI");
  } else {
    // Using existing venture
    if (!intake.ventureId) {
      throw new Error("Either ventureId or newVenture must be provided");
    }
    const venture = await storage.getVenture(intake.ventureId);
    if (!venture) {
      throw new Error(`Venture not found: ${intake.ventureId}`);
    }
    prompt = buildProjectScaffoldingPrompt(intake, venture);
    logger.info({
      ventureId: intake.ventureId,
      projectName: intake.projectName,
      scope: intake.scope
    }, "Generating project plan with AI");
  }

  // Call AI
  const { response, metrics } = await modelManager.chatCompletion(
    {
      messages: [
        { role: "system", content: "You are a project planning expert. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    },
    "complex" // Use the most capable model for planning
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned empty response");
  }

  logger.info({
    model: metrics.modelUsed,
    tokensUsed: metrics.tokensUsed,
    creatingVenture: isCreatingNewVenture
  }, "Plan generated successfully");

  // Parse and validate the response
  let plan: GeneratedProjectPlan;
  try {
    plan = JSON.parse(content);
  } catch (parseError) {
    logger.error({ content, parseError }, "Failed to parse AI response as JSON");
    throw new Error("AI returned invalid JSON");
  }

  // Validate structure
  if (!plan.project || !plan.phases || !Array.isArray(plan.phases)) {
    throw new Error("AI returned incomplete project plan");
  }

  // If creating new venture, validate venture data
  if (isCreatingNewVenture && !plan.venture) {
    throw new Error("AI did not return venture data");
  }

  // Ensure phases are ordered
  plan.phases = plan.phases.map((phase, index) => ({
    ...phase,
    order: index + 1,
  }));

  return plan;
}

/**
 * Commit a generated project plan to the database
 * Creates venture (if new), project, phases, and tasks
 */
export async function commitProjectPlan(
  ventureId: string | null,
  plan: GeneratedProjectPlan,
  overrides?: {
    startDate?: string;
    targetEndDate?: string;
  }
): Promise<CommittedProjectPlan> {
  let actualVentureId = ventureId;
  let createdVenture: Venture | undefined;

  // 1. Create venture if provided in plan
  if (plan.venture) {
    logger.info({
      ventureName: plan.venture.name,
      domain: plan.venture.domain
    }, "Creating new venture");

    const ventureData: InsertVenture = {
      name: plan.venture.name,
      domain: plan.venture.domain as any,
      oneLiner: plan.venture.oneLiner,
      primaryFocus: plan.venture.primaryFocus,
      icon: plan.venture.icon,
      color: plan.venture.color,
      status: "active",
    };

    createdVenture = await storage.createVenture(ventureData);
    actualVentureId = createdVenture.id;
  }

  if (!actualVentureId) {
    throw new Error("No ventureId provided and no venture in plan");
  }

  logger.info({
    ventureId: actualVentureId,
    projectName: plan.project.name,
    phaseCount: plan.phases.length,
    taskCount: plan.phases.reduce((sum, p) => sum + p.tasks.length, 0)
  }, "Committing project plan to database");

  // 2. Create the project
  const projectData: InsertProject = {
    name: plan.project.name,
    ventureId: actualVentureId,
    status: "not_started",
    category: plan.project.category as any,
    priority: plan.project.priority as any,
    outcome: plan.project.outcome,
    notes: plan.project.notes,
    startDate: overrides?.startDate,
    targetEndDate: overrides?.targetEndDate,
  };

  const project = await storage.createProject(projectData);

  // 3. Create phases
  const createdPhases: Phase[] = [];
  for (const phaseData of plan.phases) {
    const phase = await storage.createPhase({
      name: phaseData.name,
      projectId: project.id,
      status: "not_started",
      order: phaseData.order,
      notes: phaseData.notes,
    });
    createdPhases.push(phase);
  }

  // 4. Create tasks
  const createdTasks: Task[] = [];
  for (let i = 0; i < plan.phases.length; i++) {
    const phaseData = plan.phases[i];
    const phase = createdPhases[i];

    for (const taskData of phaseData.tasks) {
      const task = await storage.createTask({
        title: taskData.title,
        ventureId: actualVentureId,
        projectId: project.id,
        phaseId: phase.id,
        status: "todo", // Start as todo so user can start working on it
        type: taskData.type as any,
        priority: taskData.priority as any,
        estEffort: taskData.estEffort,
        notes: taskData.notes,
      });
      createdTasks.push(task);
    }
  }

  logger.info({
    ventureCreated: !!createdVenture,
    ventureId: actualVentureId,
    projectId: project.id,
    phasesCreated: createdPhases.length,
    tasksCreated: createdTasks.length
  }, "Plan committed successfully");

  return {
    venture: createdVenture,
    project,
    phases: createdPhases,
    tasks: createdTasks,
  };
}

/**
 * Get venture domains for the intake form
 */
export function getVentureDomains() {
  return [
    { value: "saas", label: "SaaS / Software" },
    { value: "media", label: "Media / Content" },
    { value: "realty", label: "Real Estate" },
    { value: "trading", label: "Trading / Finance" },
    { value: "personal", label: "Personal" },
    { value: "other", label: "Other" },
  ];
}

/**
 * Get project categories for the intake form
 */
export function getProjectCategories() {
  return [
    { value: "marketing", label: "Marketing" },
    { value: "sales_biz_dev", label: "Sales & Business Development" },
    { value: "customer_success", label: "Customer Success" },
    { value: "product", label: "Product" },
    { value: "tech_engineering", label: "Tech / Engineering" },
    { value: "operations", label: "Operations" },
    { value: "research_dev", label: "Research & Development" },
    { value: "finance", label: "Finance" },
    { value: "people_hr", label: "People / HR" },
    { value: "legal_compliance", label: "Legal & Compliance" },
    { value: "admin_general", label: "Admin / General" },
    { value: "strategy_leadership", label: "Strategy & Leadership" },
  ];
}

/**
 * Get scope options for the intake form
 */
export function getScopeOptions() {
  return [
    {
      value: "small",
      label: "Small (1-2 weeks)",
      description: "2-3 phases, 3-5 tasks per phase, 10-40 hours total"
    },
    {
      value: "medium",
      label: "Medium (1-2 months)",
      description: "3-4 phases, 4-7 tasks per phase, 40-120 hours total"
    },
    {
      value: "large",
      label: "Large (3+ months)",
      description: "4-6 phases, 5-10 tasks per phase, 120+ hours total"
    },
  ];
}
