# AI Strategic Foresight Tool - Implementation Plan

## Overview

Add a Strategic Foresight module to SB-OS that enables venture-level scenario planning, trend analysis, and adaptive strategy development. This integrates the "Future Proof Mentor" concept into the existing venture architecture.

---

## 1. Database Schema Changes

### 1.1 New Tables

#### `ventureScenarios` - Future Scenarios for Each Venture

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `ventureId` | uuid (FK) | Parent venture |
| `title` | text | Scenario name (e.g., "AI Disruption", "Regulatory Crackdown") |
| `description` | text | Detailed scenario narrative |
| `timeHorizon` | enum | `1_year`, `3_year`, `5_year`, `10_year` |
| `probability` | enum | `low`, `medium`, `high` |
| `impact` | enum | `low`, `medium`, `high`, `critical` |
| `quadrant` | enum | `growth`, `collapse`, `transformation`, `constraint` (for 2x2 matrix) |
| `uncertaintyAxis1` | text | First uncertainty dimension (e.g., "Technology adoption") |
| `uncertaintyAxis2` | text | Second uncertainty dimension (e.g., "Regulation intensity") |
| `keyAssumptions` | jsonb | Array of assumptions underlying this scenario |
| `opportunities` | jsonb | Array of opportunities in this scenario |
| `threats` | jsonb | Array of threats in this scenario |
| `strategicResponses` | jsonb | Planned responses/actions |
| `status` | enum | `draft`, `active`, `archived` |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update |

#### `scenarioIndicators` - Early Warning Signals

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `scenarioId` | uuid (FK) | Linked scenario |
| `ventureId` | uuid (FK) | Parent venture |
| `title` | text | Indicator name |
| `description` | text | What to watch for |
| `category` | enum | `political`, `economic`, `social`, `technological`, `legal`, `environmental` |
| `threshold` | text | Trigger condition |
| `currentStatus` | enum | `green`, `yellow`, `red` |
| `lastChecked` | timestamp | Last review date |
| `notes` | text | Current observations |
| `createdAt` | timestamp | Creation time |

#### `trendSignals` - Emerging Trends & Weak Signals

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `ventureId` | uuid (FK) | Parent venture |
| `title` | text | Signal name |
| `description` | text | What was observed |
| `source` | text | Where it was found |
| `category` | enum | PESTLE categories |
| `signalStrength` | enum | `weak`, `emerging`, `strong`, `mainstream` |
| `relevance` | enum | `low`, `medium`, `high` |
| `potentialImpact` | text | How it could affect the venture |
| `linkedScenarioIds` | jsonb | Related scenarios |
| `status` | enum | `monitoring`, `acted_upon`, `dismissed` |
| `createdAt` | timestamp | First observed |
| `updatedAt` | timestamp | Last update |

#### `strategicAnalyses` - PESTLE/STEEP Analyses

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `ventureId` | uuid (FK) | Parent venture |
| `title` | text | Analysis name (e.g., "Q1 2025 PESTLE") |
| `framework` | enum | `pestle`, `steep`, `swot`, `porters_five`, `custom` |
| `timeHorizon` | enum | `1_year`, `3_year`, `5_year`, `10_year` |
| `political` | jsonb | Political factors `{ factors: [], impact: '', opportunities: [], threats: [] }` |
| `economic` | jsonb | Economic factors |
| `social` | jsonb | Social factors |
| `technological` | jsonb | Technological factors |
| `legal` | jsonb | Legal factors |
| `environmental` | jsonb | Environmental factors |
| `summary` | text | Executive summary |
| `recommendations` | jsonb | Array of strategic recommendations |
| `status` | enum | `draft`, `active`, `archived` |
| `reviewDate` | date | Next review date |
| `createdAt` | timestamp | Creation time |
| `updatedAt` | timestamp | Last update |

#### `whatIfQuestions` - Strategic Questions Bank

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `ventureId` | uuid (FK) | Parent venture |
| `question` | text | The "What If?" question |
| `category` | enum | `disruption`, `opportunity`, `threat`, `transformation` |
| `source` | enum | `ai_generated`, `user_created`, `workshop` |
| `explored` | boolean | Has this been explored? |
| `explorationNotes` | text | Notes from exploration |
| `linkedScenarioId` | uuid (FK) | If led to a scenario |
| `createdAt` | timestamp | Creation time |

