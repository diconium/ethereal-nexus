CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"component_id" uuid,
	"environment_id" uuid NOT NULL,
	"flag_name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flag_component_id_component_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."component"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flag_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;