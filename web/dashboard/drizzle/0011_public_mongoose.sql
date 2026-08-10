ALTER TABLE "nexus_library_definition" ADD COLUMN "status" text DEFAULT 'generated' NOT NULL;--> statement-breakpoint
ALTER TABLE "nexus_library_definition" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "nexus_library_definition" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;