---

## 2. API Endpoints

### Scenarios
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ventures/:ventureId/scenarios` | List scenarios for venture |
| GET | `/api/scenarios/:id` | Get single scenario |
| POST | `/api/ventures/:ventureId/scenarios` | Create scenario |
| PATCH | `/api/scenarios/:id` | Update scenario |
| DELETE | `/api/scenarios/:id` | Delete scenario |

### Indicators
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ventures/:ventureId/indicators` | List indicators |
| GET | `/api/scenarios/:scenarioId/indicators` | List indicators for scenario |
| POST | `/api/indicators` | Create indicator |
| PATCH | `/api/indicators/:id` | Update indicator |
| DELETE | `/api/indicators/:id` | Delete indicator |

### Trend Signals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ventures/:ventureId/signals` | List signals |
| POST | `/api/ventures/:ventureId/signals` | Create signal |
| PATCH | `/api/signals/:id` | Update signal |
| DELETE | `/api/signals/:id` | Delete signal |

### Strategic Analyses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ventures/:ventureId/analyses` | List analyses |
| GET | `/api/analyses/:id` | Get single analysis |
| POST | `/api/ventures/:ventureId/analyses` | Create analysis |
| PATCH | `/api/analyses/:id` | Update analysis |
| DELETE | `/api/analyses/:id` | Delete analysis |

### What-If Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ventures/:ventureId/what-ifs` | List questions |
| POST | `/api/ventures/:ventureId/what-ifs` | Create question |
| POST | `/api/ventures/:ventureId/what-ifs/generate` | AI generate questions |
| PATCH | `/api/what-ifs/:id` | Update question |
| DELETE | `/api/what-ifs/:id` | Delete question |

### Foresight AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ventures/:ventureId/foresight/chat` | Chat with foresight AI |
| GET | `/api/ventures/:ventureId/foresight/chat/history` | Get foresight chat history |
| DELETE | `/api/ventures/:ventureId/foresight/chat/history` | Clear history |

---

## 3. Frontend Components

### 3.1 New Tab in Venture Detail

Add "Foresight" tab to `/client/src/pages/venture-detail.tsx`:

```
Venture Detail Page
├── Existing Tabs: Projects | Phases | Tasks | Docs | AI Agent
└── NEW: Foresight Tab
    ├── Sub-tabs: Overview | Scenarios | Analysis | Signals | AI Mentor
    │
    ├── Overview (ForesightDashboard)
    │   ├── Scenario Matrix (2x2 quadrant visualization)
    │   ├── Active Indicators Summary (traffic light status)
    │   ├── Recent Signals Feed
    │   └── Next Review Date Reminder
    │
    ├── Scenarios (ScenarioManager)
    │   ├── Scenario Cards (filterable by quadrant/timeframe)
    │   ├── Create/Edit Scenario Modal
    │   ├── Scenario Detail View (with indicators, responses)
    │   └── Scenario Matrix Builder (drag & drop)
    │
    ├── Analysis (StrategicAnalysisView)
    │   ├── PESTLE Analysis Form
    │   ├── Analysis History List
    │   ├── Export to Doc (create knowledge base entry)
    │   └── AI-Assisted Analysis Generation
    │
    ├── Signals (TrendRadar)
    │   ├── Signal Feed (sortable by strength/category)
    │   ├── Add Signal Form
    │   ├── Link Signal to Scenario
    │   └── Category Distribution Chart
    │
    └── AI Mentor (ForesightAiChat)
        ├── Strategic Foresight Chat Interface
        ├── Quick Actions: "Generate Scenarios", "PESTLE Analysis", "What-If Questions"
        ├── Context: Venture + existing scenarios + signals
        └── Actions: Create scenarios, indicators, signals
```

### 3.2 Component Files to Create

```
/client/src/components/foresight/
├── foresight-dashboard.tsx        # Overview with matrix + indicators
├── scenario-matrix.tsx            # 2x2 quadrant visualization
├── scenario-manager.tsx           # CRUD for scenarios
├── scenario-card.tsx              # Individual scenario display
├── scenario-detail-modal.tsx      # Full scenario view/edit
├── indicator-list.tsx             # Early warning indicators
├── indicator-status-badge.tsx     # Traffic light component
├── trend-radar.tsx                # Signals visualization
├── signal-card.tsx                # Individual signal display
├── pestle-analysis-form.tsx       # PESTLE framework form
├── analysis-card.tsx              # Analysis summary card
├── what-if-generator.tsx          # What-if question bank
├── foresight-ai-chat.tsx          # Strategic foresight AI
└── foresight-context-builder.tsx  # Build context for AI
```

