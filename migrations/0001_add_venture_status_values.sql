-- Migration to add missing venture_status enum values
-- The database has: 'active', 'development', 'paused', 'archived'
-- The schema needs: 'archived', 'planning', 'building', 'on_hold', 'ongoing'

-- Add new enum values (PostgreSQL allows adding but not removing enum values easily)
ALTER TYPE venture_status ADD VALUE IF NOT EXISTS 'planning';
ALTER TYPE venture_status ADD VALUE IF NOT EXISTS 'building';
ALTER TYPE venture_status ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE venture_status ADD VALUE IF NOT EXISTS 'ongoing';

-- Note: Old values 'active', 'development', 'paused' are kept for backward compatibility
-- with existing data. You can optionally update existing records:
-- UPDATE ventures SET status = 'ongoing' WHERE status = 'active';
-- UPDATE ventures SET status = 'building' WHERE status = 'development';
-- UPDATE ventures SET status = 'on_hold' WHERE status = 'paused';
