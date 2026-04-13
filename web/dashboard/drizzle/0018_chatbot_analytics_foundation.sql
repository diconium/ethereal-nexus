CREATE TABLE "project_ai_chatbot_analytics_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE cascade,
  "environment_id" uuid NOT NULL REFERENCES "environment"("id") ON DELETE cascade,
  "chatbot_id" uuid NOT NULL REFERENCES "project_ai_chatbot"("id") ON DELETE cascade,
  "llm_fallback_enabled" boolean DEFAULT false NOT NULL,
  "review_min_confidence" integer DEFAULT 60 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_analytics_config_chatbot_idx"
ON "project_ai_chatbot_analytics_config" USING btree ("chatbot_id");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_analytics_config_project_env_idx"
ON "project_ai_chatbot_analytics_config" USING btree ("project_id", "environment_id");
--> statement-breakpoint

CREATE TABLE "project_ai_analytics_review_agent_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE cascade,
  "environment_id" uuid NOT NULL REFERENCES "environment"("id") ON DELETE cascade,
  "provider" text DEFAULT 'microsoft-foundry' NOT NULL,
  "provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "taxonomy_version" text DEFAULT 'v1' NOT NULL,
  "max_batch_size" integer DEFAULT 20 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_analytics_review_agent_env_idx"
ON "project_ai_analytics_review_agent_config" USING btree ("environment_id");
--> statement-breakpoint
CREATE INDEX "project_ai_analytics_review_agent_project_env_idx"
ON "project_ai_analytics_review_agent_config" USING btree ("project_id", "environment_id");
--> statement-breakpoint

CREATE TABLE "project_ai_chatbot_topic_rule_set" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE cascade,
  "environment_id" uuid NOT NULL REFERENCES "environment"("id") ON DELETE cascade,
  "chatbot_id" uuid NOT NULL REFERENCES "project_ai_chatbot"("id") ON DELETE cascade,
  "enabled" boolean DEFAULT false NOT NULL,
  "default_language" text DEFAULT 'en' NOT NULL,
  "minimum_confidence" integer DEFAULT 60 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_topic_rule_set_chatbot_idx"
ON "project_ai_chatbot_topic_rule_set" USING btree ("chatbot_id");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_topic_rule_set_project_env_idx"
ON "project_ai_chatbot_topic_rule_set" USING btree ("project_id", "environment_id");
--> statement-breakpoint

CREATE TABLE "project_ai_chatbot_topic_rule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE cascade,
  "environment_id" uuid NOT NULL REFERENCES "environment"("id") ON DELETE cascade,
  "chatbot_id" uuid NOT NULL REFERENCES "project_ai_chatbot"("id") ON DELETE cascade,
  "rule_set_id" uuid NOT NULL REFERENCES "project_ai_chatbot_topic_rule_set"("id") ON DELETE cascade,
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
CREATE INDEX "project_ai_chatbot_topic_rule_chatbot_lang_idx"
ON "project_ai_chatbot_topic_rule" USING btree ("chatbot_id", "language");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_topic_rule_rule_set_idx"
ON "project_ai_chatbot_topic_rule" USING btree ("rule_set_id");
--> statement-breakpoint

CREATE TABLE "project_ai_chatbot_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE cascade,
  "environment_id" uuid NOT NULL REFERENCES "environment"("id") ON DELETE cascade,
  "chatbot_id" uuid NOT NULL REFERENCES "project_ai_chatbot"("id") ON DELETE cascade,
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
CREATE INDEX "project_ai_chatbot_session_chatbot_started_idx"
ON "project_ai_chatbot_session" USING btree ("chatbot_id", "started_at");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_session_env_started_idx"
ON "project_ai_chatbot_session" USING btree ("environment_id", "started_at");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_session_chatbot_key_idx"
ON "project_ai_chatbot_session" USING btree ("chatbot_id", "session_key");
--> statement-breakpoint

CREATE TABLE "project_ai_chatbot_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "project_ai_chatbot_session"("id") ON DELETE cascade,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE cascade,
  "environment_id" uuid NOT NULL REFERENCES "environment"("id") ON DELETE cascade,
  "chatbot_id" uuid NOT NULL REFERENCES "project_ai_chatbot"("id") ON DELETE cascade,
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
CREATE INDEX "project_ai_chatbot_event_session_created_idx"
ON "project_ai_chatbot_event" USING btree ("session_id", "created_at");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_event_chatbot_created_idx"
ON "project_ai_chatbot_event" USING btree ("chatbot_id", "created_at");
--> statement-breakpoint

CREATE TABLE "project_ai_chatbot_unmatched_review" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE cascade,
  "environment_id" uuid NOT NULL REFERENCES "environment"("id") ON DELETE cascade,
  "chatbot_id" uuid NOT NULL REFERENCES "project_ai_chatbot"("id") ON DELETE cascade,
  "session_id" uuid NOT NULL REFERENCES "project_ai_chatbot_session"("id") ON DELETE cascade,
  "event_id" uuid REFERENCES "project_ai_chatbot_event"("id") ON DELETE set null,
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
CREATE INDEX "project_ai_chatbot_unmatched_review_status_exp_idx"
ON "project_ai_chatbot_unmatched_review" USING btree ("status", "expires_at");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_unmatched_review_chatbot_created_idx"
ON "project_ai_chatbot_unmatched_review" USING btree ("chatbot_id", "created_at");
