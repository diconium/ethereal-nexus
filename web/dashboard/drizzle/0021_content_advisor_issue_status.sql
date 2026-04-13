ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'open' NOT NULL;

