# Hikma-OS REST API Documentation

Complete API reference for all Hikma-OS Phase 1 endpoints.

**Base URL**: `http://localhost:5000` (development) or your deployment URL

**Authentication**: Currently mock authentication for single-user (will be enhanced in future phases)

---

## Health Check

### GET /health

Check system health status.

**Response**: `200 OK` or `503 Service Unavailable`
```json
{
  "status": "healthy",
  "timestamp": "2025-11-23T10:00:00Z",
  "checks": {
    "database": true
  }
}
```

---

## Authentication

### GET /api/auth/user

Get current user information.

**Response**: `200 OK`
```json
{
  "id": "default-user",
  "email": "sayed@hikmadigital.com",
  "firstName": "Sayed",
  "lastName": "Baharun"
}
```

---

## Ventures

### GET /api/ventures

Get all ventures.

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "MyDub.ai",
    "status": "active",
    "oneLiner": "AI-driven Dubai lifestyle media",
    "domain": "media",
    "primaryFocus": "Automated news + content engine",
    "color": "#FF6B6B",
    "icon": "🚀",
    "notes": "Focus on content quality",
    "externalId": null,
    "createdAt": "2025-11-20T00:00:00Z",
    "updatedAt": "2025-11-20T00:00:00Z"
  }
]
```

### GET /api/ventures/:id

Get a single venture by ID.

**Parameters**:
- `id` (path): Venture UUID

**Response**: `200 OK` or `404 Not Found`

### POST /api/ventures

Create a new venture.

**Request Body**:
```json
{
  "name": "MyDub.ai",
  "status": "active",
  "oneLiner": "AI-driven Dubai lifestyle media",
  "domain": "media",
  "primaryFocus": "Automated news + content engine",
  "color": "#FF6B6B",
  "icon": "🚀"
}
```

**Validation**:
- `name` (required): string
- `status`: enum ("active" | "development" | "paused" | "archived"), default: "active"
- `domain`: enum ("saas" | "media" | "realty" | "trading" | "personal" | "other")

**Response**: `201 Created` or `400 Bad Request`

### PATCH /api/ventures/:id

Update a venture.

**Parameters**:
- `id` (path): Venture UUID

**Request Body**: Partial venture object

**Response**: `200 OK`, `404 Not Found`, or `400 Bad Request`

### DELETE /api/ventures/:id

Delete a venture.

**Parameters**:
- `id` (path): Venture UUID

**Response**: `200 OK` with `{"success": true}`

---

## Projects

### GET /api/projects

Get all projects, optionally filtered by venture.

**Query Parameters**:
- `venture_id` (optional): Filter by venture UUID

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "MyDub.ai v2.0 Launch",
    "ventureId": "venture-uuid",
    "status": "active",
    "category": "product",
    "priority": "P0",
    "startDate": "2025-11-01",
    "targetEndDate": "2025-12-15",
    "actualEndDate": null,
    "outcome": "v2 live with 10k MAU",
    "notes": "Focus on UI/UX refresh",
    "externalId": null,
    "createdAt": "2025-11-01T00:00:00Z",
    "updatedAt": "2025-11-20T00:00:00Z"
  }
]
```

### GET /api/projects/:id

Get a single project by ID.

**Response**: `200 OK` or `404 Not Found`

### POST /api/projects

Create a new project.

**Request Body**:
```json
{
  "name": "MyDub.ai v2.0 Launch",
  "ventureId": "venture-uuid",
  "status": "active",
  "category": "product",
  "priority": "P0",
  "startDate": "2025-11-01",
  "targetEndDate": "2025-12-15",
  "outcome": "v2 live with 10k MAU"
}
```

**Validation**:
- `name` (required): string
- `status`: enum ("not_started" | "active" | "on_hold" | "done" | "cancelled")
- `category`: enum ("product" | "marketing" | "operations" | "finance" | "research")
- `priority`: enum ("P0" | "P1" | "P2" | "P3")

**Response**: `201 Created` or `400 Bad Request`

### PATCH /api/projects/:id

Update a project.

**Response**: `200 OK`, `404 Not Found`, or `400 Bad Request`

### DELETE /api/projects/:id

Delete a project.

**Response**: `200 OK` with `{"success": true}`

---

## Tasks

### GET /api/tasks

Get all tasks with optional filters.

