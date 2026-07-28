DROP INDEX "subject_slug_key";

CREATE UNIQUE INDEX "subject_type_slug_key" ON "subject"("type", "slug");
