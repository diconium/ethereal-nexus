CREATE TABLE "project_ai_author_dialog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"dialog_definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_catalogue_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalogue_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{"items":[],"facets":{}}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_catalogue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text DEFAULT '' NOT NULL,
	"agent_id" text,
	"api_url" text,
	"agent_principal_id" text,
	"tenant_id" text,
	"activity_protocol_endpoint" text,
	"responses_api_endpoint" text,
	"show_in_sidebar" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"agent_id" text NOT NULL,
	"agent_principal_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"activity_protocol_endpoint" text NOT NULL,
	"responses_api_endpoint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_agent_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_agent_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent_config_id" uuid NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"issue_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"page_url" text NOT NULL,
	"page_title" text,
	"issue_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"suggestion" text DEFAULT '' NOT NULL,
	"reasoning" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"schedule_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_schedule_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"label" text NOT NULL,
	"cron" text DEFAULT '0 * * * *' NOT NULL,
	"focus_instruction" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_feature_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_ai_author_dialog" ADD CONSTRAINT "project_ai_author_dialog_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_author_dialog" ADD CONSTRAINT "project_ai_author_dialog_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_catalogue_version" ADD CONSTRAINT "project_ai_catalogue_version_catalogue_id_project_ai_catalogue_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."project_ai_catalogue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_catalogue" ADD CONSTRAINT "project_ai_catalogue_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_catalogue" ADD CONSTRAINT "project_ai_catalogue_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot" ADD CONSTRAINT "project_ai_chatbot_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot" ADD CONSTRAINT "project_ai_chatbot_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_config" ADD CONSTRAINT "project_ai_content_advisor_agent_config_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_config" ADD CONSTRAINT "project_ai_content_advisor_agent_config_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_run" ADD CONSTRAINT "project_ai_content_advisor_agent_run_run_id_project_ai_content_advisor_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."project_ai_content_advisor_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_run" ADD CONSTRAINT "project_ai_content_advisor_agent_run_agent_config_id_project_ai_content_advisor_agent_config_id_fk" FOREIGN KEY ("agent_config_id") REFERENCES "public"."project_ai_content_advisor_agent_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue" ADD CONSTRAINT "project_ai_content_advisor_issue_run_id_project_ai_content_advisor_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."project_ai_content_advisor_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue" ADD CONSTRAINT "project_ai_content_advisor_issue_agent_run_id_project_ai_content_advisor_agent_run_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."project_ai_content_advisor_agent_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_run" ADD CONSTRAINT "project_ai_content_advisor_run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_run" ADD CONSTRAINT "project_ai_content_advisor_run_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_run" ADD CONSTRAINT "project_ai_content_advisor_run_schedule_id_project_ai_content_advisor_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."project_ai_content_advisor_schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_schedule_page" ADD CONSTRAINT "project_ai_content_advisor_schedule_page_schedule_id_project_ai_content_advisor_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."project_ai_content_advisor_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_schedule" ADD CONSTRAINT "project_ai_content_advisor_schedule_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_schedule" ADD CONSTRAINT "project_ai_content_advisor_schedule_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_feature_flag" ADD CONSTRAINT "project_ai_feature_flag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_author_dialog_env_slug_idx" ON "project_ai_author_dialog" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE INDEX "project_ai_author_dialog_project_env_idx" ON "project_ai_author_dialog" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_catalogue_version_catalogue_idx" ON "project_ai_catalogue_version" USING btree ("catalogue_id");--> statement-breakpoint
CREATE INDEX "project_ai_catalogue_version_created_idx" ON "project_ai_catalogue_version" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_catalogue_env_slug_idx" ON "project_ai_catalogue" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE INDEX "project_ai_catalogue_project_env_idx" ON "project_ai_catalogue" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_env_slug_idx" ON "project_ai_chatbot" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_project_env_idx" ON "project_ai_chatbot" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_content_advisor_agent_env_key_idx" ON "project_ai_content_advisor_agent_config" USING btree ("environment_id","key");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_agent_project_env_idx" ON "project_ai_content_advisor_agent_config" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_agent_run_run_idx" ON "project_ai_content_advisor_agent_run" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_agent_run_agent_idx" ON "project_ai_content_advisor_agent_run" USING btree ("agent_config_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_run_idx" ON "project_ai_content_advisor_issue" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_agent_run_idx" ON "project_ai_content_advisor_issue" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_type_idx" ON "project_ai_content_advisor_issue" USING btree ("issue_type");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_run_project_env_idx" ON "project_ai_content_advisor_run" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_run_created_idx" ON "project_ai_content_advisor_run" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_schedule_page_idx" ON "project_ai_content_advisor_schedule_page" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_schedule_project_env_idx" ON "project_ai_content_advisor_schedule" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_feature_flag_project_key_idx" ON "project_ai_feature_flag" USING btree ("project_id","key");