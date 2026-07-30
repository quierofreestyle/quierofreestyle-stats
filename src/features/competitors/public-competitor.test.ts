import { describe, expect, it } from "vitest";

import {
  competitorHref,
  toPublicCompetitor,
  type PublicCompetitorSource,
} from "./public-competitor";

const source: PublicCompetitorSource = {
  locationVisibility: "PUBLIC",
  homeRegion: {
    name: "Alta Gracia",
    parent: { name: "Córdoba", parent: { name: "Argentina" } },
  },
  subject: {
    slug: "mc-ejemplo",
    displayName: "MC Ejemplo",
    bio: "Competidor de freestyle.",
    names: [{ value: "Alias anterior", kind: "PREVIOUS" }],
  },
  placements: [
    {
      displayNameAtEvent: "Ejemplo",
      placement: {
        position: 1,
        slot: 1,
        type: "CHAMPION",
        groupLabel: "Equipo Centro",
        event: {
          id: "event-1",
          slug: "final-2025",
          title: "Final 2025",
          occurredOn: new Date("2025-12-20T00:00:00.000Z"),
          datePrecision: "DAY",
          format: "DUO",
          resolution: "SHARED_CHAMPIONSHIP",
          competition: {
            subject: {
              slug: "quiero-freestyle",
              displayName: "Quiero Freestyle",
            },
          },
          placements: [
            {
              members: [
                {
                  displayNameAtEvent: "Ejemplo",
                  competitor: { subject: { displayName: "MC Ejemplo" } },
                },
                {
                  displayNameAtEvent: null,
                  competitor: { subject: { displayName: "Beat" } },
                },
              ],
            },
          ],
        },
      },
    },
  ],
};

describe("public competitors", () => {
  it("builds a stable public profile URL", () => {
    expect(competitorHref("mc-ejemplo")).toBe("/competidores/mc-ejemplo");
  });

  it("credits a group championship to every member", () => {
    const competitor = toPublicCompetitor(source);
    expect(competitor.championships).toBe(1);
    expect(competitor.appearances[0]?.champions).toEqual(["Ejemplo", "Beat"]);
    expect(competitor.appearances[0]?.groupLabel).toBe("Equipo Centro");
  });

  it("does not expose a private location", () => {
    const competitor = toPublicCompetitor({
      ...source,
      locationVisibility: "HIDDEN",
    });
    expect(competitor.location).toBeNull();
  });
});
