ALTER TABLE "project_ai_content_advisor_run" ADD COLUMN IF NOT EXISTS "triggered_by" text NOT NULL DEFAULT 'schedule';
