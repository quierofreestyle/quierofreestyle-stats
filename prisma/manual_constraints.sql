-- Restricciones PostgreSQL que Prisma Schema Language no representa por completo.
-- Deben agregarse a la migración generada antes de aplicarla en cada ambiente.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Identidades y nombres.
-- PostgreSQL permite varios NULL en una clave única compuesta. Sin este índice,
-- dos países (que no tienen parent_id) podrían compartir slug.
CREATE UNIQUE INDEX region_country_slug_uq
  ON region (slug)
  WHERE type = 'COUNTRY';

CREATE UNIQUE INDEX subject_name_one_current_primary_uq
  ON subject_name (subject_id)
  WHERE kind = 'PRIMARY' AND valid_to IS NULL;

ALTER TABLE subject
  ADD CONSTRAINT subject_merge_state_ck CHECK (
    (status = 'MERGED' AND merged_into_id IS NOT NULL)
    OR (status <> 'MERGED' AND merged_into_id IS NULL)
  ),
  ADD CONSTRAINT subject_no_self_merge_ck CHECK (merged_into_id IS NULL OR merged_into_id <> id);

-- Cada subject debe tener exactamente el subtipo indicado por subject.type.
CREATE OR REPLACE FUNCTION check_subject_subtype()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_id uuid;
  target_type text;
  competitor_count integer;
  competition_count integer;
  organization_count integer;
BEGIN
  IF TG_TABLE_NAME = 'subject' THEN
    target_id := COALESCE(NEW.id, OLD.id);
  ELSE
    target_id := COALESCE(NEW.subject_id, OLD.subject_id);
  END IF;

  SELECT type::text INTO target_type FROM subject WHERE id = target_id;
  IF target_type IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT COUNT(*) INTO competitor_count FROM competitor WHERE subject_id = target_id;
  SELECT COUNT(*) INTO competition_count FROM competition WHERE subject_id = target_id;
  SELECT COUNT(*) INTO organization_count FROM organization WHERE subject_id = target_id;

  IF (target_type = 'COMPETITOR' AND competitor_count = 1 AND competition_count = 0 AND organization_count = 0)
     OR (target_type = 'COMPETITION' AND competitor_count = 0 AND competition_count = 1 AND organization_count = 0)
     OR (target_type = 'ORGANIZATION' AND competitor_count = 0 AND competition_count = 0 AND organization_count = 1) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  RAISE EXCEPTION 'El subject % no tiene exactamente el subtipo indicado por %', target_id, target_type;
END;
$$;

CREATE CONSTRAINT TRIGGER subject_subtype_from_subject_trg
AFTER INSERT OR UPDATE OF type ON subject
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

CREATE CONSTRAINT TRIGGER subject_subtype_from_competitor_trg
AFTER INSERT OR UPDATE OR DELETE ON competitor
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

CREATE CONSTRAINT TRIGGER subject_subtype_from_competition_trg
AFTER INSERT OR UPDATE OR DELETE ON competition
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

CREATE CONSTRAINT TRIGGER subject_subtype_from_organization_trg
AFTER INSERT OR UPDATE OR DELETE ON organization
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_subject_subtype();

-- Jerarquía territorial exacta y sin ciclos por construcción.
CREATE OR REPLACE FUNCTION check_region_hierarchy()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_type text;
BEGIN
  IF NEW.type = 'COUNTRY' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Un país no puede tener región padre';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NULL OR NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'La región % requiere una región padre válida', NEW.type;
  END IF;

  SELECT type::text INTO parent_type FROM region WHERE id = NEW.parent_id;
  IF (NEW.type = 'PROVINCE' AND parent_type <> 'COUNTRY')
     OR (NEW.type = 'CITY' AND parent_type <> 'PROVINCE')
     OR (NEW.type = 'NEIGHBORHOOD' AND parent_type <> 'CITY') THEN
    RAISE EXCEPTION 'Jerarquía territorial inválida: % no puede depender de %', NEW.type, parent_type;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER region_hierarchy_trg
BEFORE INSERT OR UPDATE OF parent_id, type ON region
FOR EACH ROW EXECUTE FUNCTION check_region_hierarchy();

-- Temporadas y fechas deportivas.
ALTER TABLE season
  ADD CONSTRAINT season_date_range_ck CHECK (
    starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on
  );