**Query Parameters**:
- `venture_id` (optional): Filter by venture UUID
- `project_id` (optional): Filter by project UUID
- `status` (optional): Filter by status
- `focus_date` (optional): Filter by focus date (YYYY-MM-DD)
- `due_date` (optional): Filter by due date (YYYY-MM-DD)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Design new homepage hero section",
    "status": "in_progress",
    "priority": "P0",
    "type": "deep_work",
    "domain": "work",
    "ventureId": "venture-uuid",
    "projectId": "project-uuid",
    "dayId": "day_2025-11-23",
    "dueDate": "2025-11-25",
    "focusDate": "2025-11-23",
    "focusSlot": "deep",
    "estEffort": 3.0,
    "actualEffort": null,
    "notes": "Use Figma mockup",
    "tags": ["design", "ui"],
    "externalId": null,
    "createdAt": "2025-11-20T00:00:00Z",
    "updatedAt": "2025-11-23T00:00:00Z",
    "completedAt": null
  }
]
```

### GET /api/tasks/today

Get today's tasks (special filter).

Returns tasks where:
- `focus_date = today` OR `due_date = today` OR `day_id = today's day_id`
- AND `status NOT IN ('done', 'cancelled')`

**Response**: `200 OK`

### GET /api/tasks/:id

Get a single task by ID.

**Response**: `200 OK` or `404 Not Found`

### POST /api/tasks

Create a new task.

**Request Body**:
```json
{
  "title": "Design new homepage hero section",
  "status": "next",
  "priority": "P0",
  "type": "deep_work",
  "domain": "work",
  "ventureId": "venture-uuid",
  "projectId": "project-uuid",
  "focusDate": "2025-11-23",
  "focusSlot": "deep",
  "estEffort": 3.0
}
```

**Validation**:
- `title` (required): string
- `status`: enum ("idea" | "next" | "in_progress" | "blocked" | "done" | "cancelled"), default: "idea"
- `priority`: enum ("P0" | "P1" | "P2" | "P3")
- `type`: enum ("business" | "deep_work" | "admin" | "personal" | "learning")
- `domain`: enum ("work" | "health" | "finance" | "learning" | "personal")
- `focusSlot`: enum ("morning" | "deep" | "afternoon" | "evening" | "anytime")

**Response**: `201 Created` or `400 Bad Request`

### PATCH /api/tasks/:id

Update a task.

**Special Logic**: If `status` is changed to "done", `completedAt` is automatically set to current timestamp.

**Response**: `200 OK`, `404 Not Found`, or `400 Bad Request`

### DELETE /api/tasks/:id

Delete a task.

**Response**: `200 OK` with `{"success": true}`

---

## Capture Items

### GET /api/captures

Get all capture items, optionally filtered by clarified status.

