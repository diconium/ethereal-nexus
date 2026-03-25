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
ALTER TABLE "project_ai_chatbot_stat" ADD CONSTRAINT "project_ai_chatbot_stat_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_stat" ADD CONSTRAINT "project_ai_chatbot_stat_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_stat" ADD CONSTRAINT "project_ai_chatbot_stat_chatbot_id_project_ai_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."project_ai_chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_stat_chatbot_idx" ON "project_ai_chatbot_stat" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_stat_project_env_idx" ON "project_ai_chatbot_stat" USING btree ("project_id","environment_id");
