# SB-OS: The Sayed Baharun Productivity Engine
## Complete Technical & Product Specification

---

## 1. IDENTITY & PHILOSOPHY

### Core Identity

**SB-OS** is not a productivity tool—it is **the operating system for one founder: Sayed Baharun**.

It is:
- A **thinking partner + execution engine**, not a task manager
- **Single-brain, multi-venture**: everything rolls up to one person across multiple businesses
- **Today-centric**: every day is a unified view of tasks, health, nutrition, and focus
- **Context-preserving**: relations ensure no information is orphaned

### Design Principles

1. **Capture → Clarify → Commit → Complete**
   - Every input flows through a canonical pipeline
   - Nothing falls through cracks; everything is processed

2. **Leverage → Precision → Defensibility**
   - Focus on high-leverage work first
   - Precision in execution (deep work slots, clear outcomes)
   - Build defensible moats (SOPs, systems, documented knowledge)

3. **Few Canonical Entities**
   - Core entities: Ventures, Projects, Tasks, Days, Health, Nutrition, Docs
   - Heavy use of relations (never duplicate data)
   - Every entity connects to Ventures or Days for context

4. **Health & Clarity First, Then Output**
   - Health metrics are first-class citizens
   - Energy and mood inform task planning
   - Deep work > shallow busywork

5. **One Source of Truth**
   - Every piece of data lives in exactly one place
   - Relations create views, not copies
   - Built for iteration and evolution

---

## 2. DOMAIN MODEL (ENTITIES & RELATIONS)

### 2.1. Entity: **User**

**Description**: The single operator of SB-OS (Sayed Baharun). Single-user system for now.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique user ID | `user_sayed` |
| `name` | string | Full name | `Sayed Baharun` |
| `email` | string | Email address | `sayed@hikmadigital.com` |
| `timezone` | string | Default timezone | `Asia/Dubai` |
| `default_focus_slots` | json | Default daily focus blocks | `{"morning": "06:00-09:00", "deep": "09:00-13:00"}` |
| `created_at` | timestamp | Account creation | `2025-01-15T10:00:00Z` |
| `updated_at` | timestamp | Last profile update | `2025-11-23T08:30:00Z` |

**Relations**:
- User → many Ventures
- User → many Days
- User → many Tasks
- User → many Capture Items

---

### 2.2. Entity: **Venture**

**Description**: Each business or major initiative (e.g., Aivant Realty, MyDub.ai, SB Digital, Arab Money Official, Trading, etc.).

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique venture ID | `venture_mydub` |
| `name` | string | Venture name | `MyDub.ai` |
| `status` | enum | `active \| development \| paused \| archived` | `active` |
| `one_liner` | string | One-sentence description | `AI-driven Dubai lifestyle media` |
| `domain` | enum | `saas \| media \| realty \| trading \| personal \| other` | `media` |
| `primary_focus` | text | Main strategic focus | `Automated news + content engine` |
| `vision` | text | Long-term vision | `Become the authoritative voice on Dubai lifestyle` |
| `current_milestone` | string | Next major milestone | `Launch v2 with GPT-4 integration` |
| `health_metric` | string | Key success metric | `Daily unique visitors` |
| `external_id` | string | Notion/Supabase ID | `notion_page_xyz` |
| `created_at` | timestamp | Creation timestamp | `2024-06-01T00:00:00Z` |
| `updated_at` | timestamp | Last update | `2025-11-20T14:22:00Z` |

**Relations**:
- Venture → many Projects
- Venture → many Tasks
- Venture → many Docs/SOPs

---

### 2.3. Entity: **Project**

**Description**: A concrete initiative within a venture or personal domain. Projects have defined outcomes and timelines.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique project ID | `proj_mydub_v2_launch` |
| `name` | string | Project title | `MyDub.ai v2.0 Launch` |
| `venture_id` | fk → Venture | Parent venture | `venture_mydub` |
| `status` | enum | `not_started \| active \| on_hold \| done \| cancelled` | `active` |
| `category` | enum | `product \| marketing \| operations \| finance \| research` | `product` |
| `priority` | enum | `P0 \| P1 \| P2 \| P3` | `P0` |
| `start_date` | date | Planned start | `2025-11-01` |
| `target_end_date` | date | Target completion | `2025-12-15` |
| `actual_end_date` | date | Actual completion (nullable) | `null` |
| `outcome` | text | What success looks like | `v2 live with 10k MAU` |
| `notes` | text | Strategy, plan, links | `Focus on UI/UX refresh, GPT-4 integration` |
| `external_id` | string | Notion/Supabase ID | `notion_page_abc` |
| `created_at` | timestamp | Creation timestamp | `2025-11-01T09:00:00Z` |
| `updated_at` | timestamp | Last update | `2025-11-23T10:15:00Z` |

**Relations**:
- Project → one Venture
- Project → many Tasks
- Project → many Docs/SOPs (via junction table)

---

### 2.4. Entity: **Task**

