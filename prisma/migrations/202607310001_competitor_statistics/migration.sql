CREATE TABLE "competitor_statistic" (
    "competitor_id" UUID NOT NULL,
    "championships" INTEGER NOT NULL DEFAULT 0,
    "runner_ups" INTEGER NOT NULL DEFAULT 0,
    "finals" INTEGER NOT NULL DEFAULT 0,
    "individual_titles" INTEGER NOT NULL DEFAULT 0,
    "group_titles" INTEGER NOT NULL DEFAULT 0,
    "first_final_on" DATE,
    "last_final_on" DATE,
    "championships_reached_at" DATE,
    "runner_ups_reached_at" DATE,
    "finals_reached_at" DATE,
    "calculated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" UUID NOT NULL,

    CONSTRAINT "competitor_statistic_pkey" PRIMARY KEY ("competitor_id")
);

CREATE INDEX "competitor_statistic_championships_championships_reached_at_idx"
ON "competitor_statistic"("championships", "championships_reached_at");

CREATE INDEX "competitor_statistic_finals_finals_reached_at_idx"
ON "competitor_statistic"("finals", "finals_reached_at");

ALTER TABLE "competitor_statistic"
ADD CONSTRAINT "competitor_statistic_competitor_id_fkey"
FOREIGN KEY ("competitor_id") REFERENCES "competitor"("subject_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "competitor_statistic"
ADD CONSTRAINT "competitor_statistic_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "recalculation_run"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
