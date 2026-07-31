import { describe, expect, it } from "vitest";

import {
  calculateCompetitorStatistics,
  diagnosePublishedEvents,
  type StatisticEvent,
} from "./engine";

const active = (competitorId: string) => ({
  competitorId,
  status: "ACTIVE",
  mergedIntoId: null,
});

function event(
  overrides: Partial<StatisticEvent> = {},
): StatisticEvent {
  return {
    id: "event-1",
    title: "Final",
    occurredOn: new Date("2026-01-05T00:00:00.000Z"),
    datePrecision: "DAY",
    resolution: "DECIDED",
    placements: [],
    ...overrides,
  };
}

describe("motor de estadísticas", () => {
  it("acredita un título grupal a cada integrante sin inventar subcampeón", () => {
    const result = calculateCompetitorStatistics([
      event({
        placements: [
          { type: "CHAMPION", members: [active("ml"), active("efra")] },
        ],
      }),
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        competitorId: "efra",
        championships: 1,
        finals: 1,
        groupTitles: 1,
        groupTitlesReachedAt: new Date("2026-01-05T00:00:00.000Z"),
        runnerUps: 0,
      }),
      expect.objectContaining({
        competitorId: "ml",
        championships: 1,
        finals: 1,
        groupTitles: 1,
        groupTitlesReachedAt: new Date("2026-01-05T00:00:00.000Z"),
        runnerUps: 0,
      }),
    ]);
  });

  it("reconstruye cronológicamente aunque los eventos lleguen desordenados", () => {
    const result = calculateCompetitorStatistics([
      event({
        id: "later",
        occurredOn: new Date("2026-02-01T00:00:00.000Z"),
        placements: [{ type: "RUNNER_UP", members: [active("a")] }],
      }),
      event({
        id: "earlier",
        occurredOn: new Date("2025-12-01T00:00:00.000Z"),
        placements: [{ type: "CHAMPION", members: [active("a")] }],
      }),
    ])[0];

    expect(result).toMatchObject({
      championships: 1,
      runnerUps: 1,
      finals: 2,
      firstFinalOn: new Date("2025-12-01T00:00:00.000Z"),
      lastFinalOn: new Date("2026-02-01T00:00:00.000Z"),
    });
  });

  it("detecta referencias inactivas sin bloquear por resultados parciales", () => {
    const findings = diagnosePublishedEvents([
      event({
        placements: [
          {
            type: "CHAMPION",
            members: [{ ...active("a"), status: "DRAFT" }],
          },
        ],
      }),
    ]);

    expect(findings.map(({ code }) => code)).toEqual([
      "INACTIVE_COMPETITOR",
    ]);
  });
});
