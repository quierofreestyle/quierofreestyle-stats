import { describe, expect, it } from "vitest";

import { normalizeBadgeCode, normalizeBadgeSlug, readBadgeForm } from "./badge-form";

function baseForm() {
  const data = new FormData();
  data.set("name", "Máximo ganador"); data.set("code", "MAXIMO_GANADOR"); data.set("slug", "maximo-ganador");
  data.set("description", "Reconoce al mayor ganador."); data.set("publicRule", "Pertenece a quien tenga más títulos.");
  data.set("kind", "UNIQUE"); data.set("assignmentMode", "AUTOMATIC"); data.set("recipientType", "COMPETITOR");
  data.set("permanenceMode", "PERMANENT"); data.set("status", "DRAFT"); data.set("scopeType", "GLOBAL");
  data.set("metricId", "metric-id"); data.set("operator", "TOP_ONE"); data.set("reason", "Versión inicial");
  return data;
}

describe("badge form", () => {
  it("normalizes public identifiers", () => {
    expect(normalizeBadgeCode("Máximo ganador 2026")).toBe("MAXIMO_GANADOR_2026");
    expect(normalizeBadgeSlug("Máximo ganador 2026")).toBe("maximo-ganador-2026");
  });

  it("reads a valid automatic unique badge", () => {
    const badge = readBadgeForm(baseForm());
    expect(badge).toMatchObject({ kind: "UNIQUE", assignmentMode: "AUTOMATIC", operator: "TOP_ONE", scopeType: "GLOBAL" });
  });

  it("requires strictly increasing tier thresholds", () => {
    const data = baseForm(); data.set("kind", "TIERED"); data.set("operator", "GTE");
    data.append("tierName", "Bronce"); data.append("tierThreshold", "3"); data.append("tierColor", "#cd7f32");
    data.append("tierName", "Plata"); data.append("tierThreshold", "3"); data.append("tierColor", "#c0c0c0");
    expect(() => readBadgeForm(data)).toThrow("estrictamente crecientes");
  });

  it("does not accept a unique badge without top-one semantics", () => {
    const data = baseForm(); data.set("operator", "GTE");
    expect(() => readBadgeForm(data)).toThrow("Máximo actual");
  });

  it("accepts editorial achievements without a metric", () => {
    const data = baseForm(); data.set("kind", "ACHIEVEMENT"); data.set("assignmentMode", "EDITORIAL");
    data.delete("metricId"); data.delete("operator"); data.delete("reason");
    expect(readBadgeForm(data).metricId).toBeNull();
  });
});