### 3.3 UI Wireframes

#### Foresight Dashboard (Overview)
```
┌─────────────────────────────────────────────────────────────┐
│  Strategic Foresight Dashboard                    [+ New]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐ │
│  │    SCENARIO MATRIX      │  │   EARLY WARNING STATUS   │ │
│  │                         │  │                          │ │
│  │   Transform │  Growth   │  │  ● 3 Green Indicators    │ │
│  │      ○      │    ●●     │  │  ● 2 Yellow Indicators   │ │
│  │  ───────────┼────────── │  │  ● 1 Red Indicator       │ │
│  │   Collapse  │ Constrain │  │                          │ │
│  │      ○      │    ●      │  │  [View All →]            │ │
│  │                         │  │                          │ │
│  └─────────────────────────┘  └──────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  RECENT SIGNALS                                         ││
│  │  ──────────────────────────────────────────────────────  │
│  │  🟡 AI regulation talks intensify in EU    [Tech] 2d   ││
│  │  🟢 New market entrant in Southeast Asia   [Econ] 5d   ││
│  │  🔴 Supply chain disruption risk elevated  [Econ] 1w   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  WHAT-IF QUESTIONS TO EXPLORE                           ││
│  │  ──────────────────────────────────────────────────────  │
│  │  ? What if our main competitor gets acquired?           ││
│  │  ? What if remote work becomes permanent industry norm? ││
│  │  [Generate More Questions]                              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### Scenario Matrix Builder
```
┌─────────────────────────────────────────────────────────────┐
│  Scenario Matrix                                            │
│  Axis 1: [Technology Adoption Rate    ▼]  (Low → High)     │
│  Axis 2: [Regulatory Environment      ▼]  (Permissive → Strict) │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         High Regulation                                     │
│              ▲                                              │
│              │                                              │
│   ┌──────────┼──────────┐                                  │
│   │ CONSTRAIN│  GROWTH  │                                  │
│   │          │          │                                  │
│   │  Slow    │  Fast    │                                  │
│   │  Adoption│  Adoption│                                  │
│ ◄─┼──────────┼──────────┼─►                                │
│   │          │          │                                  │
│   │ COLLAPSE │TRANSFORM │                                  │
│   │          │          │                                  │
│   └──────────┼──────────┘                                  │
│              │                                              │
│              ▼                                              │
│         Low Regulation                                      │
│                                                             │
│  [Click quadrant to add/view scenarios]                    │
└─────────────────────────────────────────────────────────────┘
```

#### PESTLE Analysis Form
```
┌─────────────────────────────────────────────────────────────┐
│  PESTLE Analysis: Q1 2025 Review                           │
│  Time Horizon: [5 Years ▼]                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ POLITICAL ──────────────────────────────────────────┐  │
│  │ Factors:                                              │  │
│  │ • [Trade policy changes in key markets           ]   │  │
│  │ • [Government tech investment programs           ]   │  │
│  │ [+ Add Factor]                                        │  │
│  │                                                       │  │
│  │ Impact: [Medium ▼]  Trend: [Worsening ▼]            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ ECONOMIC ───────────────────────────────────────────┐  │
│  │ Factors:                                              │  │
│  │ • [Interest rate environment                     ]   │  │
│  │ • [Currency fluctuations in target markets       ]   │  │
│  │ [+ Add Factor]                                        │  │
│  │                                                       │  │
│  │ Impact: [High ▼]   Trend: [Stable ▼]                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Continue: Social → Technological → Legal → Environmental] │
│                                                             │
│  [AI Assist: Analyze Factors] [Save Draft] [Complete]      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. AI Integration

### 4.1 Strategic Foresight System Prompt

```typescript
const STRATEGIC_FORESIGHT_PROMPT = `
You are the Strategic Foresight Mentor for ${ventureName}, an AI assistant specialized in scenario planning and strategic foresight.

