CREATE TABLE "cms_blueprint_entity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text,
	"parent_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_blueprint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"configuration" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_provider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"icon" text,
	"description" text,
	"available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_provider_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "cms_connection_validation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"task" text NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"duration_ms" integer,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_discovery_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blueprint_id" uuid,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_blueprint_entity" ADD CONSTRAINT "cms_blueprint_entity_blueprint_id_cms_blueprint_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."cms_blueprint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_blueprint" ADD CONSTRAINT "cms_blueprint_connection_id_cms_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."cms_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_connection" ADD CONSTRAINT "cms_connection_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_connection" ADD CONSTRAINT "cms_connection_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_connection_validation" ADD CONSTRAINT "cms_connection_validation_connection_id_cms_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."cms_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_discovery_job" ADD CONSTRAINT "cms_discovery_job_connection_id_cms_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."cms_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_blueprint_entity_blueprint_idx" ON "cms_blueprint_entity" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "cms_blueprint_entity_type_idx" ON "cms_blueprint_entity" USING btree ("blueprint_id","entity_type");--> statement-breakpoint
CREATE INDEX "cms_blueprint_connection_idx" ON "cms_blueprint" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "cms_connection_project_idx" ON "cms_connection" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cms_connection_project_env_idx" ON "cms_connection" USING btree ("project_id","environment_id");--> statement-breakpoint
CREATE INDEX "cms_connection_validation_connection_idx" ON "cms_connection_validation" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "cms_discovery_job_connection_idx" ON "cms_discovery_job" USING btree ("connection_id");