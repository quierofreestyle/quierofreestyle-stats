ALTER TABLE "badge_definition"
ADD COLUMN "public_rule" TEXT NOT NULL DEFAULT '',
ADD COLUMN "image_url" TEXT;

ALTER TABLE "badge_definition"
ALTER COLUMN "public_rule" DROP DEFAULT;
