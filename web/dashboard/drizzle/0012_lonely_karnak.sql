CREATE TABLE "nexus_mapping_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" uuid NOT NULL,
	"blueprint_kind" text NOT NULL,
	"blueprint_node_key" text NOT NULL,
	"blueprint_node_name" text NOT NULL,
	"target_definition_id" uuid,
	"status" text DEFAULT 'missing' NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"field_map" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transform" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexus_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"blueprint_definition_id" uuid NOT NULL,
	"library_id" uuid NOT NULL,
	"target_connection_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nexus_mapping_link" ADD CONSTRAINT "nexus_mapping_link_mapping_id_nexus_mapping_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."nexus_mapping"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_mapping_link" ADD CONSTRAINT "nexus_mapping_link_target_definition_id_nexus_library_definition_id_fk" FOREIGN KEY ("target_definition_id") REFERENCES "public"."nexus_library_definition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_mapping" ADD CONSTRAINT "nexus_mapping_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_mapping" ADD CONSTRAINT "nexus_mapping_library_id_nexus_library_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."nexus_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_mapping" ADD CONSTRAINT "nexus_mapping_target_connection_id_cms_connection_id_fk" FOREIGN KEY ("target_connection_id") REFERENCES "public"."cms_connection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexus_mapping_link_mapping_idx" ON "nexus_mapping_link" USING btree ("mapping_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nexus_mapping_link_unique_idx" ON "nexus_mapping_link" USING btree ("mapping_id","blueprint_kind","blueprint_node_key");--> statement-breakpoint
CREATE INDEX "nexus_mapping_project_idx" ON "nexus_mapping" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "nexus_mapping_blueprint_idx" ON "nexus_mapping" USING btree ("blueprint_definition_id");