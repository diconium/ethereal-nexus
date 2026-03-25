CREATE TABLE "project_ai_environment_feature_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"environment_id" uuid NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_ai_environment_feature_flag" ADD CONSTRAINT "project_ai_environment_feature_flag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_environment_feature_flag" ADD CONSTRAINT "project_ai_environment_feature_flag_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_env_feature_flag_env_key_idx" ON "project_ai_environment_feature_flag" USING btree ("environment_id","key");--> statement-breakpoint
CREATE INDEX "project_ai_env_feature_flag_project_env_idx" ON "project_ai_environment_feature_flag" USING btree ("project_id","environment_id");