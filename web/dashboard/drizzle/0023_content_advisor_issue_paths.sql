ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "page_path" text;

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "component_path" text;
