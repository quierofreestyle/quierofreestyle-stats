import { describe, expect, it } from "vitest";

import { publicBadgeHref, toPublicBadge, type PublicBadgeSource } from "./public-badge";

const source: PublicBadgeSource = {
  instanceId: "badge-1",
  slug: "amante-definiciones",
  name: "Amante de las definiciones",
  description: "Reconoce finales alcanzadas.",
  kind: "TIERED",
  publicRule: "Alcanzar finales.",
  imageUrl: "https://example.com/general.png",
  status: "ACTIVE",
  awardedOn: new Date("2026-01-10T00:00:00.000Z"),
  publicJustification: null,
  metricValue: 3,
  currentTier: { id: "silver", displayName: "Plata", threshold: 3, color: "#c0c0c0", imageUrl: "https://example.com/silver.png" },
  tiers: [
    { id: "gold", rank: 3, displayName: "Oro", threshold: 5, color: "#ffd700", imageUrl: "https://example.com/gold.png" },
    { id: "bronze", rank: 1, displayName: "Bronce", threshold: 1, color: "#cd7f32", imageUrl: "https://example.com/bronze.png" },
    { id: "silver", rank: 2, displayName: "Plata", threshold: 3, color: "#c0c0c0", imageUrl: "https://example.com/silver.png" },
  ],
  achievements: [],
};

describe("public badges", () => {
  it("builds a stable badge URL", () => {
    expect(publicBadgeHref("amante-definiciones")).toBe("/insignias/amante-definiciones");
  });

  it("uses the current tier image and exposes the next goal", () => {
    const badge = toPublicBadge(source);
    expect(badge.imageUrl).toBe("https://example.com/silver.png");
    expect(badge.currentTier?.displayName).toBe("Plata");
    expect(badge.nextTier?.displayName).toBe("Oro");
    expect(badge.progressPercent).toBe(60);
  });

  it("marks a completed tier scale at one hundred percent", () => {
    const badge = toPublicBadge({ ...source, metricValue: 8, currentTier: { ...source.tiers[0] } });
    expect(badge.nextTier).toBeNull();
    expect(badge.progressPercent).toBe(100);
  });
});