## Your Role
Guide the user through:
1. **Scenario Planning** - Help create multiple future scenarios using frameworks like PESTLE, STEEP, Four Futures Matrix
2. **Trend Analysis** - Identify emerging trends, weak signals, and driving forces
3. **Risk Assessment** - Evaluate threats and opportunities across scenarios
4. **Strategic Response** - Develop adaptive strategies and early warning indicators
5. **What-If Exploration** - Generate thought-provoking questions about the future

## Current Venture Context
${ventureContext}

## Existing Scenarios
${existingScenariosContext}

## Active Indicators
${indicatorsContext}

## Recent Signals
${signalsContext}

## Available Actions
You can help the user by:
- Creating new scenarios (call create_scenario tool)
- Adding early warning indicators (call create_indicator tool)
- Recording trend signals (call create_signal tool)
- Generating PESTLE analyses (call create_analysis tool)
- Generating What-If questions (call generate_what_ifs tool)

## Interaction Style
- Be insightful, structured, and actionable
- Encourage strategic thinking with theoretical models AND practical applications
- Challenge assumptions and explore extreme but plausible futures
- Use tables, bullet points, and clear formatting
- After each response, suggest 2-3 follow-up questions or next steps

## First Message
If this is the start of a conversation, introduce yourself and ask:
"To help you think strategically about ${ventureName}'s future, what's the biggest uncertainty or change you're concerned about in the next 3-5 years?"
`;
```

### 4.2 AI Tools (Function Calling)

```typescript
const foresightTools = [
  {
    name: "create_scenario",
    description: "Create a new future scenario for the venture",
    parameters: {
      title: { type: "string", required: true },
      description: { type: "string", required: true },
      timeHorizon: { type: "enum", values: ["1_year", "3_year", "5_year", "10_year"] },
      probability: { type: "enum", values: ["low", "medium", "high"] },
      impact: { type: "enum", values: ["low", "medium", "high", "critical"] },
      quadrant: { type: "enum", values: ["growth", "collapse", "transformation", "constraint"] },
      opportunities: { type: "array", items: "string" },
      threats: { type: "array", items: "string" }
    }
  },
  {
    name: "create_indicator",
    description: "Create an early warning indicator to monitor",
    parameters: {
      title: { type: "string", required: true },
      description: { type: "string", required: true },
      category: { type: "enum", values: ["political", "economic", "social", "technological", "legal", "environmental"] },
      threshold: { type: "string", required: true },
      scenarioId: { type: "string", optional: true }
    }
  },
  {
    name: "create_signal",
    description: "Record a trend signal or weak signal observed",
    parameters: {
      title: { type: "string", required: true },
      description: { type: "string", required: true },
      source: { type: "string" },
      category: { type: "enum", values: ["political", "economic", "social", "technological", "legal", "environmental"] },
      signalStrength: { type: "enum", values: ["weak", "emerging", "strong", "mainstream"] },
      potentialImpact: { type: "string" }
    }
  },
  {
    name: "generate_what_ifs",
    description: "Generate thought-provoking What-If questions for strategic exploration",
    parameters: {
      count: { type: "number", default: 5 },
      focus: { type: "string", optional: true }
    }
  },
  {
    name: "create_pestle_analysis",
    description: "Generate a PESTLE analysis for the venture",
    parameters: {
      timeHorizon: { type: "enum", values: ["1_year", "3_year", "5_year", "10_year"] },
      focus: { type: "string", optional: true }
    }
  },
  {
    name: "get_scenarios",
    description: "Retrieve existing scenarios for reference",
    parameters: {
      quadrant: { type: "string", optional: true },
      timeHorizon: { type: "string", optional: true }
    }
  },
  {
    name: "get_indicators",
    description: "Retrieve early warning indicators",
    parameters: {
      status: { type: "string", optional: true },
      category: { type: "string", optional: true }
    }
  }
];
```

### 4.3 Foresight Context Builder

