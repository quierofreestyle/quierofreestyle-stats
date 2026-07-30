import { describe, expect, it } from "vitest";

import {
  publicEventHref,
  toPublicEventCard,
  toPublicEventDetail,
  type PublicEventDetailSource,
} from "./public-event";

const source: PublicEventDetailSource = {
  id: "event-1",
  slug: "final-2025",
  title: "Final 2025",
  occurredOn: new Date("2025-12-20T00:00:00.000Z"),
  datePrecision: "DAY",
  officialScope: "NATIONAL",
  format: "DUO",
  resolution: "SHARED_CHAMPIONSHIP",
  scopeNotes: null,
  competition: {
    shortName: "QF",
    subject: { slug: "quiero-freestyle", displayName: "Quiero Freestyle" },
    organization: { subject: { displayName: "QF Producciones" } },
  },
  season: { name: "Temporada 2025" },
  venue: { name: "Microestadio", address: "Calle 123" },
  locationRegion: { name: "Córdoba" },
  placements: [
    {
      position: 1,
      slot: 1,
      type: "CHAMPION",
      groupLabel: "Los del Centro",
      members: [
        {
          displayNameAtEvent: "Aka",
          competitor: {
            subject: { slug: "aka", displayName: "Nombre actual" },
          },
        },
        {
          displayNameAtEvent: null,
          competitor: {
            subject: { slug: "beat", displayName: "Beat" },
          },
        },
      ],
    },
  ],
  sources: [],
};

describe("public events", () => {
  it("builds a canonical nested URL because event slugs are competition-scoped", () => {
    expect(publicEventHref("quiero-freestyle", "final-2025")).toBe(
      "/competencias/quiero-freestyle/eventos/final-2025",
    );
  });

  it("uses names recorded at the event and supports shared champions", () => {
    const card = toPublicEventCard(source);
    expect(card.champions).toEqual(["Aka", "Beat"]);
    expect(card.resolutionLabel).toBe("Campeonato compartido");
  });

  it("supports a published event without sources", () => {
    const event = toPublicEventDetail(source);
    expect(event.sources).toEqual([]);
    expect(event.location).toBe("Microestadio · Córdoba");
    expect(event.placements[0]?.label).toBe("Los del Centro");
    expect(event.placements[0]?.members[0]).toEqual({
      name: "Aka",
      href: "/competidores/aka",
    });
  });

  it("marks a decided event without a runner-up as partially documented", () => {
    const event = toPublicEventDetail({
      ...source,
      resolution: "DECIDED",
    });
    expect(event.runnerUpKnown).toBe(false);
  });
});