ALTER TABLE event
  ADD CONSTRAINT event_year_ck CHECK (event_year IS NULL OR event_year BETWEEN 1900 AND 2200),
  ADD CONSTRAINT event_month_ck CHECK (event_month IS NULL OR event_month BETWEEN 1 AND 12),
  ADD CONSTRAINT event_day_ck CHECK (event_day IS NULL OR event_day BETWEEN 1 AND 31),
  ADD CONSTRAINT event_date_precision_ck CHECK (
    (date_precision = 'UNKNOWN' AND event_year IS NULL AND event_month IS NULL AND event_day IS NULL AND occurred_on IS NULL)
    OR (date_precision = 'YEAR' AND event_year IS NOT NULL AND event_month IS NULL AND event_day IS NULL AND occurred_on IS NULL)
    OR (date_precision = 'MONTH' AND event_year IS NOT NULL AND event_month IS NOT NULL AND event_day IS NULL AND occurred_on IS NULL)
    OR (date_precision = 'DAY' AND event_year IS NOT NULL AND event_month IS NOT NULL AND event_day IS NOT NULL AND occurred_on IS NOT NULL)
  ),
  ADD CONSTRAINT event_exact_date_parts_ck CHECK (
    occurred_on IS NULL OR (
      EXTRACT(YEAR FROM occurred_on) = event_year
      AND EXTRACT(MONTH FROM occurred_on) = event_month
      AND EXTRACT(DAY FROM occurred_on) = event_day
    )
  );

ALTER TABLE placement
  ADD CONSTRAINT placement_position_ck CHECK (position > 0),
  ADD CONSTRAINT placement_slot_ck CHECK (slot > 0);

-- Un mismo competidor no puede integrar dos resultados activos del mismo evento.
CREATE OR REPLACE FUNCTION check_competitor_once_per_event()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_event uuid;
BEGIN
  SELECT event_id INTO target_event FROM placement WHERE id = NEW.placement_id;

  IF EXISTS (
    SELECT 1
    FROM placement_member pm
    JOIN placement p ON p.id = pm.placement_id
    WHERE pm.competitor_id = NEW.competitor_id
      AND p.event_id = target_event
      AND p.status = 'ACTIVE'
      AND pm.placement_id <> NEW.placement_id
  ) THEN
    RAISE EXCEPTION 'El competidor ya integra otro resultado activo del evento';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER placement_member_once_per_event_trg
AFTER INSERT OR UPDATE ON placement_member
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION check_competitor_once_per_event();

-- La misma regla debe comprobarse cuando un placement anulado vuelve a ACTIVE
-- o cuando se mueve a otro evento, aunque sus integrantes no cambien.
CREATE OR REPLACE FUNCTION check_placement_competitors_once_per_event()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND EXISTS (
    SELECT 1
    FROM placement_member current_member
    JOIN placement_member other_member
      ON other_member.competitor_id = current_member.competitor_id
    JOIN placement other_placement
      ON other_placement.id = other_member.placement_id
    WHERE current_member.placement_id = NEW.id
      AND other_placement.event_id = NEW.event_id
      AND other_placement.status = 'ACTIVE'
      AND other_placement.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Un competidor del resultado ya integra otro resultado activo del evento';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER placement_once_per_event_on_reactivation_trg
AFTER UPDATE OF event_id, status ON placement
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION check_placement_competitors_once_per_event();

-- Cuando un evento queda publicado/corregido, su resolución debe coincidir con
-- los placements activos. Los borradores pueden permanecer incompletos.
CREATE OR REPLACE FUNCTION check_published_event_resolution()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_event uuid;
  event_status text;
  event_resolution text;
  champion_count integer;
  finalist_count integer;
  empty_placement_count integer;
BEGIN
  IF TG_TABLE_NAME = 'event' THEN
    target_event := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'placement' THEN
    target_event := COALESCE(NEW.event_id, OLD.event_id);
  ELSE
    SELECT event_id INTO target_event
      FROM placement
      WHERE id = COALESCE(NEW.placement_id, OLD.placement_id);
  END IF;

  SELECT status::text, resolution::text
    INTO event_status, event_resolution
    FROM event WHERE id = target_event;

  IF event_status IS NULL OR event_status NOT IN ('PUBLISHED', 'CORRECTED') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT COUNT(*) FILTER (WHERE p.type = 'CHAMPION'),
         COUNT(*) FILTER (WHERE p.type IN ('CHAMPION', 'RUNNER_UP', 'FINALIST')),
         COUNT(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM placement_member pm WHERE pm.placement_id = p.id
         ))
    INTO champion_count, finalist_count, empty_placement_count
    FROM placement p
    WHERE p.event_id = target_event AND p.status = 'ACTIVE';

  IF empty_placement_count > 0 OR finalist_count < 2
     OR (event_resolution = 'DECIDED' AND champion_count <> 1)
     OR (event_resolution = 'SHARED_CHAMPIONSHIP' AND champion_count < 2)
     OR (event_resolution = 'UNDECIDED' AND champion_count <> 0) THEN
    RAISE EXCEPTION 'Los placements no coinciden con la resolución publicada del evento %', target_event;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE CONSTRAINT TRIGGER event_resolution_from_event_trg
