# Fix Railway 500 Errors - Database Migration Guide

## 🚨 Problem

All API endpoints are returning 500 errors because **the database tables don't exist yet**.

The migrations need to be run against the Railway PostgreSQL database to create all the tables.

---

## ✅ Solution: Run Database Migrations

### Option 1: From Your Local Machine (RECOMMENDED)

**Prerequisites**:
- Node.js installed locally
- Git clone of the repository
- Railway PostgreSQL credentials

**Steps**:

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/sayedbaharun/aura.git
   cd aura
   git checkout claude/hikma-os-platform-design-01VH17QGUpKvV7LqxZSrKaAQ
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** with Railway database credentials:
   ```bash
   DATABASE_URL=postgresql://postgres:SqysbRiTfTrmbUStgiPDktFqAPOgjyZT@nozomi.proxy.rlwy.net:48746/railway
   SESSION_SECRET=xop0oUPv4LyBQmboAGxR618EZxD4fulOqKrkfxqF96s=
   NODE_ENV=development
   ```

4. **Run the migration**:
   ```bash
   npm run db:push
   ```

   You should see output like:
   ```
   [✓] Pulling schema from database...
   [✓] Pushing schema to database...
   [✓] Done!
   ```

5. **Verify tables were created**:
   ```bash
   # The migration should create 8 tables:
   # - ventures
   # - projects
   # - tasks
   # - capture_items
   # - days
   # - health_entries
   # - nutrition_entries
   # - docs
   ```

6. **Refresh your Railway deployment URL**:
   - The 500 errors should be gone
   - You should see the SB-OS dashboard

---

### Option 2: From Railway Dashboard

If you can't run migrations locally, you can run them from Railway's console:

1. **Go to Railway Dashboard**:
   - Open https://railway.app
   - Navigate to your `aura` project

2. **Open the Service Console**:
   - Click on your deployment
   - Click "Console" tab
   - This gives you a terminal in your Railway container

3. **Run the migration**:
   ```bash
   npm run db:push
   ```

4. **Restart the service**:
   - Click "Restart" in Railway dashboard
   - Wait for deployment to complete

---

### Option 3: Using Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   railway link
   # Select your aura project
   ```

4. **Run migration through Railway**:
   ```bash
   railway run npm run db:push
   ```

---

## 🔍 Verify Migration Success

After running migrations, check that tables exist:

### Using psql (if you have it):
```bash
psql "postgresql://postgres:SqysbRiTfTrmbUStgiPDktFqAPOgjyZT@nozomi.proxy.rlwy.net:48746/railway"

# Then in psql:
\dt   # List all tables

# You should see:
# ventures
# projects
# tasks
# capture_items
# days
# health_entries
# nutrition_entries
# docs
# sessions (for express-session)
```

### Using Railway Dashboard:
1. Go to your PostgreSQL database in Railway
2. Click "Data" tab
3. You should see all 8 tables listed

---

## 🎯 After Migrations Complete

Once migrations are successful:

1. **Refresh the app**: https://aura-production-1f16.up.railway.app
2. **Test creating a venture**:
   - Click "Venture HQ" in the nav
   - Click "Add Venture"
   - Fill in the form
   - Save

3. **Test creating a task**:
   - Press Cmd+K (or Ctrl+K on Windows)
   - Type a task title
   - Select a venture
   - Save

4. **Test health logging**:
   - Go to Command Center (home page)
   - Use the health snapshot form
   - Log sleep hours, energy level
   - Save

If all these work, you're good to go! ✅

---

## 🐛 Troubleshooting

### Error: "relation \"ventures\" does not exist"
**Cause**: Migrations didn't run or failed
**Fix**: Run `npm run db:push` again

### Error: "permission denied for schema public"
**Cause**: Database user doesn't have permissions
**Fix**: Contact Railway support or create a new database

### Error: "connect ECONNREFUSED"
**Cause**: Wrong database URL or credentials
**Fix**: Double-check DATABASE_URL in Railway environment variables

### Error: "SSL connection required"
**Cause**: PostgreSQL requires SSL but it's not configured
**Fix**: Update DATABASE_URL to include `?sslmode=require`

---

## 📝 What the Migration Creates

The migration will create these tables with the following schemas:

### 1. ventures
- id (UUID, primary key)
- name, one_liner, domain, status
- color, icon
- created_at, updated_at

### 2. projects
- id (UUID, primary key)
- venture_id (foreign key → ventures)
- name, description, status
- start_date, target_date
- created_at, updated_at

### 3. tasks
- id (UUID, primary key)
- venture_id (foreign key → ventures)
- project_id (foreign key → projects)
- title, description, status, priority
- due_date, start_date, completed_at
- estimated_hours, actual_hours
- 20+ additional fields

### 4. capture_items
- id (UUID, primary key)
- content, clarified
- venture_id, project_id
- created_at

### 5. days
- id (text, primary key, format: "day_2025-11-24")
- date, title
- top_3_outcomes, one_thing_to_ship
- reflection, energy_level, focus_rating
- created_at, updated_at

### 6. health_entries
- id (UUID, primary key)
- day_id (foreign key → days)
- date, sleep_hours, sleep_quality
- energy_level, mood
- exercise_minutes, notes

### 7. nutrition_entries
- id (UUID, primary key)
- day_id (foreign key → days)
- date, meal_type
- food_description
- calories, protein, carbs, fat
- meal_time, notes

### 8. docs
- id (UUID, primary key)
- venture_id, project_id
- type (sop, prompt, playbook, case_study)
- title, content (markdown)
- status, domain
- created_at, updated_at

---

## 🚀 Next Steps After Migration

Once the database is working:

1. **Seed Initial Data**: Create your first venture, project, and tasks
2. **Test All Features**: Go through the functionality audit checklist
3. **Add Google Calendar Integration**: Connect Deep Work to your Google Calendar
4. **Start Using SB-OS**: Begin managing your productivity!

---

**Need help?** Let me know which migration option you chose and if you encounter any errors.
