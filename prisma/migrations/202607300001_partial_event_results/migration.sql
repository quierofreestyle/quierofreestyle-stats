-- Permite publicar una final decidida cuando el campeón está documentado y
-- el subcampeón todavía es desconocido. Las demás resoluciones conservan su
-- estructura completa.
CREATE OR REPLACE FUNCTION check_published_event_resolution()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_event uuid;
  event_status text;
  event_resolution text;
  champion_count integer;
  runner_up_count integer;
  plain_finalist_count integer;
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
         COUNT(*) FILTER (WHERE p.type = 'RUNNER_UP'),
         COUNT(*) FILTER (WHERE p.type = 'FINALIST'),
         COUNT(*) FILTER (WHERE p.type IN ('CHAMPION', 'RUNNER_UP', 'FINALIST')),
         COUNT(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM placement_member pm WHERE pm.placement_id = p.id
         ))
    INTO champion_count, runner_up_count, plain_finalist_count,
         finalist_count, empty_placement_count
    FROM placement p
    WHERE p.event_id = target_event AND p.status = 'ACTIVE';

  IF empty_placement_count > 0
     OR (event_resolution = 'DECIDED' AND (
       champion_count <> 1 OR runner_up_count > 1
       OR plain_finalist_count <> 0 OR finalist_count NOT BETWEEN 1 AND 2
     ))
     OR (event_resolution = 'SHARED_CHAMPIONSHIP' AND (
       champion_count < 2 OR runner_up_count <> 0
       OR plain_finalist_count <> 0 OR finalist_count <> champion_count
     ))
     OR (event_resolution = 'UNDECIDED' AND (
       champion_count <> 0 OR runner_up_count <> 0
       OR plain_finalist_count < 2 OR finalist_count <> plain_finalist_count
     )) THEN
    RAISE EXCEPTION 'Los placements no coinciden con la resolución publicada del evento %', target_event;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
