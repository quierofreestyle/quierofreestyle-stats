import { describe, expect, it } from "vitest";

import {
  initialSeasonForYear,
  normalizeSlug,
  optionalUrl,
  readSubjectForm,
} from "./subject-form";

describe("formularios administrativos de sujetos", () => {
  it("normaliza nombres para construir slugs estables", () => {
    expect(normalizeSlug("  Red Bull Batalla: Córdoba  ")).toBe(
      "red-bull-batalla-cordoba",
    );
  });

  it("rechaza nombres incompletos", () => {
    const form = new FormData();
    form.set("displayName", "A");
    expect(() => readSubjectForm(form)).toThrow(/entre 2 y 120/);
  });

  it("solo admite URLs web", () => {
    expect(() => optionalUrl("javascript:alert(1)")).toThrow(/http/);
    expect(optionalUrl("https://example.com")).toBe("https://example.com/");
  });

  it("construye la temporada inicial con los límites exactos del año", () => {
    expect(initialSeasonForYear(2026)).toEqual({
      name: "2026",
      startsOn: new Date("2026-01-01T00:00:00.000Z"),
      endsOn: new Date("2026-12-31T00:00:00.000Z"),
      status: "ACTIVE",
    });
  });
});
