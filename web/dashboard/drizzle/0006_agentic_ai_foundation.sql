CREATE TABLE "project_ai_analytics_review_agent_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"provider" text DEFAULT 'microsoft-foundry' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"taxonomy_version" text DEFAULT 'v1' NOT NULL,
	"max_batch_size" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_author_dialog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"public_slug" text NOT NULL,
	"provider" text DEFAULT 'microsoft-foundry' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
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
	"provider" text DEFAULT 'microsoft-foundry' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
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
CREATE TABLE "project_ai_chatbot_analytics_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"llm_fallback_enabled" boolean DEFAULT false NOT NULL,
	"review_min_confidence" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot_api_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"rate_limit_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_max_requests" integer DEFAULT 30 NOT NULL,
	"rate_limit_window_seconds" integer DEFAULT 60 NOT NULL,
	"rate_limit_use_ip" boolean DEFAULT true NOT NULL,
	"rate_limit_use_session_cookie" boolean DEFAULT true NOT NULL,
	"rate_limit_use_fingerprint" boolean DEFAULT false NOT NULL,
	"fingerprint_header_name" text DEFAULT 'x-client-fingerprint' NOT NULL,
	"message_size_limit_enabled" boolean DEFAULT true NOT NULL,
	"max_message_characters" integer DEFAULT 8000 NOT NULL,
	"max_request_body_bytes" integer DEFAULT 16000 NOT NULL,
	"session_request_cap_enabled" boolean DEFAULT false NOT NULL,
	"session_request_cap_max_requests" integer DEFAULT 200 NOT NULL,
	"session_request_cap_window_seconds" integer DEFAULT 86400 NOT NULL,
	"ip_daily_token_budget_enabled" boolean DEFAULT false NOT NULL,
	"ip_daily_token_budget" integer DEFAULT 100000 NOT NULL,
	"temporary_block_enabled" boolean DEFAULT true NOT NULL,
	"temporary_block_violation_threshold" integer DEFAULT 5 NOT NULL,
	"temporary_block_window_seconds" integer DEFAULT 3600 NOT NULL,
	"temporary_block_duration_seconds" integer DEFAULT 1800 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"status_code" integer,
	"latency_ms" integer,
	"request_body_bytes" integer,
	"message_count" integer,
	"latest_user_characters" integer,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"rate_limited" boolean DEFAULT false NOT NULL,
	"temporary_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"conversation_id" text,
	"session_key" text NOT NULL,
	"identity_source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"user_message_count" integer DEFAULT 0 NOT NULL,
	"assistant_message_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"rate_limited_count" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"detected_language" text,
	"is_multilingual" boolean DEFAULT false NOT NULL,
	"intent_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topic_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sentiment" text DEFAULT 'unknown' NOT NULL,
	"resolution_state" text DEFAULT 'unknown' NOT NULL,
	"classification_source" text DEFAULT 'rules' NOT NULL,
	"classification_confidence" integer DEFAULT 0 NOT NULL,
	"first_user_message_at" timestamp with time zone,
	"second_user_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot_stat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"rate_limited_count" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"last_request_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_rate_limited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot_topic_rule_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"default_language" text DEFAULT 'en' NOT NULL,
	"minimum_confidence" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot_topic_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"rule_set_id" uuid NOT NULL,
	"topic_key" text NOT NULL,
	"label" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"negative_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_chatbot_unmatched_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"event_id" uuid,
	"detected_language" text,
	"first_user_message" text NOT NULL,
	"second_user_message" text,
	"assistant_excerpt" text,
	"match_failure_reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_attempts" integer DEFAULT 0 NOT NULL,
	"classification_source" text,
	"classification_confidence" integer,
	"last_reviewed_at" timestamp with time zone,
	"classified_at" timestamp with time zone,
	"error_message" text,
	"expires_at" timestamp with time zone NOT NULL,
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
	"public_slug" text NOT NULL,
	"provider" text DEFAULT 'microsoft-foundry' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_endpoint" text NOT NULL,
	"agent_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
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
	"provider" text DEFAULT 'microsoft-foundry' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_agent_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent_config_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"response" text DEFAULT '' NOT NULL,
	"issue_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_issue_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"author_user_id" uuid,
	"author_name" text NOT NULL,
	"author_email" text,
	"author_image" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_issue_detection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"environment_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"page_url" text NOT NULL,
	"page_path" text,
	"component_path" text,
	"fingerprint" text NOT NULL,
	"page_title" text,
	"issue_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"suggestion" text DEFAULT '' NOT NULL,
	"reasoning" text DEFAULT '' NOT NULL,
	"first_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"detection_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"schedule_id" uuid,
	"triggered_by" text DEFAULT 'schedule' NOT NULL,
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
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_content_advisor_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"auto_resolve_after_runs" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_environment_feature_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "project_ai_page_url_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"aem_path" text NOT NULL,
	"frontend_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_ai_analytics_review_agent_config" ADD CONSTRAINT "project_ai_analytics_review_agent_config_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_analytics_review_agent_config" ADD CONSTRAINT "project_ai_analytics_review_agent_config_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_author_dialog" ADD CONSTRAINT "project_ai_author_dialog_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_author_dialog" ADD CONSTRAINT "project_ai_author_dialog_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_catalogue_version" ADD CONSTRAINT "project_ai_catalogue_version_catalogue_id_project_ai_catalogue_id_fk" FOREIGN KEY ("catalogue_id") REFERENCES "public"."project_ai_catalogue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_catalogue" ADD CONSTRAINT "project_ai_catalogue_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_catalogue" ADD CONSTRAINT "project_ai_catalogue_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_analytics_config" ADD CONSTRAINT "project_ai_chatbot_analytics_config_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_analytics_config" ADD CONSTRAINT "project_ai_chatbot_analytics_config_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_analytics_config" ADD CONSTRAINT "project_ai_chatbot_analytics_config_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_api_setting" ADD CONSTRAINT "project_ai_chatbot_api_setting_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_api_setting" ADD CONSTRAINT "project_ai_chatbot_api_setting_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_api_setting" ADD CONSTRAINT "project_ai_chatbot_api_setting_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_event" ADD CONSTRAINT "project_ai_chatbot_event_session_id_project_ai_chatbot_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_ai_chatbot_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_event" ADD CONSTRAINT "project_ai_chatbot_event_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_event" ADD CONSTRAINT "project_ai_chatbot_event_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_event" ADD CONSTRAINT "project_ai_chatbot_event_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_session" ADD CONSTRAINT "project_ai_chatbot_session_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_session" ADD CONSTRAINT "project_ai_chatbot_session_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_session" ADD CONSTRAINT "project_ai_chatbot_session_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_stat" ADD CONSTRAINT "project_ai_chatbot_stat_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_stat" ADD CONSTRAINT "project_ai_chatbot_stat_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_stat" ADD CONSTRAINT "project_ai_chatbot_stat_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_topic_rule_set" ADD CONSTRAINT "project_ai_chatbot_topic_rule_set_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_topic_rule_set" ADD CONSTRAINT "project_ai_chatbot_topic_rule_set_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_topic_rule_set" ADD CONSTRAINT "project_ai_chatbot_topic_rule_set_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_topic_rule" ADD CONSTRAINT "project_ai_chatbot_topic_rule_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_topic_rule" ADD CONSTRAINT "project_ai_chatbot_topic_rule_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_topic_rule" ADD CONSTRAINT "project_ai_chatbot_topic_rule_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_topic_rule" ADD CONSTRAINT "project_ai_chatbot_topic_rule_rule_set_id_project_ai_chatbot_topic_rule_set_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."project_ai_chatbot_topic_rule_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_unmatched_review" ADD CONSTRAINT "project_ai_chatbot_unmatched_review_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_unmatched_review" ADD CONSTRAINT "project_ai_chatbot_unmatched_review_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_unmatched_review" ADD CONSTRAINT "project_ai_chatbot_unmatched_review_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_unmatched_review" ADD CONSTRAINT "project_ai_chatbot_unmatched_review_session_id_project_ai_chatbot_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_ai_chatbot_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_unmatched_review" ADD CONSTRAINT "project_ai_chatbot_unmatched_review_event_id_project_ai_chatbot_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."project_ai_chatbot_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot" ADD CONSTRAINT "project_ai_chatbot_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot" ADD CONSTRAINT "project_ai_chatbot_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_config" ADD CONSTRAINT "project_ai_content_advisor_agent_config_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_config" ADD CONSTRAINT "project_ai_content_advisor_agent_config_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_run" ADD CONSTRAINT "project_ai_content_advisor_agent_run_run_id_project_ai_content_advisor_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."project_ai_content_advisor_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_agent_run" ADD CONSTRAINT "project_ai_content_advisor_agent_run_agent_config_id_project_ai_content_advisor_agent_config_id_fk" FOREIGN KEY ("agent_config_id") REFERENCES "public"."project_ai_content_advisor_agent_config"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue_comment" ADD CONSTRAINT "project_ai_content_advisor_issue_comment_issue_id_project_ai_content_advisor_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."project_ai_content_advisor_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue_comment" ADD CONSTRAINT "project_ai_content_advisor_issue_comment_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue_detection" ADD CONSTRAINT "project_ai_content_advisor_issue_detection_issue_id_project_ai_content_advisor_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."project_ai_content_advisor_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue_detection" ADD CONSTRAINT "project_ai_content_advisor_issue_detection_run_id_project_ai_content_advisor_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."project_ai_content_advisor_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue_detection" ADD CONSTRAINT "project_ai_content_advisor_issue_detection_agent_run_id_project_ai_content_advisor_agent_run_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."project_ai_content_advisor_agent_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue" ADD CONSTRAINT "project_ai_content_advisor_issue_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue" ADD CONSTRAINT "project_ai_content_advisor_issue_run_id_project_ai_content_advisor_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."project_ai_content_advisor_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue" ADD CONSTRAINT "project_ai_content_advisor_issue_agent_run_id_project_ai_content_advisor_agent_run_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."project_ai_content_advisor_agent_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_run" ADD CONSTRAINT "project_ai_content_advisor_run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_run" ADD CONSTRAINT "project_ai_content_advisor_run_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_run" ADD CONSTRAINT "project_ai_content_advisor_run_schedule_id_project_ai_content_advisor_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."project_ai_content_advisor_schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_schedule_page" ADD CONSTRAINT "project_ai_content_advisor_schedule_page_schedule_id_project_ai_content_advisor_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."project_ai_content_advisor_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_schedule" ADD CONSTRAINT "project_ai_content_advisor_schedule_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_schedule" ADD CONSTRAINT "project_ai_content_advisor_schedule_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_settings" ADD CONSTRAINT "project_ai_content_advisor_settings_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_settings" ADD CONSTRAINT "project_ai_content_advisor_settings_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_environment_feature_flag" ADD CONSTRAINT "project_ai_environment_feature_flag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_environment_feature_flag" ADD CONSTRAINT "project_ai_environment_feature_flag_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_feature_flag" ADD CONSTRAINT "project_ai_feature_flag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_page_url_mapping" ADD CONSTRAINT "project_ai_page_url_mapping_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_page_url_mapping" ADD CONSTRAINT "project_ai_page_url_mapping_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_analytics_review_agent_env_idx" ON "project_ai_analytics_review_agent_config" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_analytics_review_agent_project_env_idx" ON "project_ai_analytics_review_agent_config" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_author_dialog_env_slug_idx" ON "project_ai_author_dialog" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_author_dialog_public_slug_idx" ON "project_ai_author_dialog" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "project_ai_author_dialog_project_env_idx" ON "project_ai_author_dialog" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_catalogue_version_catalogue_idx" ON "project_ai_catalogue_version" USING btree ("catalogue_id");--> statement-breakpoint
