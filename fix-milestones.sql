-- Check if milestones table exists and see its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'milestones'
ORDER BY ordinal_position;

-- Drop the old milestones table (if it exists)
-- Uncomment this line after verifying the table structure above
-- DROP TABLE IF EXISTS milestones CASCADE;
