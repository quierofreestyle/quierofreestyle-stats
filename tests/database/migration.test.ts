import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import EmbeddedPostgres from "embedded-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationsPath = resolve("prisma/migrations");
const seedPath = resolve("prisma/seed.sql");

let postgres: EmbeddedPostgres;
let client: ReturnType<EmbeddedPostgres["getPgClient"]>;
let databaseDir: string;

async function createSubject(
  type: "COMPETITOR" | "COMPETITION" | "ORGANIZATION",
  name: string,
  organizationId?: string,
) {
  await client.query("BEGIN");
  try {
    const subject = await client.query<{ id: string }>(
      `INSERT INTO subject (type, slug, display_name, status, updated_at)
       VALUES ($1::"SubjectType", $2, $3, 'ACTIVE', CURRENT_TIMESTAMP)
       RETURNING id`,
      [type, `${name.toLowerCase().replaceAll(" ", "-")}-${crypto.randomUUID()}`, name],
    );
    const id = subject.rows[0].id;

    if (type === "COMPETITOR") {
      await client.query("INSERT INTO competitor (subject_id) VALUES ($1)", [id]);
    } else if (type === "ORGANIZATION") {
      await client.query("INSERT INTO organization (subject_id) VALUES ($1)", [id]);
    } else {
      await client.query(
        "INSERT INTO competition (subject_id, organization_id) VALUES ($1, $2)",
        [id, organizationId],
      );
    }

    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function createPublishedEvent(
  competitionId: string,
  resolution: "DECIDED" | "SHARED_CHAMPIONSHIP" | "UNDECIDED",
  competitors: [string, string],
) {
  await client.query("BEGIN");
  try {
    const event = await client.query<{ id: string }>(
      `INSERT INTO event
         (competition_id, slug, title, resolution, status, updated_at)
       VALUES ($1, $2, $3, $4::"EventResolution", 'DRAFT', CURRENT_TIMESTAMP)
       RETURNING id`,
      [competitionId, `event-${crypto.randomUUID()}`, `Evento ${resolution}`, resolution],
    );

    const types =
      resolution === "DECIDED"
        ? (["CHAMPION", "RUNNER_UP"] as const)
        : resolution === "SHARED_CHAMPIONSHIP"
          ? (["CHAMPION", "CHAMPION"] as const)
          : (["FINALIST", "FINALIST"] as const);

    for (let index = 0; index < 2; index += 1) {
      const placement = await client.query<{ id: string }>(
        `INSERT INTO placement (event_id, position, slot, type)
         VALUES ($1, $2, $3, $4::"PlacementType")
         RETURNING id`,
        [event.rows[0].id, index + 1, 1, types[index]],
      );
      await client.query(
        "INSERT INTO placement_member (placement_id, competitor_id) VALUES ($1, $2)",
        [placement.rows[0].id, competitors[index]],
      );
    }

    await client.query(
      "UPDATE event SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP WHERE id = $1",
      [event.rows[0].id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

describe("migración inicial de PostgreSQL", () => {
  beforeAll(async () => {
    databaseDir = await mkdtemp(join(tmpdir(), "qf-postgres-"));
    const port = 54_000 + Math.floor(Math.random() * 1_000);

    postgres = new EmbeddedPostgres({
      databaseDir,
      user: "postgres",
      password: "postgres",
      port,
      persistent: false,
      onLog: () => undefined,
    });

    await postgres.initialise();
    await postgres.start();
    client = postgres.getPgClient();
    await client.connect();
    const migrationDirectories = (
      await readdir(migrationsPath, { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const directory of migrationDirectories) {
      await client.query(
        await readFile(join(migrationsPath, directory, "migration.sql"), "utf8"),
      );
    }
  }, 120_000);

  afterAll(async () => {
    await client?.end();
    await postgres?.stop();
    if (databaseDir) await rm(databaseDir, { recursive: true, force: true });
  });

  it("crea las 43 tablas y las extensiones requeridas", async () => {
    const tables = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const extensions = await client.query<{ extname: string }>(
      `SELECT extname FROM pg_extension
       WHERE extname IN ('pgcrypto', 'citext', 'btree_gist')`,
    );

    expect(Number(tables.rows[0].count)).toBe(43);
    expect(extensions.rows.map(({ extname }) => extname).sort()).toEqual([
      "btree_gist",
      "citext",
      "pgcrypto",
    ]);
  });

  it("crea el almacenamiento derivado de estadísticas por competidor", async () => {
    const columns = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'competitor_statistic'
       ORDER BY column_name`,
    );

    expect(columns.rows.map(({ column_name }) => column_name)).toEqual(
      expect.arrayContaining([
        "championships",
        "competitor_id",
        "finals",
        "group_titles",
        "individual_titles",
        "run_id",
        "runner_ups",
      ]),
    );
  });

  it("permite repetir un slug entre tipos de sujeto, pero no dentro del mismo tipo", async () => {
    const slug = `slug-compartido-${crypto.randomUUID()}`;
    const insert = async (type: "COMPETITOR" | "ORGANIZATION") => {
      await client.query("BEGIN");
      try {
        const subject = await client.query<{ id: string }>(
          `INSERT INTO subject (type, slug, display_name, status, updated_at)
           VALUES ($1::"SubjectType", $2, $3, 'ACTIVE', CURRENT_TIMESTAMP)
           RETURNING id`,
          [type, slug, `${type} de prueba`],
        );
        const subjectId = subject.rows[0].id;
        if (type === "COMPETITOR") {
          await client.query("INSERT INTO competitor (subject_id) VALUES ($1)", [
            subjectId,
          ]);
        } else {
          await client.query("INSERT INTO organization (subject_id) VALUES ($1)", [
            subjectId,
          ]);
        }
        await client.query("COMMIT");
        return subjectId;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    };

    await expect(insert("COMPETITOR")).resolves.toBeDefined();
    await expect(insert("ORGANIZATION")).resolves.toBeDefined();
    await expect(insert("COMPETITOR")).rejects.toThrow(/subject_type_slug_key/i);
  });

  it("ejecuta el seed dos veces sin duplicar catálogos", async () => {
    const seed = await readFile(seedPath, "utf8");
    await client.query(seed);
    await client.query(seed);

    const result = await client.query<{
      metrics: string;
      roles: string;
      permissions: string;
    }>(`SELECT
      (SELECT COUNT(*) FROM metric_definition)::text AS metrics,
      (SELECT COUNT(*) FROM role)::text AS roles,
      (SELECT COUNT(*) FROM permission)::text AS permissions`);

    expect(result.rows[0]).toEqual({ metrics: "6", roles: "5", permissions: "13" });
  });

  it("acepta finales decididas, compartidas e indefinidas", async () => {
    const organization = await createSubject("ORGANIZATION", "Organización de prueba");
    const competition = await createSubject(
      "COMPETITION",
      "Competencia de prueba",
      organization,
    );
    const first = await createSubject("COMPETITOR", "Competidor uno");
    const second = await createSubject("COMPETITOR", "Competidor dos");

    await expect(
      createPublishedEvent(competition, "DECIDED", [first, second]),
    ).resolves.toBeUndefined();
    await expect(
      createPublishedEvent(competition, "SHARED_CHAMPIONSHIP", [first, second]),
    ).resolves.toBeUndefined();
    await expect(
      createPublishedEvent(competition, "UNDECIDED", [first, second]),
    ).resolves.toBeUndefined();
  });

  it("acepta una final decidida publicada sin subcampeón conocido", async () => {
    const organization = await createSubject(
      "ORGANIZATION",
      "Organización resultado parcial",
    );
    const competition = await createSubject(
      "COMPETITION",
      "Competencia resultado parcial",
      organization,
    );
    const champion = await createSubject("COMPETITOR", "Campeón documentado");

    await client.query("BEGIN");
    const event = await client.query<{ id: string }>(
      `INSERT INTO event
         (competition_id, slug, title, resolution, status, updated_at)
       VALUES ($1, $2, 'Evento parcial', 'DECIDED', 'DRAFT', CURRENT_TIMESTAMP)
       RETURNING id`,
      [competition, `partial-${crypto.randomUUID()}`],
    );
    const placement = await client.query<{ id: string }>(
      `INSERT INTO placement (event_id, position, slot, type)
       VALUES ($1, 1, 1, 'CHAMPION')
       RETURNING id`,
      [event.rows[0].id],
    );
    await client.query(
      "INSERT INTO placement_member (placement_id, competitor_id) VALUES ($1, $2)",
      [placement.rows[0].id, champion],
    );
    await client.query(
      "UPDATE event SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP WHERE id = $1",
      [event.rows[0].id],
    );

    await expect(client.query("COMMIT")).resolves.toBeDefined();
  });

  it("rechaza una resolución publicada sin resultados consistentes", async () => {
    const competition = await client.query<{ subject_id: string }>(
      "SELECT subject_id FROM competition LIMIT 1",
    );

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO event
         (competition_id, slug, title, resolution, status, updated_at)
       VALUES ($1, $2, 'Evento inválido', 'DECIDED', 'PUBLISHED', CURRENT_TIMESTAMP)`,
      [competition.rows[0].subject_id, `invalid-${crypto.randomUUID()}`],
    );

    await expect(client.query("COMMIT")).rejects.toThrow(/placements/i);
    await client.query("ROLLBACK");
  });

  it("representa una insignia única nacida empatada sin poseedor", async () => {
    const user = await client.query<{ id: string }>(
      `INSERT INTO app_user (auth_subject, status, updated_at)
       VALUES ($1, 'ACTIVE', CURRENT_TIMESTAMP) RETURNING id`,
      [`test-${crypto.randomUUID()}`],
    );
    const definition = await client.query<{ id: string }>(
      `INSERT INTO badge_definition
         (code, kind, assignment_mode, name_template, description_template,
          recipient_type, permanence_mode, tie_policy, status, created_by_id, updated_at)
       VALUES ($1, 'UNIQUE', 'AUTOMATIC', 'Récord', 'Récord global', 'COMPETITOR',
               'PERMANENT', 'FIRST_REACHED_NO_INITIAL_HOLDER', 'ACTIVE', $2, CURRENT_TIMESTAMP)
       RETURNING id`,
      [`UNIQUE_TEST_${crypto.randomUUID()}`, user.rows[0].id],
    );
    const instance = await client.query<{ id: string }>(
      `INSERT INTO badge_instance
         (badge_definition_id, slug, display_name, description, status, updated_at)
       VALUES ($1, $2, 'Récord global', 'Sin poseedor por empate inicial', 'ACTIVE', CURRENT_TIMESTAMP)
       RETURNING id`,
      [definition.rows[0].id, `unique-test-${crypto.randomUUID()}`],
    );
    await client.query(
      `INSERT INTO badge_scope (badge_instance_id, scope_type, period_type)
       VALUES ($1, 'GLOBAL', 'NONE')`,
      [instance.rows[0].id],
    );

    const holdings = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM badge_holding_period WHERE badge_instance_id = $1",
      [instance.rows[0].id],
    );
    expect(holdings.rows[0].count).toBe("0");
  });
});
