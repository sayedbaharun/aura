# Hikma-OS Database Migration Guide

## Overview

This guide documents the complete database schema transformation from **Aura** to **Hikma-OS: The Sayed Baharun Productivity Engine**.

**Migration Date**: 2025-11-23
**Agent**: Agent 1 - Database Schema Transformation
**Status**: ✅ Schema created, ready for migration

---

## What Changed

### ✅ Entities KEPT (from Aura)

1. **users** - Simplified for single-user (Sayed Baharun)
   - Removed: Replit-specific fields
   - Added: `timezone` field (default: "Asia/Dubai")

2. **sessions** - Auth infrastructure (unchanged)

### ❌ Entities REMOVED (old Aura tables)

The following tables from the old Aura schema have been removed:

1. `whatsappMessages` - Not needed for Hikma-OS
2. `appointments` - Replaced by new `tasks` entity
3. `assistantSettings` - Not needed
4. `pendingConfirmations` - Not needed
5. `auditLogs` - Not needed for MVP
6. `eventAttendees` - Not needed for MVP
7. `emailSummaries` - Not needed for MVP
8. `notionOperations` - Not needed for MVP
9. `quickNotes` - Replaced by `captureItems`
10. `userProfiles` - Not needed for single-user MVP
11. `interactionHistory` - Not needed for MVP
12. `proactiveSuggestions` - Not needed for MVP

### ✨ Entities ADDED (new Hikma-OS tables)

1. **ventures** - Business/strategic initiatives (6 sample ventures)
2. **projects** - Concrete initiatives within ventures
3. **tasks** - Atomic units of execution (replaces appointments)
4. **captureItems** - Inbox for raw thoughts (replaces quickNotes)
5. **days** - Daily logs (central hub for each day)
6. **healthEntries** - Daily health metrics
7. **nutritionEntries** - Meal logs
8. **docs** - SOPs, prompts, playbooks, specs

---

## Schema Details

### Enums Defined

The new schema uses PostgreSQL enums for type safety:

- `venture_status`: active, development, paused, archived
- `venture_domain`: saas, media, realty, trading, personal, other
- `project_status`: not_started, planning, in_progress, blocked, done, archived
- `project_category`: product, marketing, ops, fundraising, research, personal
- `priority`: P0, P1, P2, P3
- `task_status`: idea, next, in_progress, waiting, done, cancelled
- `task_type`: business, deep_work, admin, health, learning, personal
- `domain`: work, health, personal, learning
- `focus_slot`: morning, midday, afternoon, evening, anytime
- `capture_type`: idea, task, note, link, question
- `capture_source`: brain, email, chat, meeting, web
- `mood`: low, medium, high, peak
- `sleep_quality`: poor, fair, good, excellent
- `workout_type`: strength, cardio, yoga, sport, walk, none
- `stress_level`: low, medium, high
- `meal_type`: breakfast, lunch, dinner, snack
- `doc_type`: sop, prompt, spec, template, playbook
- `doc_domain`: venture_ops, marketing, product, sales, personal
- `doc_status`: draft, active, archived

### Foreign Key Relationships

- `projects.ventureId` → `ventures.id` (CASCADE on delete)
- `tasks.ventureId` → `ventures.id` (SET NULL on delete)
- `tasks.projectId` → `projects.id` (SET NULL on delete)
- `tasks.dayId` → `days.id` (SET NULL on delete)
- `captureItems.ventureId` → `ventures.id` (SET NULL on delete)
- `captureItems.projectId` → `projects.id` (SET NULL on delete)
- `captureItems.linkedTaskId` → `tasks.id` (SET NULL on delete)
- `days.primaryVentureFocus` → `ventures.id` (SET NULL on delete)
- `healthEntries.dayId` → `days.id` (CASCADE on delete)
- `nutritionEntries.dayId` → `days.id` (CASCADE on delete)
- `docs.ventureId` → `ventures.id` (SET NULL on delete)
- `docs.projectId` → `projects.id` (SET NULL on delete)

### Indexes Created

Performance indexes have been added for:

- Foreign keys (venture_id, project_id, day_id)
- Status fields (venture.status, project.status, task.status, etc.)
- Date fields (focus_date, due_date, target_end_date, etc.)
- Priority fields
- Type/category fields
- Common query patterns

---

## Migration Steps

### Prerequisites

1. **Backup existing database** (if you have one)
   ```bash
   # Create backup of Aura database (if needed)
   pg_dump $DATABASE_URL > aura_backup_$(date +%Y%m%d).sql
   ```

2. **Set DATABASE_URL** environment variable
   ```bash
   export DATABASE_URL="postgresql://user:password@host:5432/database"
   ```

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Push New Schema to Database

```bash
npm run db:push
```

This will:
- Drop all old Aura tables
- Create all new Hikma-OS tables
- Create all enums
- Add all indexes
- Set up foreign key constraints

