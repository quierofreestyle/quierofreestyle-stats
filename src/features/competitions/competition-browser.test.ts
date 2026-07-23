import { describe, expect, it } from "vitest";

import {
  formatEventDate,
  toPublicCompetition,
  toPublicEvent,
  type CompetitionSource,
  type EventSource,
} from "./model";

const baseEvent: EventSource = {
  id: "event-1",
  slug: "final-2025",
  title: "Final 2025",
  occurredOn: new Date("2025-12-06T00:00:00.000Z"),
  datePrecision: "DAY",
  officialScope: "INTERNATIONAL",
  format: "SOLO",
  resolution: "DECIDED",
  status: "PUBLISHED",
  placements: [
    {
      position: 1,
      slot: 1,
      type: "CHAMPION",
      groupLabel: null,
      members: [
        {
          displayNameAtEvent: "Chuty",
          competitor: { subject: { slug: "chuty", displayName: "Chuty" } },
        },
      ],
    },
  ],
};

describe("vista pública de competencias", () => {
  it("formatea fechas según su precisión", () => {
    expect(formatEventDate(baseEvent.occurredOn, "DAY")).toBe(
      "6 de diciembre de 2025",
    );
    expect(formatEventDate(baseEvent.occurredOn, "YEAR")).toBe("2025");
    expect(formatEventDate(null, "UNKNOWN")).toBe("Fecha por confirmar");
  });

  it("representa una final compartida con todos sus campeones", () => {
    const shared = toPublicEvent({
      ...baseEvent,
      resolution: "SHARED_CHAMPIONSHIP",
      placements: [
        baseEvent.placements[0],
        {
          ...baseEvent.placements[0],
          slot: 2,
          members: [
            {
              displayNameAtEvent: null,
              competitor: {
                subject: { slug: "gazir", displayName: "Gazir" },
              },
            },
          ],
        },
      ],
    });

    expect(shared.champions).toEqual(["Chuty", "Gazir"]);
    expect(shared.resolutionLabel).toBe("Campeonato compartido");
  });

  it("no inventa un campeón cuando la final está indefinida", () => {
    expect(
      toPublicEvent({ ...baseEvent, resolution: "UNDECIDED" }).champions,
    ).toEqual([]);
  });

  it("resume la competencia a partir de su evento más reciente", () => {
    const source: CompetitionSource = {
      shortName: "RB",
      defaultScope: "INTERNATIONAL",
      subject: { slug: "red-bull", displayName: "Red Bull Internacional" },
      organization: {
        subject: { slug: "red-bull-org", displayName: "Red Bull" },
      },
      events: [baseEvent],
    };

    const competition = toPublicCompetition(source);
    expect(competition.eventCount).toBe(1);
    expect(competition.latestChampions).toEqual(["Chuty"]);
    expect(competition.scope).toBe("Internacional");
  });
});
