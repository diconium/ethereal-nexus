CREATE TABLE IF NOT EXISTS "project_ai_content_advisor_issue_comment" (
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
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_issue_comment" ADD CONSTRAINT "project_ai_content_advisor_issue_comment_issue_id_project_ai_content_advisor_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."project_ai_content_advisor_issue"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_issue_comment" ADD CONSTRAINT "project_ai_content_advisor_issue_comment_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_comment_issue_idx" ON "project_ai_content_advisor_issue_comment" USING btree ("issue_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_issue_comment_author_idx" ON "project_ai_content_advisor_issue_comment" USING btree ("author_user_id");
