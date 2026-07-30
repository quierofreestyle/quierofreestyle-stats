import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildLegacyImportPlan,
  organizationSlug,
  payloadHash,
} from "../../src/server/import/legacy-data";

function readJson(name: string) {
  return JSON.parse(readFileSync(resolve("data", name), "utf8")) as unknown;
}

const source = {
  competitions: readJson("competencias.json"),
  competitors: readJson("competidores.json"),
  events: readJson("eventos.json"),
};

describe("importador histórico", () => {
  it("produce el volumen histórico esperado", () => {
    expect(buildLegacyImportPlan(source).report).toEqual({
      competitions: 8,
      provisionalOrganizations: 8,
      competitors: 51,
      events: 55,
      publishedEvents: 54,
      draftEvents: 1,
      issues: 7,
    });
  });

  it("crea una organización provisional estable por competencia", () => {
    const plan = buildLegacyImportPlan(source);
    expect(plan.competitions.map(({ slug }) => organizationSlug(slug))).toHaveLength(8);
    expect(organizationSlug("sativa-free")).toBe("org-sativa-free");
  });

  it("publica resultados con campeón conocido aunque falte el subcampeón", () => {
    const plan = buildLegacyImportPlan(source);
    expect(plan.events.filter(({ publish }) => !publish)).toHaveLength(1);
    expect(
      plan.events.find(({ id }) => id === "sativa-free-2026-01-05-1"),
    ).toMatchObject({ publish: true, validRunnersUp: [] });
    expect(
      plan.issues.find(
        ({ legacyKey, issueType }) =>
          legacyKey === "repartiendo-rimas-2026-03-13-18" &&
          issueType === "INVALID_FINALIST_ID",
      ),
    ).toBeDefined();
  });

  it("normaliza solo alcances oficiales y conserva el texto original restante", () => {
    const plan = buildLegacyImportPlan(source);
    const regional = plan.events.find(({ relevancia }) => relevancia === "Regional");
    const preRegional = plan.events.find(({ relevancia }) => relevancia === "Pre Regional");
    expect(regional).toMatchObject({ officialScope: "REGIONAL", scopeNotes: null });
    expect(preRegional).toMatchObject({
      officialScope: "LOCAL",
      scopeNotes: "Alcance de origen: Pre Regional",
    });
  });

  it("genera hashes deterministas para detectar cambios de origen", () => {
    expect(payloadHash(source)).toBe(payloadHash(source));
    expect(payloadHash(source)).not.toBe(payloadHash({ ...source, events: [] }));
  });

  it("rechaza slugs que colisionen entre tipos de sujeto", () => {
    const competitions = structuredClone(source.competitions) as Array<{
      slug: string;
      [key: string]: unknown;
    }>;
    const competitors = structuredClone(source.competitors) as Array<{
      slug: string;
      [key: string]: unknown;
    }>;
    competitors[0].slug = competitions[0].slug;
    expect(() =>
      buildLegacyImportPlan({ ...source, competitions, competitors }),
    ).toThrow(/Slug global duplicado/);
  });
});
