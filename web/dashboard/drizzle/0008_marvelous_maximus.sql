CREATE TABLE "project_ai_chatbot_api_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"rate_limit_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_max_requests" integer DEFAULT 30 NOT NULL,
	"rate_limit_window_seconds" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_api_setting" ADD CONSTRAINT "project_ai_chatbot_api_setting_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_api_setting" ADD CONSTRAINT "project_ai_chatbot_api_setting_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_api_setting_env_idx" ON "project_ai_chatbot_api_setting" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_api_setting_project_env_idx" ON "project_ai_chatbot_api_setting" USING btree ("project_id","environment_id");