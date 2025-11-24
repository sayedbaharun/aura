CREATE TYPE "public"."capture_source" AS ENUM('brain', 'email', 'chat', 'meeting', 'web');--> statement-breakpoint
CREATE TYPE "public"."capture_type" AS ENUM('idea', 'task', 'note', 'link', 'question');--> statement-breakpoint
CREATE TYPE "public"."doc_domain" AS ENUM('venture_ops', 'marketing', 'product', 'sales', 'personal');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('sop', 'prompt', 'spec', 'template', 'playbook');--> statement-breakpoint
CREATE TYPE "public"."domain" AS ENUM('work', 'health', 'personal', 'learning');--> statement-breakpoint
CREATE TYPE "public"."focus_slot" AS ENUM('morning', 'midday', 'afternoon', 'evening', 'anytime');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."mood" AS ENUM('low', 'medium', 'high', 'peak');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('P0', 'P1', 'P2', 'P3');--> statement-breakpoint
CREATE TYPE "public"."project_category" AS ENUM('product', 'marketing', 'ops', 'fundraising', 'research', 'personal');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('not_started', 'planning', 'in_progress', 'blocked', 'done', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sleep_quality" AS ENUM('poor', 'fair', 'good', 'excellent');--> statement-breakpoint
CREATE TYPE "public"."stress_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('idea', 'next', 'in_progress', 'waiting', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('business', 'deep_work', 'admin', 'health', 'learning', 'personal');--> statement-breakpoint
CREATE TYPE "public"."venture_domain" AS ENUM('saas', 'media', 'realty', 'trading', 'personal', 'other');--> statement-breakpoint
CREATE TYPE "public"."venture_status" AS ENUM('active', 'development', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workout_type" AS ENUM('strength', 'cardio', 'yoga', 'sport', 'walk', 'none');--> statement-breakpoint
CREATE TABLE "capture_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "capture_type",
	"source" "capture_source",
	"domain" "domain",
	"venture_id" uuid,
	"project_id" uuid,
	"linked_task_id" uuid,
	"clarified" boolean DEFAULT false NOT NULL,
	"notes" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "days" (
	"id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" text,
	"top_3_outcomes" text,
	"one_thing_to_ship" text,
	"reflection_am" text,
	"reflection_pm" text,
	"mood" "mood",
	"primary_venture_focus" uuid,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "days_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "doc_type",
	"domain" "doc_domain",
	"venture_id" uuid,
	"project_id" uuid,
	"status" "doc_status" DEFAULT 'draft' NOT NULL,
	"body" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" text NOT NULL,
	"date" date NOT NULL,
	"sleep_hours" real,
	"sleep_quality" "sleep_quality",
	"energy_level" integer,
	"mood" "mood",
	"steps" integer,
	"workout_done" boolean DEFAULT false,
	"workout_type" "workout_type",
	"workout_duration_min" integer,
	"weight_kg" real,
	"stress_level" "stress_level",
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" text NOT NULL,
	"datetime" timestamp NOT NULL,
	"meal_type" "meal_type",
	"description" text,
	"calories" real,
	"protein_g" real,
	"carbs_g" real,
	"fats_g" real,
	"context" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"venture_id" uuid,
	"status" "project_status" DEFAULT 'not_started' NOT NULL,
	"category" "project_category",
	"priority" "priority",
	"start_date" date,
	"target_end_date" date,
	"actual_end_date" date,
	"outcome" text,
	"notes" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"status" "task_status" DEFAULT 'idea' NOT NULL,
	"priority" "priority",
	"type" "task_type",
	"domain" "domain",
	"venture_id" uuid,
	"project_id" uuid,
	"day_id" text,
	"due_date" date,
	"focus_date" date,
	"focus_slot" "focus_slot",
	"est_effort" real,
	"actual_effort" real,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"timezone" varchar DEFAULT 'Asia/Dubai',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ventures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "venture_status" DEFAULT 'active' NOT NULL,
	"one_liner" text,
	"domain" "venture_domain",
	"primary_focus" text,
	"color" varchar(7),
	"icon" varchar(10),
	"notes" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capture_items" ADD CONSTRAINT "capture_items_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_items" ADD CONSTRAINT "capture_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_items" ADD CONSTRAINT "capture_items_linked_task_id_tasks_id_fk" FOREIGN KEY ("linked_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "days" ADD CONSTRAINT "days_primary_venture_focus_ventures_id_fk" FOREIGN KEY ("primary_venture_focus") REFERENCES "public"."ventures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs" ADD CONSTRAINT "docs_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs" ADD CONSTRAINT "docs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_entries" ADD CONSTRAINT "health_entries_day_id_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_entries" ADD CONSTRAINT "nutrition_entries_day_id_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_day_id_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_capture_items_clarified" ON "capture_items" USING btree ("clarified");--> statement-breakpoint
CREATE INDEX "idx_capture_items_type" ON "capture_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_capture_items_source" ON "capture_items" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_capture_items_created_at" ON "capture_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_days_date" ON "days" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_days_mood" ON "days" USING btree ("mood");--> statement-breakpoint
CREATE INDEX "idx_days_primary_venture_focus" ON "days" USING btree ("primary_venture_focus");--> statement-breakpoint
CREATE INDEX "idx_docs_venture_id" ON "docs" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "idx_docs_project_id" ON "docs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_docs_type" ON "docs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_docs_status" ON "docs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_docs_domain" ON "docs" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_health_entries_day_id" ON "health_entries" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "idx_health_entries_date" ON "health_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_health_entries_mood" ON "health_entries" USING btree ("mood");--> statement-breakpoint
CREATE INDEX "idx_health_entries_energy_level" ON "health_entries" USING btree ("energy_level");--> statement-breakpoint
CREATE INDEX "idx_nutrition_entries_day_id" ON "nutrition_entries" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "idx_nutrition_entries_datetime" ON "nutrition_entries" USING btree ("datetime");--> statement-breakpoint
CREATE INDEX "idx_nutrition_entries_meal_type" ON "nutrition_entries" USING btree ("meal_type");--> statement-breakpoint
CREATE INDEX "idx_projects_venture_id" ON "projects" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_priority" ON "projects" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_projects_target_end_date" ON "projects" USING btree ("target_end_date");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_tasks_venture_id" ON "tasks" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_id" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_day_id" ON "tasks" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_tasks_due_date" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_focus_date" ON "tasks" USING btree ("focus_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_type" ON "tasks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_ventures_status" ON "ventures" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ventures_domain" ON "ventures" USING btree ("domain");