**Expected Output:**
```
✓ Pushing database changes
✓ Applying changes to database
✓ Schema pushed successfully
```

### Step 3: Seed Initial Data

```bash
tsx scripts/seed-hikma-os.ts
```

This will create:
- 1 user (Sayed Baharun)
- 6 ventures (MyDub.ai, Aivant Realty, GetMeToDub.ai, Hikma Digital, Arab Money Official, Trading)
- 3 sample projects
- 5 sample tasks
- 2 sample capture items
- 1 day record (today)
- 1 health entry
- 2 nutrition entries
- 1 sample SOP

**Expected Output:**
```
🌱 Starting Hikma-OS seed...
✅ User created: sayed@hikmadigital.com
✅ Created 6 ventures
✅ Created 3 projects
✅ Created 5 tasks
✅ Created 2 capture items
✅ Created day record: day_2025-11-23
✅ Created health entry for 2025-11-23
✅ Created 2 nutrition entries
✅ Created doc: MyDub.ai Content Publishing SOP

🎉 HIKMA-OS SEED COMPLETE!
```

---

## Verification

After migration, verify the schema:

```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Should show:
# - sessions
# - users
# - ventures
# - projects
# - tasks
# - capture_items
# - days
# - health_entries
# - nutrition_entries
# - docs

# Check venture count
SELECT COUNT(*) FROM ventures;
# Should return: 6

# Check task count
SELECT COUNT(*) FROM tasks;
# Should return: 5

# Exit
\q
```

---

## Rollback (if needed)

If you need to rollback to the old Aura schema:

```bash
# Restore from backup
psql $DATABASE_URL < aura_backup_YYYYMMDD.sql
```

**Note**: This will lose all Hikma-OS data!

---

## Next Steps

After successful migration:

1. ✅ **Agent 2: Backend API Routes** can start building REST API
2. ✅ **Agent 3: Command Center UI** can start building frontend
3. ✅ **Agent 4: Global Capture Modal** can be implemented
4. ✅ **Agent 5: Navigation & Layout** can be updated
5. ✅ **Agent 6: Automation & Backend Logic** can implement automations

---

## Sample Ventures Created

| Name | Domain | Status | Icon |
|------|--------|--------|------|
| MyDub.ai | Media | Active | 🌆 |
| Aivant Realty | Realty | Active | 🏢 |
| GetMeToDub.ai | SaaS | Development | ✈️ |
| Hikma Digital | SaaS | Active | ⚡ |
| Arab Money Official | Media | Active | 💰 |
| Trading | Trading | Active | 📈 |

---

## Database Schema ERD

```
┌─────────┐
│  users  │
└─────────┘

┌──────────┐     ┌──────────┐     ┌──────┐     ┌──────────────┐
│ ventures │────<│ projects │────<│ tasks│────<│ capture_items│
└──────────┘     └──────────┘     └──────┘     └──────────────┘
     │                │              │
     │                └──────────────┼────────┐
     │                               │        │
     ▼                               ▼        ▼
┌──────┐                      ┌─────────────────┐
│ days │─────────────────────<│ health_entries  │
└──────┘                      └─────────────────┘
     │
     └─────────────────────────<┌──────────────────┐
                                │nutrition_entries │
                                └──────────────────┘

┌──────┐
│ docs │
└──────┘
```

---

## File Changes

### Modified Files

1. **`/shared/schema.ts`** - Complete rewrite with new Hikma-OS schema
   - Lines: ~575 (was ~436)
   - Added: 18 enums, 8 new entities, relations
   - Removed: 12 old Aura entities

### New Files

1. **`/scripts/seed-hikma-os.ts`** - Seed script for initial data
2. **`/HIKMA_OS_MIGRATION_GUIDE.md`** - This document

---

## Troubleshooting

### Error: "Cannot find type definition file for 'node'"

This is a dev dependency issue, not related to the schema. The schema itself is valid.

**Solution**: The migration will still work. Ignore this error for now.

### Error: "drizzle-kit: not found"

**Solution**: Make sure you ran `npm install` first.

### Error: "DATABASE_URL is required"

**Solution**: Set the DATABASE_URL environment variable:
```bash
export DATABASE_URL="your-database-url-here"
```

Or create a `.env` file:
```bash
cp .env.example .env
# Edit .env and add your DATABASE_URL
```

---

## Success Criteria

✅ Migration is successful when:

1. All old Aura tables are removed
2. All new Hikma-OS tables are created
3. Seed script runs without errors
4. 6 ventures exist in database
5. Sample tasks, projects, and captures are created
6. Foreign key relationships work correctly
7. All indexes are created

---

## Support

For issues or questions:
- Review `/shared/schema.ts` for entity definitions
- Check `scripts/seed-hikma-os.ts` for sample data
- Refer to `/HIKMA_OS_SPEC.md` for design decisions

---

**Migration Status**: ✅ Ready to execute
**Last Updated**: 2025-11-23
