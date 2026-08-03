import { describe, expect, it } from "vitest";

import { evaluateAutomaticBadge, isSupportedBadgeMetric } from "./assignment-engine";

const snapshot = (value: number) => ({
  recipientSubjectId: "competitor-1",
  value,
  reachedOn: new Date("2026-07-01T00:00:00.000Z"),
  milestones: Array.from({ length: value }, (_, index) => ({
    value: index + 1,
    reachedOn: new Date(`2026-0${index + 1}-01T00:00:00.000Z`),
    sourceEventId: `event-${index + 1}`,
  })),
});

describe("motor de asignación de insignias", () => {
  it("asigna y retira una insignia de logro según su umbral", () => {
    const rule = {
      badgeInstanceId: "badge-1",
      ruleVersionId: "rule-1",
      kind: "ACHIEVEMENT" as const,
      operator: "GTE" as const,
      threshold: 3,
      tiers: [],
    };

    expect(evaluateAutomaticBadge(rule, [snapshot(3)])[0].qualifies).toBe(true);
    expect(evaluateAutomaticBadge(rule, [snapshot(2)])[0].qualifies).toBe(false);
  });

  it("elige el mayor nivel alcanzado y conserva la lista de niveles obtenidos", () => {
    const result = evaluateAutomaticBadge(
      {
        badgeInstanceId: "badge-1",
        ruleVersionId: "rule-1",
        kind: "TIERED",
        operator: "GTE",
        threshold: null,
        tiers: [
          { id: "gold", rank: 3, threshold: 5 },
          { id: "bronze", rank: 1, threshold: 1 },
          { id: "silver", rank: 2, threshold: 3 },
          { id: "diamond", rank: 4, threshold: 10 },
        ],
      },
      [snapshot(6)],
    )[0];

    expect(result).toMatchObject({
      qualifies: true,
      currentTierId: "gold",
      achievedTierIds: ["bronze", "silver", "gold"],
    });
    expect(result.tierAchievements).toEqual([
      expect.objectContaining({ tierId: "bronze", sourceEventId: "event-1" }),
      expect.objectContaining({ tierId: "silver", sourceEventId: "event-3" }),
      expect.objectContaining({ tierId: "gold", sourceEventId: "event-5" }),
    ]);
  });

  it("deja sin nivel a quien todavía no alcanza el primer umbral", () => {
    const result = evaluateAutomaticBadge(
      {
        badgeInstanceId: "badge-1",
        ruleVersionId: "rule-1",
        kind: "TIERED",
        operator: "GTE",
        threshold: null,
        tiers: [{ id: "bronze", rank: 1, threshold: 1 }],
      },
      [snapshot(0)],
    )[0];

    expect(result).toMatchObject({
      qualifies: false,
      currentTierId: null,
      achievedTierIds: [],
    });
  });

  it("declara de forma explícita qué métricas entiende esta versión", () => {
    expect(isSupportedBadgeMetric("titlesWon")).toBe(true);
    expect(isSupportedBadgeMetric("finalsReached")).toBe(true);
    expect(isSupportedBadgeMetric("consecutiveFinalsWon")).toBe(false);
  });
});
