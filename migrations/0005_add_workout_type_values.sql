-- Add missing workout_type enum values
-- The 'at_home' and 'walk' values were added to the schema but not migrated to the database

-- Add 'at_home' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'at_home' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workout_type')) THEN
        ALTER TYPE workout_type ADD VALUE 'at_home';
    END IF;
END $$;

-- Add 'walk' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'walk' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workout_type')) THEN
        ALTER TYPE workout_type ADD VALUE 'walk';
    END IF;
END $$;

-- Add 'sport' if it doesn't exist (in case it was also missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sport' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workout_type')) THEN
        ALTER TYPE workout_type ADD VALUE 'sport';
    END IF;
END $$;
