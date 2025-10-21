# 🚨 DEPLOYMENT FIX: Duration Column Type Migration

## Problem
When deploying, you get this error:
```
Failed to run database migration statement
ALTER TABLE "appointments" ALTER COLUMN "appointment_duration" SET DATA TYPE integer;
column "appointment_duration" cannot be cast automatically to type integer
```

This happens because:
1. **Development database**: Has INTEGER columns (already fixed) ✅
2. **Production database**: Still has TEXT columns ❌
3. **Deployment**: Tries to ALTER TEXT → INTEGER without USING clause = FAILS

---

## Solution: Fix Production Database Before Deploying

### Option 1: Using Replit Database Pane (RECOMMENDED)

1. **Open Database Pane** in Replit
2. **Switch to Production** database (not Development)
3. **Run this SQL** in the Query tab:

```sql
-- Fix appointments table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'appointment_duration'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE appointments
        ALTER COLUMN appointment_duration
        TYPE integer USING CASE
            WHEN appointment_duration ~ '^\d+$' THEN appointment_duration::integer
            ELSE 60
        END;
        
        ALTER TABLE appointments
        ALTER COLUMN appointment_duration SET DEFAULT 60;
        
        RAISE NOTICE 'Successfully converted appointments.appointment_duration to integer';
    ELSE
        RAISE NOTICE 'appointments.appointment_duration is already integer';
    END IF;
END $$;

-- Fix assistant_settings table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assistant_settings'
        AND column_name = 'default_meeting_duration'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE assistant_settings
        ALTER COLUMN default_meeting_duration
        TYPE integer USING CASE
            WHEN default_meeting_duration ~ '^\d+$' THEN default_meeting_duration::integer
            ELSE 60
        END;
        
        ALTER TABLE assistant_settings
        ALTER COLUMN default_meeting_duration SET DEFAULT 60;
        
        RAISE NOTICE 'Successfully converted assistant_settings.default_meeting_duration to integer';
    ELSE
        RAISE NOTICE 'assistant_settings.default_meeting_duration is already integer';
    END IF;
END $$;

-- Verify the changes
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('appointments', 'assistant_settings')
AND column_name IN ('appointment_duration', 'default_meeting_duration')
ORDER BY table_name, column_name;
```

4. **Verify** you see:
```
table_name          | column_name                | data_type | column_default
--------------------|----------------------------|-----------|---------------
appointments        | appointment_duration       | integer   | 60
assistant_settings  | default_meeting_duration   | integer   | 60
```

5. **Now deploy** - it should work! ✅

---

### Option 2: Using Deployment Script (Alternative)

If you want to automate this during deployment:

1. **Create** `scripts/production-migration.ts`:

```typescript
import { neon } from "@neondatabase/serverless";

async function fixProductionDatabase() {
  // Use production DATABASE_URL from deployment environment
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔄 Fixing production database schema...\n");

  try {
    // Check current state
    const checkQuery = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('appointments', 'assistant_settings')
      AND column_name IN ('appointment_duration', 'default_meeting_duration')
    `;
    const current = await sql(checkQuery);
    console.log("Current state:", current);

    // Fix appointments.appointment_duration
    await sql`
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'appointments'
              AND column_name = 'appointment_duration'
              AND data_type = 'text'
          ) THEN
              ALTER TABLE appointments
              ALTER COLUMN appointment_duration
              TYPE integer USING CASE
                  WHEN appointment_duration ~ '^\\d+$' THEN appointment_duration::integer
                  ELSE 60
              END;
              
              ALTER TABLE appointments
              ALTER COLUMN appointment_duration SET DEFAULT 60;
              
              RAISE NOTICE 'Fixed appointments.appointment_duration';
          END IF;
      END $$;
    `;

    // Fix assistant_settings.default_meeting_duration
    await sql`
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'assistant_settings'
              AND column_name = 'default_meeting_duration'
              AND data_type = 'text'
          ) THEN
              ALTER TABLE assistant_settings
              ALTER COLUMN default_meeting_duration
              TYPE integer USING CASE
                  WHEN default_meeting_duration ~ '^\\d+$' THEN default_meeting_duration::integer
                  ELSE 60
              END;
              
              ALTER TABLE assistant_settings
              ALTER COLUMN default_meeting_duration SET DEFAULT 60;
              
              RAISE NOTICE 'Fixed assistant_settings.default_meeting_duration';
          END IF;
      END $$;
    `;

    // Verify
    const final = await sql(checkQuery);
    console.log("\n✅ Fixed state:", final);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

fixProductionDatabase();
```

2. **Add to package.json**:
```json
"scripts": {
  "production:fix": "tsx scripts/production-migration.ts"
}
```

3. **Before deploying**, run locally against production:
```bash
DATABASE_URL="<your-production-url>" npm run production:fix
```

---

## Why This Happens

**Drizzle's `db:push` behavior:**
- Works great for adding new columns, tables, indexes
- **Fails** for data type changes that need explicit casting
- PostgreSQL needs `USING` clause to convert TEXT → INTEGER
- Deployment auto-runs schema sync without `USING` clause = error

**Our fix:**
- Uses `CASE WHEN` to safely convert numeric text to integers
- Falls back to default value (60) for any invalid data
- Sets proper default value
- Only runs if column is still TEXT (idempotent)

---

## After Fixing Production

Once you've fixed the production database:

1. ✅ Development database: INTEGER
2. ✅ Production database: INTEGER
3. ✅ Drizzle schema: INTEGER
4. ✅ **Deployment will succeed!**

---

## Prevention for Future Schema Changes

**For data type changes:**
1. **Always** test in development first
2. **Manually fix** production database before deploying
3. **Use USING clause** for type conversions
4. **Consider** using Replit's Deployment Previews (beta) to test first

**For other schema changes:**
- Adding columns with defaults → safe ✅
- Adding tables → safe ✅
- Adding indexes → safe ✅
- Removing columns → requires care ⚠️
- Renaming columns → requires care ⚠️

---

## Quick Checklist

Before your next deployment:

- [ ] Run SQL fix on production database (Option 1)
- [ ] Verify both columns are INTEGER in production
- [ ] Test deployment
- [ ] Monitor deployment logs
- [ ] Verify app works in production

---

*This fix ensures your production database matches the schema before deployment attempts to sync it.*
