-- Migration: Convert default_meeting_duration from TEXT to INTEGER
-- Run this manually before running `npm run db:push`

-- Step 1: Update appointmentDuration in appointments table (if it exists as text)
-- Check if column exists and is text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        AND column_name = 'appointment_duration'
        AND data_type = 'text'
    ) THEN
        -- Convert text to integer using CAST
        ALTER TABLE appointments
        ALTER COLUMN appointment_duration
        TYPE integer USING appointment_duration::integer;

        RAISE NOTICE 'Successfully converted appointments.appointment_duration to integer';
    ELSE
        RAISE NOTICE 'appointments.appointment_duration is already integer or does not exist';
    END IF;
END $$;

-- Step 2: Update defaultMeetingDuration in assistant_settings table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assistant_settings'
        AND column_name = 'default_meeting_duration'
        AND data_type = 'text'
    ) THEN
        -- Convert text to integer using CAST
        ALTER TABLE assistant_settings
        ALTER COLUMN default_meeting_duration
        TYPE integer USING default_meeting_duration::integer;

        RAISE NOTICE 'Successfully converted assistant_settings.default_meeting_duration to integer';
    ELSE
        RAISE NOTICE 'assistant_settings.default_meeting_duration is already integer or does not exist';
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
