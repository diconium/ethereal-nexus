CREATE TABLE IF NOT EXISTS "project_ai_page_url_mapping" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "environment_id" uuid NOT NULL,
  "aem_path" text NOT NULL,
  "frontend_url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_page_url_mapping" ADD CONSTRAINT "project_ai_page_url_mapping_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_ai_page_url_mapping" ADD CONSTRAINT "project_ai_page_url_mapping_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_ai_page_url_mapping_env_path_idx" ON "project_ai_page_url_mapping" USING btree ("environment_id","aem_path");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_ai_page_url_mapping_project_env_idx" ON "project_ai_page_url_mapping" USING btree ("project_id","environment_id");
