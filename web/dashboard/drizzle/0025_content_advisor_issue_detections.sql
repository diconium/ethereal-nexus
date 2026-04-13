CREATE TABLE IF NOT EXISTS "project_ai_content_advisor_issue_detection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "agent_run_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_issue_detection" ADD CONSTRAINT "project_ai_content_advisor_issue_detection_issue_id_project_ai_content_advisor_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."project_ai_content_advisor_issue"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_issue_detection" ADD CONSTRAINT "project_ai_content_advisor_issue_detection_run_id_project_ai_content_advisor_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."project_ai_content_advisor_run"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_issue_detection" ADD CONSTRAINT "project_ai_content_advisor_issue_detection_agent_run_id_project_ai_content_advisor_agent_run_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."project_ai_content_advisor_agent_run"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_detection_issue_idx" ON "project_ai_content_advisor_issue_detection" USING btree ("issue_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_detection_run_idx" ON "project_ai_content_advisor_issue_detection" USING btree ("run_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_detection_agent_run_idx" ON "project_ai_content_advisor_issue_detection" USING btree ("agent_run_id");

--> statement-breakpoint
INSERT INTO "project_ai_content_advisor_issue_detection" ("issue_id", "run_id", "agent_run_id", "created_at")
SELECT issue."id", issue."run_id", issue."agent_run_id", coalesce(issue."last_detected_at", issue."created_at", now())
FROM "project_ai_content_advisor_issue" issue
WHERE NOT EXISTS (
  SELECT 1
  FROM "project_ai_content_advisor_issue_detection" detection
  WHERE detection."issue_id" = issue."id"
);
