CREATE TABLE "nexus_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexus_library_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"library_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"group" text,
	"dialog" jsonb DEFAULT '{"dialog":[]}'::jsonb NOT NULL,
	"composition" jsonb,
	"source_hint" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexus_library" ADD CONSTRAINT "nexus_library_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_library_definition" ADD CONSTRAINT "nexus_library_definition_library_id_nexus_library_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."nexus_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexus_library_project_idx" ON "nexus_library" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "nexus_lib_def_library_idx" ON "nexus_library_definition" USING btree ("library_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nexus_lib_def_unique_idx" ON "nexus_library_definition" USING btree ("library_id","kind","key");