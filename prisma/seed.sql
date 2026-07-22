-- Catálogo inicial de Quiero Freestyle Stats.
-- Idempotente: puede ejecutarse varias veces sin duplicar registros.

BEGIN;

INSERT INTO metric_definition
  (id, code, name, description, value_type, implementation_key, version, is_active)
VALUES
  (gen_random_uuid(), 'TITLES_WON', 'Campeonatos ganados',
   'Cantidad de títulos oficiales obtenidos.', 'INTEGER', 'titlesWon', 1, true),
  (gen_random_uuid(), 'FINALS_REACHED', 'Finales alcanzadas',
   'Cantidad de finales disputadas, incluso compartidas o sin campeón.', 'INTEGER', 'finalsReached', 1, true),
  (gen_random_uuid(), 'CONSECUTIVE_FINALS_WON', 'Finales ganadas consecutivamente',
   'Mayor racha de finales ganadas de forma consecutiva.', 'INTEGER', 'consecutiveFinalsWon', 1, true),
  (gen_random_uuid(), 'IS_FIRST_CHAMPION', 'Primer campeón',
   'Indica si fue el primer campeón decidido de una competencia.', 'BOOLEAN', 'isFirstChampion', 1, true),
  (gen_random_uuid(), 'EVENTS_ORGANIZED', 'Eventos organizados',
   'Cantidad de eventos organizados por una competencia u organización.', 'INTEGER', 'eventsOrganized', 1, true),
  (gen_random_uuid(), 'COMPETITIONS_ORGANIZED', 'Competencias organizadas',
   'Cantidad de competencias pertenecientes a una organización.', 'INTEGER', 'competitionsOrganized', 1, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  implementation_key = EXCLUDED.implementation_key,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active;

INSERT INTO metric_recipient_type (metric_id, recipient_type)
SELECT id, 'COMPETITOR'::"SubjectType"
FROM metric_definition
WHERE code IN ('TITLES_WON', 'FINALS_REACHED', 'CONSECUTIVE_FINALS_WON', 'IS_FIRST_CHAMPION')
ON CONFLICT DO NOTHING;

INSERT INTO metric_recipient_type (metric_id, recipient_type)
SELECT id, recipient_type
FROM metric_definition
CROSS JOIN (VALUES
  ('COMPETITION'::"SubjectType"),
  ('ORGANIZATION'::"SubjectType")
) AS recipients(recipient_type)
WHERE code = 'EVENTS_ORGANIZED'
ON CONFLICT DO NOTHING;

INSERT INTO metric_recipient_type (metric_id, recipient_type)
SELECT id, 'ORGANIZATION'::"SubjectType"
FROM metric_definition
WHERE code = 'COMPETITIONS_ORGANIZED'
ON CONFLICT DO NOTHING;

INSERT INTO role (id, code, name, description)
VALUES
  (gen_random_uuid(), 'SUPER_ADMIN', 'Superadministrador', 'Acceso completo a administración, datos y auditoría.'),
  (gen_random_uuid(), 'DATA_EDITOR', 'Editor de datos', 'Crea y corrige identidades, competencias, eventos y resultados.'),
  (gen_random_uuid(), 'REVIEWER', 'Revisor', 'Revisa propuestas, reclamos y publicaciones.'),
  (gen_random_uuid(), 'SUBJECT_MANAGER', 'Gestor de perfil', 'Administra el perfil autorizado de un competidor, competencia u organización.'),
  (gen_random_uuid(), 'REGISTERED_USER', 'Usuario registrado', 'Consulta información y envía propuestas de colaboración.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO permission (id, code, name, description)
VALUES
  (gen_random_uuid(), 'SUBJECT_READ', 'Consultar perfiles', 'Consulta identidades y perfiles públicos.'),
  (gen_random_uuid(), 'SUBJECT_MANAGE', 'Administrar perfiles', 'Crea y modifica identidades y perfiles.'),
  (gen_random_uuid(), 'EVENT_READ', 'Consultar eventos', 'Consulta competencias, eventos y resultados.'),
  (gen_random_uuid(), 'EVENT_MANAGE', 'Administrar eventos', 'Crea y corrige competencias, eventos y resultados.'),
  (gen_random_uuid(), 'EVENT_PUBLISH', 'Publicar eventos', 'Publica o anula resultados oficiales.'),
  (gen_random_uuid(), 'BADGE_READ', 'Consultar insignias', 'Consulta insignias, posesiones y progreso.'),
  (gen_random_uuid(), 'BADGE_MANAGE', 'Administrar insignias', 'Crea definiciones, reglas, niveles e instancias.'),
  (gen_random_uuid(), 'BADGE_RECALCULATE', 'Recalcular insignias', 'Ejecuta reconstrucciones y recálculos.'),
  (gen_random_uuid(), 'CLAIM_REVIEW', 'Revisar reclamos', 'Aprueba o rechaza reclamos de perfiles.'),
  (gen_random_uuid(), 'SUBMISSION_CREATE', 'Crear propuestas', 'Envía propuestas de altas y correcciones.'),
  (gen_random_uuid(), 'SUBMISSION_REVIEW', 'Revisar propuestas', 'Aprueba o rechaza propuestas de datos.'),
  (gen_random_uuid(), 'USER_MANAGE', 'Administrar usuarios', 'Gestiona usuarios, roles y autorizaciones.'),
  (gen_random_uuid(), 'AUDIT_READ', 'Consultar auditoría', 'Consulta el historial administrativo y de recálculos.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- El superadministrador recibe todas las capacidades.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- Capacidades operativas por rol.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  ('DATA_EDITOR', 'SUBJECT_READ'),
  ('DATA_EDITOR', 'SUBJECT_MANAGE'),
  ('DATA_EDITOR', 'EVENT_READ'),
  ('DATA_EDITOR', 'EVENT_MANAGE'),
  ('DATA_EDITOR', 'BADGE_READ'),
  ('DATA_EDITOR', 'SUBMISSION_CREATE'),
  ('REVIEWER', 'SUBJECT_READ'),
  ('REVIEWER', 'EVENT_READ'),
  ('REVIEWER', 'EVENT_PUBLISH'),
  ('REVIEWER', 'BADGE_READ'),
  ('REVIEWER', 'CLAIM_REVIEW'),
  ('REVIEWER', 'SUBMISSION_REVIEW'),
  ('SUBJECT_MANAGER', 'SUBJECT_READ'),
  ('SUBJECT_MANAGER', 'SUBJECT_MANAGE'),
  ('SUBJECT_MANAGER', 'EVENT_READ'),
  ('SUBJECT_MANAGER', 'BADGE_READ'),
  ('SUBJECT_MANAGER', 'SUBMISSION_CREATE'),
  ('REGISTERED_USER', 'SUBJECT_READ'),
  ('REGISTERED_USER', 'EVENT_READ'),
  ('REGISTERED_USER', 'BADGE_READ'),
  ('REGISTERED_USER', 'SUBMISSION_CREATE')
) AS grants(role_code, permission_code)
JOIN role r ON r.code = grants.role_code
JOIN permission p ON p.code = grants.permission_code
ON CONFLICT DO NOTHING;

COMMIT;