AFTER INSERT OR UPDATE OF status, resolution ON event
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_published_event_resolution();

CREATE CONSTRAINT TRIGGER event_resolution_from_placement_trg
AFTER INSERT OR UPDATE OR DELETE ON placement
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_published_event_resolution();

CREATE CONSTRAINT TRIGGER event_resolution_from_member_trg
AFTER INSERT OR UPDATE OR DELETE ON placement_member
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_published_event_resolution();

-- Administración de perfiles: conserva historial, pero solo una autorización vigente.
CREATE UNIQUE INDEX subject_manager_one_active_uq
  ON subject_manager (user_id, subject_id)
  WHERE valid_to IS NULL;

ALTER TABLE subject_manager
  ADD CONSTRAINT subject_manager_validity_ck CHECK (valid_to IS NULL OR valid_from <= valid_to);

-- Reglas e instancias de insignias.
ALTER TABLE badge_definition
  ADD CONSTRAINT badge_definition_tie_policy_ck CHECK (
    (kind = 'UNIQUE' AND tie_policy IS NOT NULL)
    OR (kind <> 'UNIQUE' AND tie_policy IS NULL)
  );

ALTER TABLE badge_rule_version
  ADD CONSTRAINT badge_rule_dates_ck CHECK (
    effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
  );

ALTER TABLE badge_rule_version
  ADD CONSTRAINT badge_rule_no_overlapping_active_versions
  EXCLUDE USING gist (
    badge_definition_id WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  ) WHERE (status = 'ACTIVE');

ALTER TABLE badge_tier
  ADD CONSTRAINT badge_tier_rank_ck CHECK (rank > 0),
  ADD CONSTRAINT badge_tier_threshold_ck CHECK (threshold >= 0);

ALTER TABLE badge_scope
  ADD CONSTRAINT badge_scope_target_ck CHECK (
    (scope_type = 'GLOBAL' AND competition_id IS NULL AND organization_id IS NULL AND season_id IS NULL AND region_id IS NULL)
    OR (scope_type = 'COMPETITION' AND competition_id IS NOT NULL AND organization_id IS NULL AND season_id IS NULL AND region_id IS NULL)
    OR (scope_type = 'ORGANIZATION' AND competition_id IS NULL AND organization_id IS NOT NULL AND season_id IS NULL AND region_id IS NULL)
    OR (scope_type = 'SEASON' AND competition_id IS NULL AND organization_id IS NULL AND season_id IS NOT NULL AND region_id IS NULL)
    OR (scope_type = 'REGION' AND competition_id IS NULL AND organization_id IS NULL AND season_id IS NULL AND region_id IS NOT NULL)
  ),
  ADD CONSTRAINT badge_scope_period_ck CHECK (
    (period_type = 'NONE' AND period_year IS NULL AND period_month IS NULL)
    OR (period_type = 'YEAR' AND period_year IS NOT NULL AND period_month IS NULL)
    OR (period_type = 'MONTH' AND period_year IS NOT NULL AND period_month BETWEEN 1 AND 12)
  );

-- La ausencia de fila abierta representa una insignia única sin poseedor.
CREATE UNIQUE INDEX badge_holding_one_current_holder_uq
  ON badge_holding_period (badge_instance_id)
  WHERE ends_on IS NULL;

ALTER TABLE badge_holding_period
  ADD CONSTRAINT badge_holding_dates_ck CHECK (ends_on IS NULL OR starts_on < ends_on),
  ADD CONSTRAINT badge_holding_no_overlap
  EXCLUDE USING gist (
    badge_instance_id WITH =,
    daterange(starts_on, ends_on, '[)') WITH &&
  );

-- Idempotencia para obtenciones automáticas. Las editoriales se auditan por separado.
CREATE UNIQUE INDEX badge_award_automatic_idempotency_uq
  ON badge_award (badge_instance_id, recipient_subject_id, source_event_id, rule_version_id)
  WHERE source_event_id IS NOT NULL AND rule_version_id IS NOT NULL;

ALTER TABLE badge_award
  ADD CONSTRAINT badge_award_editorial_justification_ck CHECK (
    assigned_by_id IS NULL
    OR (public_justification IS NOT NULL AND btrim(public_justification) <> '')
  );

-- Recalculo y auditoría.
ALTER TABLE recalculation_run
  ADD CONSTRAINT recalculation_time_order_ck CHECK (
    (started_at IS NULL OR queued_at <= started_at)
    AND (finished_at IS NULL OR started_at IS NOT NULL)
    AND (finished_at IS NULL OR started_at <= finished_at)
  );

-- audit_log debe exponerse a la aplicación con permisos INSERT/SELECT únicamente.
-- No se conceden UPDATE ni DELETE al rol de runtime.
