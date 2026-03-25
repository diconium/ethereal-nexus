ALTER TABLE "project_ai_author_dialog"
ADD COLUMN "public_slug" text;
--> statement-breakpoint
WITH ranked_author_dialogs AS (
  SELECT
    "id",
    "slug",
    row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", "id") AS "slug_rank"
  FROM "project_ai_author_dialog"
)
UPDATE "project_ai_author_dialog"
SET "public_slug" = CASE
  WHEN ranked_author_dialogs."slug_rank" = 1 THEN ranked_author_dialogs."slug"
  ELSE ranked_author_dialogs."slug" || '-' || ranked_author_dialogs."slug_rank"
END
FROM ranked_author_dialogs
WHERE "project_ai_author_dialog"."id" = ranked_author_dialogs."id"
  AND "project_ai_author_dialog"."public_slug" IS NULL;
--> statement-breakpoint
ALTER TABLE "project_ai_author_dialog"
ALTER COLUMN "public_slug" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "project_ai_author_dialog_public_slug_idx"
ON "project_ai_author_dialog" USING btree ("public_slug");
