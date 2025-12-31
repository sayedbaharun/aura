-- Migration: Add missing user profile columns
-- These columns are in the schema but were not yet added to the database
-- Fixes 500 error on /api/settings/profile

-- Add profile settings columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_format" varchar DEFAULT 'yyyy-MM-dd';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "time_format" varchar DEFAULT '24h';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "week_starts_on" integer DEFAULT 0;

-- Add security tracking columns (for future 2FA support)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp;

-- Add 2FA/TOTP columns (for future implementation)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" varchar;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_backup_codes" jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_recovery_key_hash" varchar;

-- Add device/session tracking columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_known_ip" varchar(45);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_known_user_agent" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trusted_devices" jsonb;

-- Add password tracking
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;
