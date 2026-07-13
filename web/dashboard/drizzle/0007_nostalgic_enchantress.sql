CREATE TABLE "project_ai_search_app_api_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"search_app_id" uuid NOT NULL,
	"rate_limit_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_max_requests" integer DEFAULT 30 NOT NULL,
	"rate_limit_window_seconds" integer DEFAULT 60 NOT NULL,
	"rate_limit_use_ip" boolean DEFAULT true NOT NULL,
	"rate_limit_use_session_cookie" boolean DEFAULT true NOT NULL,
	"rate_limit_use_fingerprint" boolean DEFAULT false NOT NULL,
	"fingerprint_header_name" text DEFAULT 'x-client-fingerprint' NOT NULL,
	"query_size_limit_enabled" boolean DEFAULT true NOT NULL,
	"max_query_characters" integer DEFAULT 500 NOT NULL,
	"max_request_body_bytes" integer DEFAULT 2000 NOT NULL,
	"session_request_cap_enabled" boolean DEFAULT false NOT NULL,
	"session_request_cap_max_requests" integer DEFAULT 200 NOT NULL,
	"session_request_cap_window_seconds" integer DEFAULT 86400 NOT NULL,
	"temporary_block_enabled" boolean DEFAULT true NOT NULL,
	"temporary_block_violation_threshold" integer DEFAULT 5 NOT NULL,
	"temporary_block_window_seconds" integer DEFAULT 3600 NOT NULL,
	"temporary_block_duration_seconds" integer DEFAULT 1800 NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_search_app" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"public_slug" text NOT NULL,
	"provider" text DEFAULT 'vertex-ai-agent-search' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"page_size" integer DEFAULT 10 NOT NULL,
	"page_size_max" integer DEFAULT 25 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_ai_search_app_api_setting" ADD CONSTRAINT "project_ai_search_app_api_setting_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_search_app_api_setting" ADD CONSTRAINT "project_ai_search_app_api_setting_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_search_app_api_setting" ADD CONSTRAINT "project_ai_search_app_api_setting_search_app_id_project_ai_search_app_id_fk" FOREIGN KEY ("search_app_id") REFERENCES "public"."project_ai_search_app"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_search_app" ADD CONSTRAINT "project_ai_search_app_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_search_app" ADD CONSTRAINT "project_ai_search_app_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_search_app_api_setting_search_app_idx" ON "project_ai_search_app_api_setting" USING btree ("search_app_id");--> statement-breakpoint
CREATE INDEX "project_ai_search_app_api_setting_project_env_idx" ON "project_ai_search_app_api_setting" USING btree ("project_id","environment_id","search_app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_search_app_env_slug_idx" ON "project_ai_search_app" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_search_app_public_slug_idx" ON "project_ai_search_app" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "project_ai_search_app_project_env_idx" ON "project_ai_search_app" USING btree ("project_id","environment_id");