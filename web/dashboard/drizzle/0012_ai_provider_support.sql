ALTER TABLE "project_ai_chatbot"
ADD COLUMN "provider" text DEFAULT 'microsoft-foundry' NOT NULL,
ADD COLUMN "provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_ai_catalogue"
ADD COLUMN "provider" text DEFAULT 'microsoft-foundry' NOT NULL,
ADD COLUMN "provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_ai_author_dialog"
ADD COLUMN "provider" text DEFAULT 'microsoft-foundry' NOT NULL,
ADD COLUMN "provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_config"
ADD COLUMN "provider" text DEFAULT 'microsoft-foundry' NOT NULL,
ADD COLUMN "provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "project_ai_chatbot"
SET "provider_config" = jsonb_build_object(
  'project_endpoint', "project_endpoint",
  'agent_id', "agent_id"
);
--> statement-breakpoint
UPDATE "project_ai_catalogue"
SET "provider_config" = jsonb_build_object(
  'project_endpoint', coalesce("api_url", ''),
  'agent_id', coalesce("agent_id", '')
);
