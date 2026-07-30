import { describe, expect, it } from "vitest";

import { normalizeSlug, optionalUrl, readSubjectForm } from "./subject-form";

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
});
