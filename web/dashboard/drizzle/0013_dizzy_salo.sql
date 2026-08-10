CREATE TABLE "nexus_provision_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"mapping_id" uuid NOT NULL,
	"target_connection_id" uuid,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"operations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexus_provision_job" ADD CONSTRAINT "nexus_provision_job_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_provision_job" ADD CONSTRAINT "nexus_provision_job_target_connection_id_cms_connection_id_fk" FOREIGN KEY ("target_connection_id") REFERENCES "public"."cms_connection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexus_provision_job_project_idx" ON "nexus_provision_job" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "nexus_provision_job_mapping_idx" ON "nexus_provision_job" USING btree ("mapping_id");