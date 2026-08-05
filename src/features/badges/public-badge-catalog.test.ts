import { describe, expect, it } from "vitest";

import {
  ALL_BADGES_FILTER,
  filterPublicBadgeCatalog,
  toPublicBadgeCatalogItem,
  type PublicBadgeCatalogItem,
} from "./public-badge-catalog";

const badges: PublicBadgeCatalogItem[] = [
  {
    id: "1", slug: "definiciones", href: "/insignias/definiciones",
    name: "Amante de las definiciones", description: "Finales alcanzadas",
    kind: "TIERED", recipientType: "COMPETITOR", scopeType: "GLOBAL",
    status: "ACTIVE", imageUrl: null, color: null,
  },
  {
    id: "2", slug: "competencia-anual", href: "/insignias/competencia-anual",
    name: "Competencia del año", description: "Reconocimiento anual",
    kind: "UNIQUE", recipientType: "COMPETITION", scopeType: "SEASON",
    status: "ARCHIVED", imageUrl: null, color: null,
  },
];

const allFilters = {
  query: "",
  kind: ALL_BADGES_FILTER,
  scopeType: ALL_BADGES_FILTER,
  recipientType: ALL_BADGES_FILTER,
  status: ALL_BADGES_FILTER,
};

describe("public badge catalog", () => {
  it("uses the first tier image when the definition has no cover", () => {
    const item = toPublicBadgeCatalogItem({
      id: "1", slug: "definiciones", displayName: "Definiciones",
      description: "Descripción", status: "ACTIVE", scope: null,
      definition: {
        kind: "TIERED", imageUrl: null, recipientType: "COMPETITOR",
        ruleVersions: [{ tiers: [{ imageUrl: "bronze.png", color: "#a66b31" }] }],
      },
    });

    expect(item.imageUrl).toBe("bronze.png");
    expect(item.scopeType).toBe("GLOBAL");
  });

  it("combines text, type, recipient, scope and status filters", () => {
    expect(filterPublicBadgeCatalog(badges, {
      ...allFilters,
      query: "año",
      kind: "UNIQUE",
      recipientType: "COMPETITION",
      scopeType: "SEASON",
      status: "ARCHIVED",
    }).map((badge) => badge.id)).toEqual(["2"]);
  });

  it("matches descriptions without case sensitivity", () => {
    expect(filterPublicBadgeCatalog(badges, { ...allFilters, query: "FINALES" }))
      .toHaveLength(1);
  });
});
