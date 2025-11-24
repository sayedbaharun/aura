-- FRESH DATABASE SETUP
-- Run this in Replit database console to start from scratch

-- ⚠️ WARNING: This will delete ALL data!
-- Only run this if you're sure you want to start fresh

-- Drop all tables
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS pending_confirmations CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS assistant_settings CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Verify all tables are gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

-- You should see an empty result or just system tables
-- Now run: npm run db:push