CREATE INDEX "project_ai_catalogue_version_created_idx" ON "project_ai_catalogue_version" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_catalogue_env_slug_idx" ON "project_ai_catalogue" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_catalogue_api_url_idx" ON "project_ai_catalogue" USING btree ("api_url");--> statement-breakpoint
CREATE INDEX "project_ai_catalogue_project_env_idx" ON "project_ai_catalogue" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_analytics_config_chatbot_idx" ON "project_ai_chatbot_analytics_config" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_analytics_config_project_env_idx" ON "project_ai_chatbot_analytics_config" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_api_setting_chatbot_idx" ON "project_ai_chatbot_api_setting" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_api_setting_project_env_chatbot_idx" ON "project_ai_chatbot_api_setting" USING btree ("project_id","environment_id","chatbot_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_event_session_created_idx" ON "project_ai_chatbot_event" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_event_chatbot_created_idx" ON "project_ai_chatbot_event" USING btree ("chatbot_id","created_at");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_session_chatbot_started_idx" ON "project_ai_chatbot_session" USING btree ("chatbot_id","started_at");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_session_env_started_idx" ON "project_ai_chatbot_session" USING btree ("environment_id","started_at");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_session_chatbot_key_idx" ON "project_ai_chatbot_session" USING btree ("chatbot_id","session_key");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_stat_chatbot_idx" ON "project_ai_chatbot_stat" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_stat_project_env_idx" ON "project_ai_chatbot_stat" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_topic_rule_set_chatbot_idx" ON "project_ai_chatbot_topic_rule_set" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_topic_rule_set_project_env_idx" ON "project_ai_chatbot_topic_rule_set" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_topic_rule_chatbot_lang_idx" ON "project_ai_chatbot_topic_rule" USING btree ("chatbot_id","language");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_topic_rule_rule_set_idx" ON "project_ai_chatbot_topic_rule" USING btree ("rule_set_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_unmatched_review_status_exp_idx" ON "project_ai_chatbot_unmatched_review" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_unmatched_review_chatbot_created_idx" ON "project_ai_chatbot_unmatched_review" USING btree ("chatbot_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_env_slug_idx" ON "project_ai_chatbot" USING btree ("environment_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_public_slug_idx" ON "project_ai_chatbot" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_project_env_idx" ON "project_ai_chatbot" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_content_advisor_agent_env_key_idx" ON "project_ai_content_advisor_agent_config" USING btree ("environment_id","key");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_agent_project_env_idx" ON "project_ai_content_advisor_agent_config" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_agent_run_run_idx" ON "project_ai_content_advisor_agent_run" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_agent_run_agent_idx" ON "project_ai_content_advisor_agent_run" USING btree ("agent_config_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_comment_issue_idx" ON "project_ai_content_advisor_issue_comment" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_comment_author_idx" ON "project_ai_content_advisor_issue_comment" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_detection_issue_idx" ON "project_ai_content_advisor_issue_detection" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_detection_run_idx" ON "project_ai_content_advisor_issue_detection" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_detection_agent_run_idx" ON "project_ai_content_advisor_issue_detection" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_environment_idx" ON "project_ai_content_advisor_issue" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_run_idx" ON "project_ai_content_advisor_issue" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_agent_run_idx" ON "project_ai_content_advisor_issue" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_type_idx" ON "project_ai_content_advisor_issue" USING btree ("issue_type");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_issue_env_status_idx" ON "project_ai_content_advisor_issue" USING btree ("environment_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_content_advisor_issue_fingerprint_idx" ON "project_ai_content_advisor_issue" USING btree ("environment_id","fingerprint");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_run_project_env_idx" ON "project_ai_content_advisor_run" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_run_created_idx" ON "project_ai_content_advisor_run" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_schedule_page_idx" ON "project_ai_content_advisor_schedule_page" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_schedule_project_env_idx" ON "project_ai_content_advisor_schedule" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_settings_project_idx" ON "project_ai_content_advisor_settings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_ai_content_advisor_settings_environment_idx" ON "project_ai_content_advisor_settings" USING btree ("environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_content_advisor_settings_project_env_idx" ON "project_ai_content_advisor_settings" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_env_feature_flag_env_key_idx" ON "project_ai_environment_feature_flag" USING btree ("environment_id","key");--> statement-breakpoint
CREATE INDEX "project_ai_env_feature_flag_project_env_idx" ON "project_ai_environment_feature_flag" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_feature_flag_project_key_idx" ON "project_ai_feature_flag" USING btree ("project_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_page_url_mapping_env_path_idx" ON "project_ai_page_url_mapping" USING btree ("environment_id","aem_path");--> statement-breakpoint
CREATE INDEX "project_ai_page_url_mapping_project_env_idx" ON "project_ai_page_url_mapping" USING btree ("project_id","environment_id");
