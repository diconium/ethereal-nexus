CREATE TYPE "public"."type" AS ENUM('email', 'oauth');--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "issuer" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "client_secret" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "type" "type" DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "unique_user" UNIQUE NULLS NOT DISTINCT("email","issuer","subject");