**Description**: The atomic unit of execution. Tasks are the smallest actionable items.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique task ID | `task_001` |
| `title` | string | Task title | `Design new homepage hero section` |
| `status` | enum | `idea \| next \| in_progress \| blocked \| done \| cancelled` | `in_progress` |
| `priority` | enum | `P0 \| P1 \| P2 \| P3` | `P0` |
| `type` | enum | `business \| deep_work \| admin \| personal \| learning` | `deep_work` |
| `domain` | enum | `work \| health \| finance \| learning \| personal` | `work` |
| `venture_id` | fk → Venture | Parent venture (nullable) | `venture_mydub` |
| `project_id` | fk → Project | Parent project (nullable) | `proj_mydub_v2_launch` |
| `day_id` | fk → Day | Day explicitly scheduled (nullable) | `day_2025_11_23` |
| `due_date` | date | Hard deadline (nullable) | `2025-11-25` |
| `focus_date` | date | Day Sayed plans to work on it | `2025-11-23` |
| `focus_slot` | enum | `morning \| deep \| afternoon \| evening \| anytime` | `deep` |
| `est_effort` | float | Estimated hours | `3.0` |
| `actual_effort` | float | Actual hours (nullable) | `2.5` |
| `notes` | text | Details, context, links | `Use Figma mockup in shared folder` |
| `external_id` | string | Supabase/Notion ID | `supabase_task_xyz` |
| `created_at` | timestamp | Creation timestamp | `2025-11-20T08:00:00Z` |
| `updated_at` | timestamp | Last update | `2025-11-23T11:45:00Z` |
| `completed_at` | timestamp | Completion timestamp (nullable) | `null` |

**Relations**:
- Task → one Venture (nullable)
- Task → one Project (nullable)
- Task → one Day (nullable, when scheduled)
- Task → many Docs/SOPs (via tags or references)

---

### 2.5. Entity: **Capture Item (Inbox)**

**Description**: Raw, unprocessed thoughts, ideas, tasks, links. The brain dump zone.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique capture ID | `capture_001` |
| `title` | text | Brief capture text | `Idea: Launch MyDub podcast series` |
| `type` | enum | `idea \| task \| note \| link \| reminder` | `idea` |
| `source` | enum | `brain \| whatsapp \| email \| meeting \| web` | `brain` |
| `domain` | enum | `work \| health \| finance \| learning \| personal` | `work` |
| `venture_id` | fk → Venture | Link to venture (nullable) | `venture_mydub` |
| `project_id` | fk → Project | Link to project (nullable) | `null` |
| `linked_task_id` | fk → Task | If converted to task (nullable) | `null` |
| `clarified` | boolean | Has this been processed? | `false` |
| `notes` | text | Additional context | `Could tie into new content strategy` |
| `created_at` | timestamp | Capture timestamp | `2025-11-23T07:12:00Z` |
| `clarified_at` | timestamp | When processed (nullable) | `null` |

**Relations**:
- Capture → one Task (when converted)
- Capture → one Venture (optional)
- Capture → one Project (optional)

---

### 2.6. Entity: **Day (Daily Log)**

**Description**: Every day has a canonical "Day" record. The central hub for daily planning and reflection.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique day ID | `day_2025_11_23` |
| `date` | date | YYYY-MM-DD | `2025-11-23` |
| `title` | string | Day theme/title | `MyDub v2 Deep Build` |
| `top_3_outcomes` | text | Three most important outcomes | `1. Hero section design\n2. API integration\n3. Test suite` |
| `one_thing_to_ship` | text | Single most leveraged deliverable | `Ship homepage redesign to staging` |
| `reflection_am` | text | Morning intention (nullable) | `Focus on deep work, no meetings` |
| `reflection_pm` | text | Evening review (nullable) | `Shipped hero section, blocked on API` |
| `mood` | enum | `low \| medium \| high \| peak` | `high` |
| `primary_venture_focus` | fk → Venture | Main venture for the day (nullable) | `venture_mydub` |
| `created_at` | timestamp | Creation timestamp | `2025-11-23T06:00:00Z` |
| `updated_at` | timestamp | Last update | `2025-11-23T21:30:00Z` |

**Relations**:
- Day → many Tasks (via `day_id` or `focus_date`)
- Day → one Health Entry
- Day → many Nutrition Entries
- Day → one Venture (primary focus, nullable)

---

### 2.7. Entity: **Health Entry**

**Description**: Daily health metrics. One per day.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique health entry ID | `health_2025_11_23` |
| `day_id` | fk → Day | Parent day | `day_2025_11_23` |
| `date` | date | Redundant for convenience | `2025-11-23` |
| `sleep_hours` | float | Hours slept | `7.5` |
| `sleep_quality` | enum | `poor \| fair \| good \| excellent` | `good` |
| `energy_level` | int | 1–5 scale | `4` |
| `mood` | enum | `low \| medium \| high \| peak` | `high` |
| `steps` | int | Steps walked | `12543` |
| `workout_done` | boolean | Did workout happen? | `true` |
| `workout_type` | enum | `strength \| cardio \| yoga \| sports \| none` | `strength` |
| `workout_duration` | int | Minutes | `45` |
| `weight` | float | Weight in kg (nullable) | `78.2` |
| `stress_level` | enum | `low \| medium \| high` | `low` |
| `tags` | array | Context tags | `["home", "recovery_day"]` |
| `notes` | text | Subjective context | `Felt strong, morning workout set good tone` |
| `created_at` | timestamp | Log timestamp | `2025-11-23T21:00:00Z` |

**Relations**:
- Health Entry → one Day

---

### 2.8. Entity: **Nutrition Entry**

