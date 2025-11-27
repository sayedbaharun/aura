-- Migration: Add AI assistant settings to user_preferences
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "ai_instructions" text;
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "ai_context" jsonb;