**Query Parameters**:
- `clarified` (optional): Filter by clarified status (true | false)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Idea: Launch MyDub podcast series",
    "type": "idea",
    "source": "brain",
    "domain": "work",
    "ventureId": "venture-uuid",
    "projectId": null,
    "linkedTaskId": null,
    "clarified": false,
    "notes": "Could tie into new content strategy",
    "externalId": null,
    "createdAt": "2025-11-23T07:12:00Z",
    "updatedAt": "2025-11-23T07:12:00Z"
  }
]
```

### GET /api/captures/:id

Get a single capture item by ID.

**Response**: `200 OK` or `404 Not Found`

### POST /api/captures

Create a new capture item.

**Request Body**:
```json
{
  "title": "Idea: Launch MyDub podcast series",
  "type": "idea",
  "source": "brain",
  "domain": "work",
  "ventureId": "venture-uuid"
}
```

**Validation**:
- `title` (required): string
- `type`: enum ("idea" | "task" | "note" | "link" | "reminder")
- `source`: enum ("brain" | "whatsapp" | "email" | "meeting" | "web")
- `domain`: enum ("work" | "health" | "finance" | "learning" | "personal")

**Response**: `201 Created` or `400 Bad Request`

### PATCH /api/captures/:id

Update a capture item.

**Response**: `200 OK`, `404 Not Found`, or `400 Bad Request`

### POST /api/captures/:id/convert

Convert a capture item to a task.

**Request Body**: Partial task object (optional fields to override capture data)
```json
{
  "priority": "P1",
  "type": "deep_work",
  "focusDate": "2025-11-24"
}
```

**Special Logic**:
1. Creates a new task with capture data + provided overrides
2. Updates capture: sets `linkedTaskId` and `clarified = true`

**Response**: `200 OK`
```json
{
  "task": { /* created task object */ },
  "capture": { /* updated capture object */ }
}
```

### DELETE /api/captures/:id

Delete a capture item.

**Response**: `200 OK` with `{"success": true}`

---

## Days

### GET /api/days

Get all days with optional date range filter.

**Query Parameters**:
- `date_gte` (optional): Filter days >= this date (YYYY-MM-DD)
- `date_lte` (optional): Filter days <= this date (YYYY-MM-DD)

**Response**: `200 OK`
```json
[
  {
    "id": "day_2025-11-23",
    "date": "2025-11-23",
    "title": "MyDub v2 Deep Build",
    "top3Outcomes": "1. Hero section design\n2. API integration\n3. Test suite",
    "oneThingToShip": "Ship homepage redesign to staging",
    "reflectionAm": "Focus on deep work, no meetings",
    "reflectionPm": "Shipped hero section, blocked on API",
    "mood": "high",
    "primaryVentureFocus": "venture-uuid",
    "externalId": null,
    "createdAt": "2025-11-23T06:00:00Z",
    "updatedAt": "2025-11-23T21:30:00Z"
  }
]
```

### GET /api/days/today

Get today's day (auto-creates if doesn't exist).

**Special Logic**: If no Day record exists for today, automatically creates one with default values:
- `id`: "day_YYYY-MM-DD"
- `date`: today
- `title`: "YYYY-MM-DD – [Untitled]"

**Response**: `200 OK`

### GET /api/days/:date

Get a specific day by date.

**Parameters**:
- `date` (path): Date in YYYY-MM-DD format

**Response**: `200 OK` or `404 Not Found`

### POST /api/days

Create a new day.

**Request Body**:
```json
{
  "id": "day_2025-11-23",
  "date": "2025-11-23",
  "title": "MyDub v2 Deep Build",
  "top3Outcomes": "1. Hero section design\n2. API integration\n3. Test suite",
  "oneThingToShip": "Ship homepage redesign to staging"
}
```

**Validation**:
- `id` (required): string, format "day_YYYY-MM-DD"
- `date` (required): string, format YYYY-MM-DD
- `mood`: enum ("low" | "medium" | "high" | "peak")

**Response**: `201 Created` or `400 Bad Request`

### PATCH /api/days/:date

Update a day.

**Parameters**:
- `date` (path): Date in YYYY-MM-DD format

**Response**: `200 OK`, `404 Not Found`, or `400 Bad Request`

### DELETE /api/days/:date

Delete a day.

**Response**: `200 OK` with `{"success": true}`

---

## Health Entries

### GET /api/health

Get all health entries with optional date range filter.

**Query Parameters**:
- `date_gte` (optional): Filter entries >= this date (YYYY-MM-DD)
- `date_lte` (optional): Filter entries <= this date (YYYY-MM-DD)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "dayId": "day_2025-11-23",
    "date": "2025-11-23",
    "sleepHours": 7.5,
    "sleepQuality": "good",
    "energyLevel": 4,
    "mood": "high",
    "steps": 12543,
    "workoutDone": true,
    "workoutType": "strength",
    "workoutDuration": 45,
    "weight": 78.2,
    "stressLevel": "low",
    "tags": ["home", "recovery_day"],
    "notes": "Felt strong, morning workout set good tone",
    "externalId": null,
    "createdAt": "2025-11-23T21:00:00Z",
    "updatedAt": "2025-11-23T21:00:00Z"
  }
]
```

### GET /api/health/:id

Get a single health entry by ID.

**Response**: `200 OK` or `404 Not Found`

### POST /api/health

Create a new health entry.

**Special Logic**: Automatically creates Day record if it doesn't exist for the given date, then links the health entry to that day.

**Request Body**:
```json
{
  "date": "2025-11-23",
  "sleepHours": 7.5,
  "sleepQuality": "good",
  "energyLevel": 4,
  "mood": "high",
  "steps": 12543,
  "workoutDone": true,
  "workoutType": "strength",
  "workoutDuration": 45,
  "weight": 78.2
}
```