**Description**: Meal-level logging. Multiple entries per day.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique nutrition entry ID | `nutrition_001` |
| `day_id` | fk → Day | Parent day | `day_2025_11_23` |
| `datetime` | timestamp | Date + time of meal | `2025-11-23T08:30:00Z` |
| `meal_type` | enum | `breakfast \| lunch \| dinner \| snack` | `breakfast` |
| `description` | string | Meal description | `Eggs, avocado, whole wheat toast` |
| `calories` | float | Approximate calories | `450` |
| `protein_g` | float | Protein in grams | `28` |
| `carbs_g` | float | Carbs in grams | `35` |
| `fats_g` | float | Fats in grams | `22` |
| `context` | enum | `home \| restaurant \| office \| travel` | `home` |
| `tags` | array | Meal tags | `["clean", "high_protein"]` |
| `notes` | text | Additional context | `Meal prep from Sunday` |
| `created_at` | timestamp | Log timestamp | `2025-11-23T08:45:00Z` |

**Relations**:
- Nutrition Entry → one Day

---

### 2.9. Entity: **Doc / SOP / Prompt**

**Description**: Standard operating procedures, playbooks, AI prompts, specs, and knowledge artifacts.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique doc ID | `doc_sop_content_workflow` |
| `title` | string | Doc/SOP/Prompt title | `MyDub.ai Content Publishing SOP` |
| `type` | enum | `sop \| prompt \| playbook \| spec \| note` | `sop` |
| `domain` | enum | `venture_ops \| marketing \| product \| personal \| finance` | `venture_ops` |
| `venture_id` | fk → Venture | Parent venture (nullable) | `venture_mydub` |
| `project_id` | fk → Project | Parent project (nullable) | `null` |
| `status` | enum | `draft \| active \| archived` | `active` |
| `body` | rich text | Rich text / markdown content | `## Publishing Workflow\n1. Write\n2. Review\n...` |
| `tags` | array | Tags for search | `["content", "automation", "AI"]` |
| `external_id` | string | Notion/Supabase ID | `notion_page_sop_123` |
| `created_at` | timestamp | Creation timestamp | `2025-10-15T10:00:00Z` |
| `updated_at` | timestamp | Last update | `2025-11-20T16:30:00Z` |

**Relations**:
- Doc → one Venture (nullable)
- Doc → one Project (nullable)
- Doc → many Tasks (via references or tags)

---

### 2.10. Entity: **Quote / Inspiration**

**Description**: Inspirational quotes, principles, mental models. Optional but recommended for daily motivation.

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique quote ID | `quote_001` |
| `text` | text | Quote text | `Leverage is the difference between good and great.` |
| `author` | string | Author or source | `Naval Ravikant` |
| `category` | enum | `leverage \| health \| focus \| strategy \| mindset` | `leverage` |
| `tags` | array | Tags for filtering | `["productivity", "systems"]` |
| `created_at` | timestamp | Creation timestamp | `2025-11-01T12:00:00Z` |

