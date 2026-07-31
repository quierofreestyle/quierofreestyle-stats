ALTER TABLE "competitor_statistic"
ADD COLUMN "individual_titles_reached_at" DATE,
ADD COLUMN "group_titles_reached_at" DATE;

CREATE INDEX "competitor_statistic_individual_titles_individual_titles_reached_at_idx"
ON "competitor_statistic"("individual_titles", "individual_titles_reached_at");

CREATE INDEX "competitor_statistic_group_titles_group_titles_reached_at_idx"
ON "competitor_statistic"("group_titles", "group_titles_reached_at");

