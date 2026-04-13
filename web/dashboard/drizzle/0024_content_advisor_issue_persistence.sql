ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "environment_id" uuid;

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "fingerprint" text;

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "first_detected_at" timestamp with time zone DEFAULT now();

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "last_detected_at" timestamp with time zone DEFAULT now();

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ADD COLUMN IF NOT EXISTS "detection_count" integer DEFAULT 1;

--> statement-breakpoint
-- Delete orphaned issues that have no matching run (would cause SET NOT NULL to fail)
DELETE FROM "project_ai_content_advisor_issue"
WHERE "run_id" NOT IN (
  SELECT "id" FROM "project_ai_content_advisor_run"
);

--> statement-breakpoint
UPDATE "project_ai_content_advisor_issue" issue
SET
  "environment_id" = run."environment_id",
  "fingerprint" = lower(coalesce(issue."issue_type", '')) || '::' || lower(coalesce(issue."page_path", '')) || '::' || lower(coalesce(issue."component_path", '')) || '::' || lower(coalesce(issue."title", '')),
  "first_detected_at" = coalesce(issue."first_detected_at", issue."created_at", now()),
  "last_detected_at" = coalesce(issue."last_detected_at", issue."created_at", now()),
  "detection_count" = coalesce(issue."detection_count", 1)
FROM "project_ai_content_advisor_run" run
WHERE issue."run_id" = run."id";

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ALTER COLUMN "environment_id" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ALTER COLUMN "fingerprint" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ALTER COLUMN "first_detected_at" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ALTER COLUMN "last_detected_at" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "project_ai_content_advisor_issue"
ALTER COLUMN "detection_count" SET NOT NULL;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_issue" ADD CONSTRAINT "project_ai_content_advisor_issue_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_environment_idx" ON "project_ai_content_advisor_issue" USING btree ("environment_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_fingerprint_idx" ON "project_ai_content_advisor_issue" USING btree ("environment_id", "fingerprint");