**Relations**:
- Quote → many Days (optional: day's quote)

---

### 2.11. Entity: **Integration Record**

**Description**: Tracks external system IDs and sync status (Notion, Supabase, Google Calendar, etc.).

**Schema**:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique integration record ID | `int_001` |
| `entity_type` | enum | `task \| project \| venture \| day \| doc` | `task` |
| `entity_id` | string | Internal SB-OS entity ID | `task_001` |
| `external_system` | enum | `notion \| supabase \| gcal \| zapier` | `notion` |
| `external_id` | string | External system ID | `notion_page_abc123` |
| `sync_status` | enum | `synced \| pending \| error` | `synced` |
| `last_synced_at` | timestamp | Last sync timestamp | `2025-11-23T10:00:00Z` |
| `metadata` | json | Additional sync metadata | `{"notion_db_id": "xyz", "parent_page": "abc"}` |
| `created_at` | timestamp | Creation timestamp | `2025-11-20T08:00:00Z` |

**Relations**:
- Integration Record → any entity (polymorphic via `entity_type` + `entity_id`)

---

## 3. MODULES / SCREENS (UX)

### 3.1. **Command Center (Home)**

**Purpose**: The default screen Sayed sees every day. Unified view of today's tasks, health, nutrition, and inbox.

**Views**:

#### **Today Overview**
- **Header**: Display `Day.title`, date, primary venture focus
- **Top 3 Outcomes**: Show `Day.top_3_outcomes`
- **One Thing to Ship**: Display `Day.one_thing_to_ship`

#### **Tasks: Today**
- **Filter**:
  - `focus_date = today` OR `due_date = today`
  - `status IN (next, in_progress, blocked)`
- **Group by**: Venture, then by Project or Type
- **Display**: Task title, priority, focus slot, est. effort
- **Actions**: Mark done, reschedule, edit

#### **Health Snapshot**
- **Data**: Today's `Health Entry`
- **Show**: Sleep hours, energy level, mood, workout status
- **Visual**: Simple cards or mini-graphs

#### **Nutrition Snapshot**
- **Data**: Today's `Nutrition Entries`
- **Show**: Total calories, protein, carbs, fats
- **List**: Meals logged so far

#### **Capture Inbox**
- **Filter**: `clarified = false`
- **Sort**: Newest first
- **Actions**:
  - Convert to Task (with venture/project pickers)
  - Link to Project or Venture
  - Archive as Note
  - Delete

#### **This Week Preview**
- **Filter**: Tasks with `due_date` or `focus_date` in next 7 days
- **Group by**: Venture
- **Display**: Count of tasks per venture, upcoming deadlines

**Navigation**:
- Quick links to: Venture HQ, Deep Work, Health Hub, Knowledge Hub
- Daily quote of the day (from `Quote` entity)

---

### 3.2. **Venture HQ**

**Purpose**: High-level view of all ventures with drill-down to projects and tasks.

**Views**:

#### **Venture Dashboard**
- **List**: All ventures with status badges
- **For each venture, show**:
  - Active projects count
  - Open tasks count
  - Next milestone
  - Health metric (custom per venture)
- **Actions**: Select venture to drill down

#### **Venture Detail View** (when a venture is selected)
- **Header**: Venture name, status, one-liner, current milestone
- **Tabs**:
  1. **Projects Board**
     - Kanban or list view by status: `not_started`, `active`, `on_hold`, `done`
     - Show project title, target end date, progress (% tasks done)
  2. **Tasks List**
     - Filter: `venture_id = selected_venture`
     - Group by: Project, then by status
     - Display: Task title, priority, due date, status
  3. **Docs & SOPs**
     - Filter: `venture_id = selected_venture`
     - List: Title, type, status
     - Actions: View, edit, create new
  4. **Metrics** (future)
     - Custom charts/KPIs per venture

---

### 3.3. **Deep Work & Planning**

**Purpose**: Dedicated view for planning and executing deep work sessions.

**Views**:

#### **Deep Work Queue**
- **Filter**:
  - `type = deep_work`
  - `status IN (next, in_progress)`
- **Sort**: By priority, then by focus_date
- **Display**: Task title, project, est. effort, notes

#### **Weekly Deep Work Calendar**
- **Grid**: 7 days × focus slots (morning, deep, afternoon, evening)
- **Show**: Tasks scheduled in each slot
- **Actions**:
  - Drag-and-drop tasks to slots
  - Auto-link task to `Day` when scheduled
  - Color-code by venture

#### **Focus Session Timer** (optional)
- Start/stop timer for current task
- Track `actual_effort` when session ends
- Log reflections

**Navigation**:
- Back to Command Center
- Link to today's Day record

---

### 3.4. **Health & Performance Hub**

**Purpose**: Track health metrics, correlate with performance, identify patterns.

**Views**:

#### **Health Calendar**
- **Grid**: 30-day calendar view
- **For each day, show**:
  - Energy level (color-coded)
  - Mood icon
  - Workout badge
  - Sleep hours

#### **Health Table**
- **List**: Last 30 `Health Entries`
- **Columns**: Date, sleep hours, energy, mood, workout, steps, weight
- **Sort**: By date descending
- **Actions**: Edit entry, view linked Day

#### **Performance Insights**
- **Link to Day**: Click on a high-energy day → see `Day.top_3_outcomes`
- **Correlations** (spec only, implement later):
  - Average sleep vs. average energy
  - Workout days vs. task completion rate
  - Mood trends over time

#### **Weekly/Monthly Summary**
- **Metrics**:
  - Average sleep last 7/30 days
  - Workout frequency
  - Average energy level
  - Weight trend (if logged)

**Navigation**:
- Back to Command Center
- Link to Nutrition Dashboard

---

### 3.5. **Nutrition Dashboard**

**Purpose**: Track meals, macros, and nutrition trends.

**Views**:

#### **Today's Meals**
- **List**: All `Nutrition Entries` for today
- **For each meal, show**:
  - Meal type, time, description
  - Calories, protein, carbs, fats
  - Tags
- **Summary Card**: Total calories, total protein, total carbs, total fats for today

#### **Weekly Summary**
- **Table**: Last 7 days
- **Columns**: Date, total calories, total protein, meal count
- **Visual**: Simple bar chart for daily calories

#### **Meal Library** (optional future feature)
- **Saved meals**: Pre-log common meals
- **Tags filter**: View all `high_protein`, `cheat`, `clean` meals

#### **Add/Edit Meal**
- **Form**: Meal type, description, macros, tags, context
- **Actions**: Save, delete

**Navigation**:
- Back to Command Center
- Link to Health Hub

---

### 3.6. **SOP / Knowledge Hub**

**Purpose**: Central repository for SOPs, prompts, playbooks, and knowledge artifacts.

**Views**:

#### **Knowledge Library**
- **Tabs/Filters**:
  1. **All Docs**
  2. **SOPs** (`type = sop`)
  3. **AI Prompts** (`type = prompt`)
  4. **Playbooks** (`type = playbook`)
  5. **Specs** (`type = spec`)
- **For each doc, show**:
  - Title, type, status, venture, tags
- **Search**: By title, tags, domain, venture

#### **Doc Detail View**
- **Header**: Title, type, status, venture, project
- **Body**: Rich text / markdown display
- **Metadata**: Created at, updated at, external ID
- **Actions**: Edit, archive, delete, link to tasks/projects

#### **Venture-Specific Docs**
- **Filter**: `venture_id = selected_venture`
- **Group by**: Type (SOPs, Prompts, etc.)

**Navigation**:
- Back to Command Center
- Link to Venture HQ (for venture-specific docs)

---

## 4. AUTOMATION & LOGIC LAYER

Define automation rules and system behaviors:

### 4.1. **Daily Day Record Auto-Creation**

**Trigger**: First load of Command Center each day (or cron at 6 AM Dubai time)

**Logic**:
```
IF no Day record exists for today:
  CREATE Day with:
    - id = "day_YYYY_MM_DD"
    - date = today
    - title = "YYYY-MM-DD – [Untitled]"
    - top_3_outcomes = null
    - one_thing_to_ship = null
    - mood = null
    - primary_venture_focus = null
```

**Result**: Ensures every day has a canonical `Day` record.

---

### 4.2. **Task Surfacing: Today's Tasks**

**Trigger**: Load Command Center "Today" view

**Logic**:
```
SELECT * FROM tasks
WHERE status NOT IN ('done', 'cancelled')
  AND (
    focus_date = today
    OR due_date = today
    OR day_id = today's_day_id
  )
ORDER BY priority ASC, focus_slot ASC
```

**Grouping**:
- Group by `venture_id`, then by `project_id` or `type`
- Display venture name, project name, task title

---

### 4.3. **Capture → Task Conversion**

**Trigger**: User clicks "Convert to Task" on a Capture Item

**Logic**:
```
1. CREATE Task with:
   - title = Capture.title
   - status = 'next'
   - type = inferred from Capture.domain (default 'business')
   - venture_id = Capture.venture_id (if set)
   - project_id = Capture.project_id (if set)
   - notes = Capture.notes

2. UPDATE Capture SET:
   - linked_task_id = new_task.id
   - clarified = true
   - clarified_at = now()

3. NOTIFY user: "Capture converted to task: [task_title]"
```

**Result**: Capture item is marked as clarified, task is created and ready to schedule.

---

### 4.4. **Health Entry → Day Linking**

**Trigger**: User logs a Health Entry

**Logic**:
```
1. IF Day record for Health.date does NOT exist:
     CREATE Day for Health.date

2. SET Health.day_id = Day.id
```

**Result**: Every Health Entry is always linked to a Day.

---

### 4.5. **Nutrition Entry → Day Linking**

**Trigger**: User logs a Nutrition Entry

**Logic**:
```
1. IF Day record for Nutrition.date does NOT exist:
     CREATE Day for Nutrition.date

2. SET Nutrition.day_id = Day.id
```

**Result**: Every Nutrition Entry is always linked to a Day.

---

### 4.6. **Project Status Auto-Suggest**

**Trigger**: Task status changes to `done`

**Logic**:
```
1. GET all tasks for Task.project_id

2. IF all tasks are status = 'done':
     SUGGEST: "All tasks complete. Mark project as done?"
     OPTION: Auto-set Project.status = 'done'
     OPTION: Set Project.actual_end_date = today

3. ELSE:
     Calculate progress: (done_tasks / total_tasks) * 100
     DISPLAY: "Project X is Y% complete"
```

**Result**: Proactive project completion tracking.

---

### 4.7. **Task → Day Auto-Linking**

**Trigger**: User schedules a task to a specific focus slot on a specific day (via Deep Work Calendar)

**Logic**:
```
1. GET or CREATE Day for selected date

2. UPDATE Task SET:
   - day_id = Day.id
   - focus_date = Day.date
   - focus_slot = selected_slot
```

**Result**: Tasks are explicitly linked to days when scheduled.

---

### 4.8. **Weekly Planning Auto-Prompt** (optional)

**Trigger**: Every Sunday at 6 PM Dubai time (cron)

**Logic**:
```
1. GET all tasks with:
   - status = 'next'
   - due_date IN next 7 days OR focus_date = null

2. NOTIFY user: "Weekly planning: X tasks need scheduling"

3. SUGGEST: Link to Deep Work & Planning view
```

**Result**: Proactive nudge to plan the week.

---

### 4.9. **Daily Reflection Reminder** (optional)

**Trigger**: Every day at 9 PM Dubai time (cron)

**Logic**:
```
1. GET today's Day record

2. IF Day.reflection_pm IS NULL:
     NOTIFY user: "Reflect on today: What did you ship? How do you feel?"
     LINK to Day edit form
```

**Result**: Encourages daily reflection habit.

---

## 5. INTEGRATION POINTS

Design SB-OS to be **integration-friendly** with external tools.

### 5.1. **Notion Integration**

**Purpose**: Mirror SB-OS entities to Notion databases for flexibility and mobile access.

**Approach**:
- Each SB-OS entity maps to a Notion database
- Use Notion API to sync bidirectionally
- Store `external_id` (Notion page ID) on each SB-OS record
- Store SB-OS ID in Notion as custom property

**Entities to Sync**:
- Ventures → Notion "Ventures" database
- Projects → Notion "Projects" database (with relation to Ventures)
- Tasks → Notion "Tasks" database (with relations to Projects, Ventures, Days)
- Days → Notion "Daily Logs" database
- Docs/SOPs → Notion "Knowledge Hub" database

**Sync Strategy**:
- **Push**: When entity is created/updated in SB-OS, push to Notion
- **Pull**: Webhook from Notion on update → update SB-OS
- **Conflict resolution**: Last-write-wins or manual review

**Implementation Notes**:
- Use `Integration Record` entity to track sync status
- Implement sync queue (e.g., via n8n, Zapier, or custom worker)

---

### 5.2. **Supabase / PostgreSQL**

**Purpose**: Use Supabase as primary database backend for SB-OS.

**Approach**:
- Implement all entities as Supabase (PostgreSQL) tables
- Use foreign keys for relations
- Use Supabase Auth for user authentication (single-user for now, multi-user later)
- Use Supabase Realtime for live updates (optional)

**Schema Mapping**:
- Convert entity schemas (Section 2) directly to SQL tables
- Use `uuid` for IDs (or `varchar` for semantic IDs like `venture_mydub`)
- Use `timestamptz` for all timestamps
- Use `jsonb` for arrays and JSON fields

**Migrations**:
- Use Supabase migrations to version schema changes
- Keep migrations in version control

---

### 5.3. **Google Calendar Integration**

**Purpose**: Sync tasks and deep work sessions to Google Calendar.

**Approach**:
- Map `Task` with `focus_date` + `focus_slot` → Google Calendar event
- Map `Day` blocks (e.g., "Morning Deep Work") → Calendar time blocks
- Use Google Calendar API to create/update/delete events
- Store `gcal_event_id` in `Integration Record`

**Sync Strategy**:
- **Push**: When task is scheduled to a focus slot, create GCal event
- **Pull**: GCal event updated → update task `focus_date` or `est_effort`
- **Delete**: Task marked done or rescheduled → update or delete GCal event

**Event Format**:
```
Title: [Venture] Task Title
Description: Task notes + link to SB-OS task
Start: focus_date + focus_slot start time
Duration: est_effort
Color: Venture-specific color
```

---

### 5.4. **Automation Tools (n8n, Zapier, Make)**

**Purpose**: Trigger workflows and external actions based on SB-OS events.

**Events to Expose**:
- `task.created`
- `task.status_changed`
- `task.completed`
- `project.created`
- `project.status_changed`
- `day.created`
- `health.logged`
- `nutrition.logged`
- `capture.created`
- `capture.clarified`

**Webhooks**:
- SB-OS backend sends webhook POST to configured URL on each event
- Payload: `{ event: "task.created", entity: { ...task_data } }`

**Example Use Cases**:
- Notify Telegram when high-priority task is created
- Send weekly summary email every Sunday
- Log completed tasks to Google Sheets for analytics
- Auto-create Notion pages when new project is added

---

### 5.5. **WhatsApp / Telegram Quick Capture**

**Purpose**: Capture ideas and tasks via messaging apps.

**Approach**:
- Use Twilio (WhatsApp) or Telegraf (Telegram) to receive messages
- Parse message text for intent: "Add task: ..." or "Idea: ..."
- Create `Capture Item` with source = `whatsapp` or `telegram`
- Reply with confirmation: "Captured! Clarify in SB-OS."

**Implementation**:
- Webhook endpoint: `/api/capture/whatsapp` or `/api/capture/telegram`
- Simple NLP or keyword matching (e.g., starts with "Task:", "Idea:", "Note:")
- Link to user via phone number or Telegram ID

---

## 6. IMPLEMENTATION ROADMAP

### **Phase 1: Core Engine (MVP)**

**Duration**: 2-3 weeks (estimate for guidance, not a timeline)

**Goal**: Build the foundation—core entities, Command Center, and basic task management.

**Scope**:
1. **Backend**:
   - Set up Supabase project and database
   - Implement entities: `User`, `Venture`, `Project`, `Task`, `Capture`, `Day`
   - Define schemas as SQL tables with foreign keys
   - Build REST API endpoints (CRUD for all entities)
   - Implement authentication (Supabase Auth)

2. **Frontend**:
   - Build **Command Center (Home)** with:
     - Today Overview (Day title, Top 3, One Thing to Ship)
     - Today's Tasks (filtered, grouped by venture)
     - Capture Inbox (list, convert to task action)
     - This Week Preview
   - Build **Venture HQ** with:
     - Venture dashboard (list of ventures)
     - Venture detail (projects board, tasks list)
   - Basic navigation between modules

3. **Core Automations**:
   - Daily Day record auto-creation
   - Task surfacing logic ("Today's Tasks")
   - Capture → Task conversion flow

**Done When**:
- Sayed can log in, see today's tasks, create/edit tasks and projects, convert captures to tasks
- Data persists in Supabase
- UI is clean and functional (shadcn/ui components)

---

### **Phase 2: Health & Nutrition**

**Duration**: 1-2 weeks

**Goal**: Add health and nutrition tracking with daily logs.

**Scope**:
1. **Backend**:
   - Implement entities: `Health Entry`, `Nutrition Entry`
   - Link to `Day` entity
   - Build API endpoints for CRUD

2. **Frontend**:
   - Build **Health & Performance Hub** with:
     - Health calendar (30-day view)
     - Health table (last 30 entries)
     - Weekly/monthly summary cards
   - Build **Nutrition Dashboard** with:
     - Today's meals (list, add/edit form)
     - Weekly summary (total calories, protein)
   - Add health/nutrition snapshots to **Command Center**

3. **Automations**:
   - Health Entry → Day linking
   - Nutrition Entry → Day linking

**Done When**:
- Sayed can log daily health metrics and meals
- Health and nutrition data show up on Command Center
- Health Hub and Nutrition Dashboard are functional

---

### **Phase 3: Knowledge Hub (SOPs & Docs)**

**Duration**: 1 week

**Goal**: Add knowledge management for SOPs, prompts, and playbooks.

**Scope**:
1. **Backend**:
   - Implement entity: `Doc / SOP / Prompt`
   - Link to `Venture` and `Project`
   - Build API endpoints for CRUD
   - Add full-text search (Supabase `tsvector` or Algolia)

2. **Frontend**:
   - Build **SOP / Knowledge Hub** with:
     - Knowledge library (tabs: All, SOPs, Prompts, Playbooks, Specs)
     - Search by title, tags, venture
     - Doc detail view (rich text display)
     - Create/edit doc form (markdown or rich text editor)
   - Link docs to tasks and projects (optional: in task detail view)

3. **Automations**:
   - None for this phase (static content)

**Done When**:
- Sayed can create, edit, and search SOPs and prompts
- Docs are linked to ventures and projects
- Knowledge Hub is accessible from Command Center navigation

---

### **Phase 4: Deep Work & Automation**

**Duration**: 1-2 weeks

**Goal**: Add deep work planning and core automations.

**Scope**:
1. **Backend**:
   - Add `focus_slot` logic and validation
   - Build API for task scheduling (assign task to day + slot)

2. **Frontend**:
   - Build **Deep Work & Planning** module with:
     - Deep Work Queue (tasks filtered by `type = deep_work`)
     - Weekly Deep Work Calendar (7 days × focus slots grid)
     - Drag-and-drop task scheduling
     - Focus session timer (optional)
   - Add focus slot indicators to Command Center tasks

3. **Automations**:
   - Task → Day auto-linking when scheduled
   - Project status auto-suggest (when all tasks done)
   - Weekly planning auto-prompt (cron job)
   - Daily reflection reminder (cron job)

**Done When**:
- Sayed can plan deep work sessions on a weekly calendar
- Tasks auto-link to days when scheduled
- Proactive reminders for planning and reflection work

---

### **Phase 5: Integrations & Polish**

**Duration**: 2-3 weeks

**Goal**: Connect to external systems and polish the UX.

**Scope**:
1. **Backend**:
   - Implement `Integration Record` entity
   - Build Notion sync (bidirectional for Ventures, Projects, Tasks)
   - Build Google Calendar sync (push tasks to GCal)
   - Build webhook events for automation tools
   - Build WhatsApp/Telegram quick capture webhook

2. **Frontend**:
   - Add integration settings UI (connect Notion, GCal)
   - Show sync status in entity detail views
   - Add daily quote of the day to Command Center
   - Polish UI/UX (animations, loading states, error handling)
   - Add analytics/insights to Health Hub (correlations, trends)

3. **Automations**:
   - All integrations from Section 5

**Done When**:
- Notion, Google Calendar, and messaging quick capture are live
- Sayed can use SB-OS as single source of truth
- System feels polished and delightful

---

### **Phase 6: Personalization & Advanced Features**

**Duration**: Ongoing iteration

**Goal**: Tailor SB-OS to Sayed's specific workflows and add venture-specific views.

**Scope**:
1. **Venture-Specific Dashboards**:
   - Custom views for Trading (P&L tracking, trades log)
   - Custom views for MyDub.ai (content calendar, publishing metrics)
   - Custom views for Aivant Realty (leads, properties, deals)

2. **Advanced Automations**:
   - AI-powered task prioritization (e.g., suggest P0 tasks based on patterns)
   - Smart scheduling (suggest focus slots based on energy levels)
   - Auto-tag tasks with domains/types based on title

3. **Mobile App** (optional):
   - React Native or PWA for mobile access
   - Quick capture via mobile
   - Daily review on the go

4. **Analytics & Insights**:
   - Task completion trends by venture
   - Health vs. performance correlations
   - Time tracking and effort analysis
   - Venture ROI dashboard (future: link to finance data)

**Done When**:
- SB-OS feels like a truly personalized productivity engine for Sayed
- Each venture has tailored views and metrics
- System evolves with Sayed's changing needs

---

## 7. DATA SCHEMA SUMMARY (IMPLEMENTATION-READY)

Below are the SQL table definitions for direct implementation in PostgreSQL/Supabase.

### Table: `users`

```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Dubai',
  default_focus_slots JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Table: `ventures`

```sql
CREATE TABLE ventures (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  one_liner TEXT,
  domain VARCHAR(50),
  primary_focus TEXT,
  vision TEXT,
  current_milestone TEXT,
  health_metric VARCHAR(255),
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT status_check CHECK (status IN ('active', 'development', 'paused', 'archived')),
  CONSTRAINT domain_check CHECK (domain IN ('saas', 'media', 'realty', 'trading', 'personal', 'other'))
);
```

---

### Table: `projects`

```sql
CREATE TABLE projects (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  venture_id VARCHAR(50) REFERENCES ventures(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_started',
  category VARCHAR(50),
  priority VARCHAR(10),
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  outcome TEXT,
  notes TEXT,
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT status_check CHECK (status IN ('not_started', 'active', 'on_hold', 'done', 'cancelled')),
  CONSTRAINT category_check CHECK (category IN ('product', 'marketing', 'operations', 'finance', 'research')),
  CONSTRAINT priority_check CHECK (priority IN ('P0', 'P1', 'P2', 'P3'))
);
```

---

### Table: `tasks`

```sql
CREATE TABLE tasks (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'idea',
  priority VARCHAR(10),
  type VARCHAR(50),
  domain VARCHAR(50),
  venture_id VARCHAR(50) REFERENCES ventures(id) ON DELETE SET NULL,
  project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
  day_id VARCHAR(50) REFERENCES days(id) ON DELETE SET NULL,
  due_date DATE,
  focus_date DATE,
  focus_slot VARCHAR(20),
  est_effort FLOAT,
  actual_effort FLOAT,
  notes TEXT,
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT status_check CHECK (status IN ('idea', 'next', 'in_progress', 'blocked', 'done', 'cancelled')),
  CONSTRAINT priority_check CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  CONSTRAINT type_check CHECK (type IN ('business', 'deep_work', 'admin', 'personal', 'learning')),
  CONSTRAINT domain_check CHECK (domain IN ('work', 'health', 'finance', 'learning', 'personal')),
  CONSTRAINT focus_slot_check CHECK (focus_slot IN ('morning', 'deep', 'afternoon', 'evening', 'anytime'))
);
```

---

### Table: `capture_items`

```sql
CREATE TABLE capture_items (
  id VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL,
  type VARCHAR(20),
  source VARCHAR(50),
  domain VARCHAR(50),
  venture_id VARCHAR(50) REFERENCES ventures(id) ON DELETE SET NULL,
  project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
  linked_task_id VARCHAR(50) REFERENCES tasks(id) ON DELETE SET NULL,
  clarified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  clarified_at TIMESTAMPTZ,
  CONSTRAINT type_check CHECK (type IN ('idea', 'task', 'note', 'link', 'reminder')),
  CONSTRAINT source_check CHECK (source IN ('brain', 'whatsapp', 'email', 'meeting', 'web')),
  CONSTRAINT domain_check CHECK (domain IN ('work', 'health', 'finance', 'learning', 'personal'))
);
```

---

### Table: `days`

```sql
CREATE TABLE days (
  id VARCHAR(50) PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  title VARCHAR(500),
  top_3_outcomes TEXT,
  one_thing_to_ship TEXT,
  reflection_am TEXT,
  reflection_pm TEXT,
  mood VARCHAR(20),
  primary_venture_focus VARCHAR(50) REFERENCES ventures(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT mood_check CHECK (mood IN ('low', 'medium', 'high', 'peak'))
);
```

---

### Table: `health_entries`

```sql
CREATE TABLE health_entries (
  id VARCHAR(50) PRIMARY KEY,
  day_id VARCHAR(50) REFERENCES days(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_hours FLOAT,
  sleep_quality VARCHAR(20),
  energy_level INT CHECK (energy_level BETWEEN 1 AND 5),
  mood VARCHAR(20),
  steps INT,
  workout_done BOOLEAN DEFAULT FALSE,
  workout_type VARCHAR(50),
  workout_duration INT,
  weight FLOAT,
  stress_level VARCHAR(20),
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sleep_quality_check CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
  CONSTRAINT mood_check CHECK (mood IN ('low', 'medium', 'high', 'peak')),
  CONSTRAINT workout_type_check CHECK (workout_type IN ('strength', 'cardio', 'yoga', 'sports', 'none')),
  CONSTRAINT stress_check CHECK (stress_level IN ('low', 'medium', 'high'))
);
```

---

### Table: `nutrition_entries`

```sql
CREATE TABLE nutrition_entries (
  id VARCHAR(50) PRIMARY KEY,
  day_id VARCHAR(50) REFERENCES days(id) ON DELETE CASCADE,
  datetime TIMESTAMPTZ NOT NULL,
  meal_type VARCHAR(20),
  description VARCHAR(500),
  calories FLOAT,
  protein_g FLOAT,
  carbs_g FLOAT,
  fats_g FLOAT,
  context VARCHAR(50),
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT meal_type_check CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  CONSTRAINT context_check CHECK (context IN ('home', 'restaurant', 'office', 'travel'))
);
```

---

### Table: `docs`

```sql
CREATE TABLE docs (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(50),
  domain VARCHAR(50),
  venture_id VARCHAR(50) REFERENCES ventures(id) ON DELETE SET NULL,
  project_id VARCHAR(50) REFERENCES projects(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft',
  body TEXT,
  tags TEXT[],
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT type_check CHECK (type IN ('sop', 'prompt', 'playbook', 'spec', 'note')),
  CONSTRAINT domain_check CHECK (domain IN ('venture_ops', 'marketing', 'product', 'personal', 'finance')),
  CONSTRAINT status_check CHECK (status IN ('draft', 'active', 'archived'))
);
```

---

### Table: `quotes`

```sql
CREATE TABLE quotes (
  id VARCHAR(50) PRIMARY KEY,
  text TEXT NOT NULL,
  author VARCHAR(255),
  category VARCHAR(50),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT category_check CHECK (category IN ('leverage', 'health', 'focus', 'strategy', 'mindset'))
);
```

---

### Table: `integration_records`

```sql
CREATE TABLE integration_records (
  id VARCHAR(50) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  external_system VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT entity_type_check CHECK (entity_type IN ('task', 'project', 'venture', 'day', 'doc', 'health', 'nutrition')),
  CONSTRAINT external_system_check CHECK (external_system IN ('notion', 'supabase', 'gcal', 'zapier')),
  CONSTRAINT sync_status_check CHECK (sync_status IN ('synced', 'pending', 'error'))
);
```

---

## 8. NEXT STEPS

This specification is **ready to hand to engineers or AI builders**.

### Recommended First Actions:

1. **Review & Validate**: Sayed reviews this spec, confirms alignment with vision, suggests tweaks.

2. **Set Up Infrastructure**:
   - Create Supabase project
   - Set up database with SQL schemas above
   - Set up frontend boilerplate (Next.js or Vite + React + shadcn/ui)

3. **Start Phase 1 Implementation**:
   - Build backend API (REST or GraphQL)
   - Build Command Center UI
   - Implement core automations

4. **Iterate**:
   - Ship Phase 1, gather feedback
   - Move to Phase 2, ship, iterate
   - Continuously refine based on real usage

---

## Summary

**SB-OS** is a world-class, opinionated productivity platform designed for **one founder: Sayed Baharun**.

It is:
- **Today-centric**: Every day is a unified hub.
- **Context-preserving**: Relations connect all entities.
- **Health-first**: Health and energy inform planning.
- **Multi-venture**: One brain, many businesses.
- **Execution-focused**: Capture → Clarify → Commit → Complete.

This specification provides:
- ✅ Core philosophy and design principles
- ✅ Full domain model (11 entities with schemas)
- ✅ 6 UX modules (Command Center, Venture HQ, Deep Work, Health, Nutrition, Knowledge Hub)
- ✅ 9 automation rules
- ✅ 5 integration points (Notion, Supabase, GCal, automation tools, messaging)
- ✅ 6-phase implementation roadmap
- ✅ SQL-ready schemas for immediate implementation

**SB-OS is not Notion. It is Sayed's personal operating system—built for precision, leverage, and defensibility.**

---

**End of Specification**
