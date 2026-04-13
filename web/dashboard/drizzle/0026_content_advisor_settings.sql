CREATE TABLE IF NOT EXISTS "project_ai_content_advisor_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "environment_id" uuid NOT NULL,
  "auto_resolve_after_runs" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_settings" ADD CONSTRAINT "project_ai_content_advisor_settings_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_content_advisor_settings" ADD CONSTRAINT "project_ai_content_advisor_settings_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_settings_project_idx" ON "project_ai_content_advisor_settings" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_content_advisor_settings_environment_idx" ON "project_ai_content_advisor_settings" USING btree ("environment_id");
