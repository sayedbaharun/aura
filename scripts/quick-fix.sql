-- QUICK FIX: Run this SQL directly in your Replit database console
-- This will convert the TEXT columns to INTEGER immediately

-- Fix appointments.appointment_duration
ALTER TABLE appointments
ALTER COLUMN appointment_duration
TYPE integer USING CASE
  WHEN appointment_duration ~ '^[0-9]+$' THEN appointment_duration::integer
  ELSE 60
END;

-- Fix assistant_settings.default_meeting_duration
ALTER TABLE assistant_settings
ALTER COLUMN default_meeting_duration
TYPE integer USING CASE
  WHEN default_meeting_duration ~ '^[0-9]+$' THEN default_meeting_duration::integer
  ELSE 60
END;

-- Verify the fix
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('appointments', 'assistant_settings')
AND column_name IN ('appointment_duration', 'default_meeting_duration');
