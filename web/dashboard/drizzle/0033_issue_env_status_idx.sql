CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_env_status_idx"
  ON "project_ai_content_advisor_issue" ("environment_id", "status");