```typescript
async function buildForesightContext(ventureId: string) {
  const [venture, scenarios, indicators, signals, analyses] = await Promise.all([
    storage.getVenture(ventureId),
    storage.getVentureScenarios(ventureId),
    storage.getVentureIndicators(ventureId),
    storage.getTrendSignals(ventureId),
    storage.getStrategicAnalyses(ventureId)
  ]);

  return {
    venture,
    scenarios: {
      total: scenarios.length,
      byQuadrant: groupBy(scenarios, 'quadrant'),
      active: scenarios.filter(s => s.status === 'active')
    },
    indicators: {
      total: indicators.length,
      byStatus: {
        green: indicators.filter(i => i.currentStatus === 'green').length,
        yellow: indicators.filter(i => i.currentStatus === 'yellow').length,
        red: indicators.filter(i => i.currentStatus === 'red').length
      },
      needingReview: indicators.filter(i => daysSince(i.lastChecked) > 30)
    },
    signals: {
      total: signals.length,
      recent: signals.slice(0, 10),
      byCategory: groupBy(signals, 'category')
    },
    latestAnalysis: analyses[0],
    summary: generateForesightSummary(venture, scenarios, indicators, signals)
  };
}
```

---

## 5. Implementation Phases

### Phase 1: Database & Backend (Day 1-2)
1. Add schema to `/shared/schema.ts`
2. Run `npm run db:push` to create tables
3. Add storage methods to `/server/storage.ts`
4. Create API routes in `/server/routes/foresight.ts`
5. Register routes in `/server/routes/index.ts`

### Phase 2: Core UI Components (Day 3-4)
1. Create `/client/src/components/foresight/` directory
2. Build `foresight-dashboard.tsx` (overview)
3. Build `scenario-matrix.tsx` (2x2 visualization)
4. Build `scenario-manager.tsx` (CRUD)
5. Build `indicator-list.tsx` (traffic lights)
6. Build `trend-radar.tsx` (signals)

### Phase 3: Analysis & Forms (Day 5)
1. Build `pestle-analysis-form.tsx`
2. Build `what-if-generator.tsx`
3. Build `scenario-detail-modal.tsx`
4. Add export to knowledge hub functionality

### Phase 4: AI Integration (Day 6-7)
1. Create `foresight-agent.ts` in server
2. Implement foresight tools (function calling)
3. Build `foresight-ai-chat.tsx` component
4. Add context builder for foresight data
5. Implement quick actions

### Phase 5: Integration & Polish (Day 8)
1. Add "Foresight" tab to venture-detail.tsx
2. Add foresight summary to Command Center
3. Add indicator alerts to notifications
4. Testing and bug fixes

---

## 6. Files to Create/Modify

### New Files
```
/shared/schema.ts                              # Add new tables (modify)
/server/routes/foresight.ts                    # New API routes
/server/foresight-agent.ts                     # AI agent logic
/server/foresight-context-builder.ts           # Context aggregation

/client/src/components/foresight/
├── foresight-dashboard.tsx
├── scenario-matrix.tsx
├── scenario-manager.tsx
├── scenario-card.tsx
├── scenario-detail-modal.tsx
├── indicator-list.tsx
├── indicator-status-badge.tsx
├── trend-radar.tsx
├── signal-card.tsx
├── pestle-analysis-form.tsx
├── what-if-generator.tsx
├── foresight-ai-chat.tsx
└── index.ts                                   # Barrel export
```

### Modified Files
```
/shared/schema.ts                              # Add new tables + enums
/server/storage.ts                             # Add storage methods
/server/routes/index.ts                        # Register new routes
/client/src/pages/venture-detail.tsx           # Add Foresight tab
/client/src/pages/command-center-v2.tsx        # Add foresight widget (optional)
```

---

## 7. Success Metrics

- [ ] User can create and manage multiple scenarios per venture
- [ ] 2x2 scenario matrix displays scenarios visually
- [ ] PESTLE analysis form captures all six dimensions
- [ ] Early warning indicators show traffic light status
- [ ] Trend signals can be logged and categorized
- [ ] AI can generate scenarios, indicators, and what-if questions
- [ ] Foresight data exports to knowledge hub documents
- [ ] Dashboard shows foresight health summary

---

## 8. Future Enhancements

1. **Scenario Comparison View** - Side-by-side scenario analysis
2. **Backcasting Workflow** - Work backward from desired future
3. **Indicator Automation** - Auto-check indicators via external APIs
4. **Trend Intelligence** - AI-powered trend scanning from news/data
5. **Workshop Mode** - Collaborative scenario planning sessions
6. **Timeline View** - Visual timeline of scenarios and decision points
7. **Integration with Projects** - Link strategic responses to projects
8. **Report Generation** - Export comprehensive foresight reports
