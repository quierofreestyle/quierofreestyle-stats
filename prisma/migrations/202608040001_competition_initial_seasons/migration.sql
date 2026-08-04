-- Repara competencias creadas desde el panel antes de que el alta generara
-- automáticamente su temporada inicial. La condición NOT EXISTS hace que el
-- backfill sea seguro para competencias importadas o ya corregidas.
INSERT INTO "season" (
    "competition_id",
    "name",
    "starts_on",
    "ends_on",
    "status",
    "updated_at"
)
SELECT
    competition."subject_id",
    '2026',
    DATE '2026-01-01',
    DATE '2026-12-31',
    'ACTIVE'::"SeasonStatus",
    CURRENT_TIMESTAMP
FROM "competition" AS competition
WHERE NOT EXISTS (
    SELECT 1
    FROM "season"
    WHERE "season"."competition_id" = competition."subject_id"
);
