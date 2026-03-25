ALTER TABLE "project_ai_chatbot_api_setting"
ADD COLUMN "chatbot_id" uuid REFERENCES "project_ai_chatbot"("id") ON DELETE cascade;
--> statement-breakpoint
DROP INDEX IF EXISTS "project_ai_chatbot_api_setting_env_idx";
--> statement-breakpoint
INSERT INTO "project_ai_chatbot_api_setting" (
  "id",
  "project_id",
  "environment_id",
  "chatbot_id",
  "rate_limit_enabled",
  "rate_limit_max_requests",
  "rate_limit_window_seconds",
  "rate_limit_use_ip",
  "rate_limit_use_session_cookie",
  "rate_limit_use_fingerprint",
  "fingerprint_header_name",
  "message_size_limit_enabled",
  "max_message_characters",
  "max_request_body_bytes",
  "session_request_cap_enabled",
  "session_request_cap_max_requests",
  "session_request_cap_window_seconds",
  "ip_daily_token_budget_enabled",
  "ip_daily_token_budget",
  "temporary_block_enabled",
  "temporary_block_violation_threshold",
  "temporary_block_window_seconds",
  "temporary_block_duration_seconds",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  settings."project_id",
  settings."environment_id",
  chatbots."id",
  settings."rate_limit_enabled",
  settings."rate_limit_max_requests",
  settings."rate_limit_window_seconds",
  settings."rate_limit_use_ip",
  settings."rate_limit_use_session_cookie",
  settings."rate_limit_use_fingerprint",
  settings."fingerprint_header_name",
  settings."message_size_limit_enabled",
  settings."max_message_characters",
  settings."max_request_body_bytes",
  settings."session_request_cap_enabled",
  settings."session_request_cap_max_requests",
  settings."session_request_cap_window_seconds",
  settings."ip_daily_token_budget_enabled",
  settings."ip_daily_token_budget",
  settings."temporary_block_enabled",
  settings."temporary_block_violation_threshold",
  settings."temporary_block_window_seconds",
  settings."temporary_block_duration_seconds",
  settings."created_at",
  settings."updated_at"
FROM "project_ai_chatbot_api_setting" settings
JOIN "project_ai_chatbot" chatbots
  ON chatbots."project_id" = settings."project_id"
 AND chatbots."environment_id" = settings."environment_id";
--> statement-breakpoint
DELETE FROM "project_ai_chatbot_api_setting"
WHERE "chatbot_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "project_ai_chatbot_api_setting"
ALTER COLUMN "chatbot_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_api_setting_chatbot_idx"
ON "project_ai_chatbot_api_setting" USING btree ("chatbot_id");
--> statement-breakpoint
CREATE INDEX "project_ai_chatbot_api_setting_project_env_chatbot_idx"
ON "project_ai_chatbot_api_setting" USING btree ("project_id", "environment_id", "chatbot_id");