**Validation**:
- `date` (required): string, format YYYY-MM-DD
- `sleepQuality`: enum ("poor" | "fair" | "good" | "excellent")
- `energyLevel`: integer, 1-5 scale
- `mood`: enum ("low" | "medium" | "high" | "peak")
- `workoutType`: enum ("strength" | "cardio" | "yoga" | "sports" | "none")
- `stressLevel`: enum ("low" | "medium" | "high")

**Response**: `201 Created` or `400 Bad Request`

### PATCH /api/health/:id

Update a health entry.

**Response**: `200 OK`, `404 Not Found`, or `400 Bad Request`

---

## Nutrition Entries

### GET /api/nutrition

Get all nutrition entries with optional filters.

**Query Parameters**:
- `day_id` (optional): Filter by day ID
- `date` (optional): Filter by date (YYYY-MM-DD)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "dayId": "day_2025-11-23",
    "datetime": "2025-11-23T08:30:00Z",
    "mealType": "breakfast",
    "description": "Eggs, avocado, whole wheat toast",
    "calories": 450,
    "proteinG": 28,
    "carbsG": 35,
    "fatsG": 22,
    "context": "home",
    "tags": ["clean", "high_protein"],
    "notes": "Meal prep from Sunday",
    "externalId": null,
    "createdAt": "2025-11-23T08:45:00Z",
    "updatedAt": "2025-11-23T08:45:00Z"
  }
]
```

### GET /api/nutrition/:id

Get a single nutrition entry by ID.

**Response**: `200 OK` or `404 Not Found`

### POST /api/nutrition

Create a new nutrition entry.

**Special Logic**: Extracts date from `datetime`, automatically creates Day record if it doesn't exist, then links the nutrition entry to that day.

**Request Body**:
```json
{
  "datetime": "2025-11-23T08:30:00Z",
  "mealType": "breakfast",
  "description": "Eggs, avocado, whole wheat toast",
  "calories": 450,
  "proteinG": 28,
  "carbsG": 35,
  "fatsG": 22,
  "context": "home",
  "tags": ["clean", "high_protein"]
}
```

**Validation**:
- `datetime` (required): timestamp
- `mealType`: enum ("breakfast" | "lunch" | "dinner" | "snack")
- `context`: enum ("home" | "restaurant" | "office" | "travel")

**Response**: `201 Created` or `400 Bad Request`

### PATCH /api/nutrition/:id

Update a nutrition entry.

**Response**: `200 OK`, `404 Not Found`, or `400 Bad Request`

### DELETE /api/nutrition/:id

Delete a nutrition entry.

**Response**: `200 OK` with `{"success": true}`

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request (Validation Error)
```json
{
  "error": "Invalid task data",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["title"],
      "message": "Required"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Task not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create task"
}
```

---

## Notes for Frontend Integration

### Query Parameters Format
- All query parameters use snake_case (e.g., `venture_id`, `date_gte`)
- Boolean parameters use string values: `?clarified=true` or `?clarified=false`

### Date Formatting
- All dates use ISO format: `YYYY-MM-DD`
- All timestamps use ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

### Auto-Creation Logic
The following endpoints automatically create Day records if they don't exist:
- `GET /api/days/today`
- `POST /api/health`
- `POST /api/nutrition`

This ensures health and nutrition entries are always properly linked to their day.

### Task Completion
When updating a task status to "done", the API automatically sets `completedAt` to the current timestamp.

### Capture to Task Conversion
The `POST /api/captures/:id/convert` endpoint:
1. Creates a task using capture data as defaults
2. Allows overriding any capture field with request body data
3. Automatically sets `linkedTaskId` and `clarified = true` on the capture
4. Returns both the created task and updated capture

---

## Summary

**Total Endpoints**: 61

- **Health**: 1 endpoint
- **Auth**: 1 endpoint
- **Ventures**: 5 endpoints (CRUD)
- **Projects**: 5 endpoints (CRUD)
- **Tasks**: 6 endpoints (CRUD + today)
- **Captures**: 6 endpoints (CRUD + convert)
- **Days**: 6 endpoints (CRUD + today)
- **Health Entries**: 4 endpoints (CRUD, no delete)
- **Nutrition Entries**: 5 endpoints (CRUD)

All endpoints follow RESTful conventions and include comprehensive validation using Zod schemas.
