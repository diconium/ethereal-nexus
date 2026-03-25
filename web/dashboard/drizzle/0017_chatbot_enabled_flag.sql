ALTER TABLE "project_ai_chatbot"
ADD COLUMN "enabled" boolean DEFAULT true;
--> statement-breakpoint
UPDATE "project_ai_chatbot"
SET "enabled" = true
WHERE "enabled" IS NULL;
--> statement-breakpoint
ALTER TABLE "project_ai_chatbot"
ALTER COLUMN "enabled" SET NOT NULL;
