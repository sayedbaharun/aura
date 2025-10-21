-- PRODUCTION DATABASE FIX
-- Run this in the Database Pane (Production tab) BEFORE deploying

-- Step 1: Fix appointments table
-- Drop default first, then change type, then add new default
ALTER TABLE appointments ALTER COLUMN appointment_duration DROP DEFAULT;

ALTER TABLE appointments
ALTER COLUMN appointment_duration
TYPE integer USING CASE
  WHEN appointment_duration ~ '^[0-9]+$' THEN appointment_duration::integer
  ELSE 60
END;

ALTER TABLE appointments ALTER COLUMN appointment_duration SET DEFAULT 60;

-- Step 2: Fix assistant_settings table
-- Drop default first, then change type, then add new default
ALTER TABLE assistant_settings ALTER COLUMN default_meeting_duration DROP DEFAULT;

ALTER TABLE assistant_settings
ALTER COLUMN default_meeting_duration
TYPE integer USING CASE
  WHEN default_meeting_duration ~ '^[0-9]+$' THEN default_meeting_duration::integer
  ELSE 60
END;

ALTER TABLE assistant_settings ALTER COLUMN default_meeting_duration SET DEFAULT 60;

-- Step 3: Verify the fix
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name IN ('appointments', 'assistant_settings')
AND column_name IN ('appointment_duration', 'default_meeting_duration')
ORDER BY table_name, column_name;

-- You should see:
-- appointments          | appointment_duration         | integer | 60
-- assistant_settings    | default_meeting_duration     | integer | 60
