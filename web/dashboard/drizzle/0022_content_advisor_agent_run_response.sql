ALTER TABLE "project_ai_content_advisor_agent_run"
ADD COLUMN IF NOT EXISTS "response" text DEFAULT '' NOT NULL;
