CREATE TABLE "cms_blueprint_change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"node_kind" text,
	"edge_type" text,
	"external_id" text NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "cms_blueprint_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"project_ref" text,
	"name" text NOT NULL,
	"discovered_by" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_blueprint_edge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_external_id" text NOT NULL,
	"to_external_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_blueprint_node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"layer" text DEFAULT 'snapshot' NOT NULL,
	"kind" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_blueprint_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"discovered_by" text,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "cms_blueprint_entity" CASCADE;--> statement-breakpoint
DROP TABLE "cms_blueprint" CASCADE;--> statement-breakpoint
ALTER TABLE "cms_connection" ADD COLUMN "capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_connection" ADD COLUMN "health" jsonb;--> statement-breakpoint
ALTER TABLE "cms_discovery_job" ADD COLUMN "snapshot_id" uuid;--> statement-breakpoint
ALTER TABLE "cms_blueprint_change" ADD CONSTRAINT "cms_blueprint_change_snapshot_id_cms_blueprint_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."cms_blueprint_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_blueprint_definition" ADD CONSTRAINT "cms_blueprint_definition_connection_id_cms_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."cms_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_blueprint_edge" ADD CONSTRAINT "cms_blueprint_edge_snapshot_id_cms_blueprint_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."cms_blueprint_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_blueprint_node" ADD CONSTRAINT "cms_blueprint_node_snapshot_id_cms_blueprint_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."cms_blueprint_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_blueprint_snapshot" ADD CONSTRAINT "cms_blueprint_snapshot_definition_id_cms_blueprint_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."cms_blueprint_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_bp_change_snapshot_idx" ON "cms_blueprint_change" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "cms_bp_def_connection_idx" ON "cms_blueprint_definition" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "cms_bp_edge_snapshot_idx" ON "cms_blueprint_edge" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "cms_bp_node_snapshot_idx" ON "cms_blueprint_node" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "cms_bp_node_kind_idx" ON "cms_blueprint_node" USING btree ("snapshot_id","kind");--> statement-breakpoint
CREATE INDEX "cms_bp_snapshot_definition_idx" ON "cms_blueprint_snapshot" USING btree ("definition_id");--> statement-breakpoint
ALTER TABLE "cms_discovery_job" DROP COLUMN "blueprint_id";