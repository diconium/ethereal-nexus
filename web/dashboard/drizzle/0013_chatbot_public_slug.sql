ALTER TABLE "project_ai_chatbot"
ADD COLUMN "public_slug" text;
--> statement-breakpoint
WITH ranked_chatbots AS (
  SELECT
    "id",
    "slug",
    row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", "id") AS "slug_rank"
  FROM "project_ai_chatbot"
)
UPDATE "project_ai_chatbot"
SET "public_slug" = CASE
  WHEN ranked_chatbots."slug_rank" = 1 THEN ranked_chatbots."slug"
  ELSE ranked_chatbots."slug" || '-' || ranked_chatbots."slug_rank"
END
FROM ranked_chatbots
WHERE "project_ai_chatbot"."id" = ranked_chatbots."id"
  AND "project_ai_chatbot"."public_slug" IS NULL;
--> statement-breakpoint
ALTER TABLE "project_ai_chatbot"
ALTER COLUMN "public_slug" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_chatbot_public_slug_idx"
ON "project_ai_chatbot" USING btree ("public_slug");
