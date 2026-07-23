import { createHash } from "node:crypto";

import { z } from "zod";

const legacyCompetitionSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  slug: z.string().min(1),
  zona: z.string(),
  ciudad: z.string(),
  dia_habitual: z.string(),
  descripcion: z.string(),
});

const legacyCompetitorSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  slug: z.string().min(1),
  activo: z.boolean(),
  zona: z.string(),
  pais: z.string(),
  frase: z.string(),
  estilo: z.string(),
  instagram: z.string(),
  ciudad: z.string(),
  foto: z.string(),
});

const legacyFinalistSchema = z.object({
  competidor_id: z.string(),
  competidor_nombre: z.string(),
});

const legacyEventSchema = z.object({
  id: z.string().min(1),
  fecha: z.iso.date(),
  fecha_visible: z.string(),
  competencia_id: z.string().min(1),
  competencia_nombre: z.string().min(1),
  ganadores: z.array(legacyFinalistSchema).min(1),
  subcampeones: z.array(legacyFinalistSchema),
  modalidad: z.string().min(1),
  modalidad_base: z.string().min(1),
  relevancia: z.string().min(1),
  ubicacion: z.string(),
});

export const legacyDataSchema = z.object({
  competitions: z.array(legacyCompetitionSchema),
  competitors: z.array(legacyCompetitorSchema),
  events: z.array(legacyEventSchema),
});

export type LegacyData = z.infer<typeof legacyDataSchema>;

export type ImportIssue = {
  entityKind: "event";
  legacyKey: string;
  issueType: "MISSING_RUNNER_UP" | "INVALID_FINALIST_ID";
  detail: string;
};

export type PlannedEvent = LegacyData["events"][number] & {
  format: "SOLO" | "DUO" | "TRIO" | "OTHER";
  officialScope: "LOCAL" | "REGIONAL";
  scopeNotes: string | null;
  publish: boolean;
  validWinners: LegacyData["events"][number]["ganadores"];
  validRunnersUp: LegacyData["events"][number]["subcampeones"];
};

export type LegacyImportPlan = {
  competitions: LegacyData["competitions"];
  competitors: LegacyData["competitors"];
  events: PlannedEvent[];
  issues: ImportIssue[];
  report: {
    competitions: number;
    provisionalOrganizations: number;
    competitors: number;
    events: number;
    publishedEvents: number;
    draftEvents: number;
    issues: number;
  };
};

const officialScopes = new Map([
  ["local", "LOCAL" as const],
  ["regional", "REGIONAL" as const],
]);

function eventFormat(value: string): PlannedEvent["format"] {
  if (value === "1vs1") return "SOLO";
  if (value === "2vs2") return "DUO";
  if (value === "3vs3") return "TRIO";
  return "OTHER";
}

function assertUnique(values: string[], label: string) {
  const duplicated = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicated) throw new Error(`${label} duplicado: ${duplicated}`);
}

export function buildLegacyImportPlan(input: unknown): LegacyImportPlan {
  const data = legacyDataSchema.parse(input);
  assertUnique(data.competitions.map(({ id }) => id), "ID de competencia");
  assertUnique(data.competitors.map(({ id }) => id), "ID de competidor");
  assertUnique(data.events.map(({ id }) => id), "ID de evento");
  assertUnique(
    [
      ...data.competitions.flatMap(({ slug }) => [slug, organizationSlug(slug)]),
      ...data.competitors.map(({ slug }) => slug),
    ],
    "Slug global",
  );

  const competitionIds = new Set(data.competitions.map(({ id }) => id));
  const competitorIds = new Set(data.competitors.map(({ id }) => id));
  const issues: ImportIssue[] = [];

  const events = data.events.map((event): PlannedEvent => {
    if (!competitionIds.has(event.competencia_id)) {
      throw new Error(
        `El evento ${event.id} referencia la competencia inexistente ${event.competencia_id}`,
      );
    }

    const finalists = [...event.ganadores, ...event.subcampeones];
    const invalidFinalists = finalists.filter(
      ({ competidor_id }) => !competidor_id || !competitorIds.has(competidor_id),
    );

    if (invalidFinalists.length > 0) {
      issues.push({
        entityKind: "event",
        legacyKey: event.id,
        issueType: "INVALID_FINALIST_ID",
        detail: `Finalistas inválidos: ${invalidFinalists
          .map(({ competidor_nombre }) => competidor_nombre || "(sin nombre)")
          .join(", ")}`,
      });
    }

    if (event.subcampeones.length === 0) {
      issues.push({
        entityKind: "event",
        legacyKey: event.id,
        issueType: "MISSING_RUNNER_UP",
        detail: "El evento no informa subcampeón.",
      });
    }

    const normalizedScope = event.relevancia.trim().toLocaleLowerCase("es");
    const officialScope = officialScopes.get(normalizedScope) ?? "LOCAL";
    const scopeNotes = officialScopes.has(normalizedScope)
      ? null
      : `Alcance de origen: ${event.relevancia}`;

    return {
      ...event,
      format: eventFormat(event.modalidad_base),
      officialScope,
      scopeNotes,
      publish: event.subcampeones.length > 0 && invalidFinalists.length === 0,
      validWinners: event.ganadores.filter(({ competidor_id }) =>
        competitorIds.has(competidor_id),
      ),
      validRunnersUp: event.subcampeones.filter(({ competidor_id }) =>
        competitorIds.has(competidor_id),
      ),
    };
  });

  const publishedEvents = events.filter(({ publish }) => publish).length;
  return {
    competitions: data.competitions,
    competitors: data.competitors,
    events,
    issues,
    report: {
      competitions: data.competitions.length,
      provisionalOrganizations: data.competitions.length,
      competitors: data.competitors.length,
      events: events.length,
      publishedEvents,
      draftEvents: events.length - publishedEvents,
      issues: issues.length,
    },
  };
}

export function payloadHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function organizationSlug(competitionSlug: string) {
  return `org-${competitionSlug}`;
}
