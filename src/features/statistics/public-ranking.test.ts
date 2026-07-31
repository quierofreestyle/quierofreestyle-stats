import { describe, expect, it } from "vitest";

import {
  buildPublicRanking,
  parseRankingMode,
  type RankingEntry,
} from "./public-ranking";

function entry(
  name: string,
  values: Partial<RankingEntry> = {},
): RankingEntry {
  return {
    competitorId: name,
    slug: name.toLowerCase(),
    name,
    championships: 0,
    runnerUps: 0,
    finals: 0,
    individualTitles: 0,
    groupTitles: 0,
    championshipsReachedAt: null,
    individualTitlesReachedAt: null,
    groupTitlesReachedAt: null,
    ...values,
  };
}

describe("public ranking", () => {
  it("orders the general ranking by titles, finals, reached date and name", () => {
    const ranking = buildPublicRanking(
      [
        entry("Zeta", {
          championships: 2,
          finals: 3,
          championshipsReachedAt: new Date("2026-03-01"),
        }),
        entry("Beta", {
          championships: 2,
          finals: 4,
          championshipsReachedAt: new Date("2026-02-01"),
        }),
        entry("Alfa", {
          championships: 2,
          finals: 4,
          championshipsReachedAt: new Date("2026-01-01"),
        }),
        entry("Gamma", { championships: 3, finals: 3 }),
      ],
      "general",
    );

    expect(ranking.map(({ name }) => name)).toEqual([
      "Gamma",
      "Alfa",
      "Beta",
      "Zeta",
    ]);
  });

  it("uses the selected title metric and excludes zero-value rows", () => {
    const entries = [
      entry("Individual", { championships: 2, individualTitles: 2 }),
      entry("Grupal", { championships: 3, groupTitles: 3 }),
    ];

    expect(buildPublicRanking(entries, "individual").map(({ name }) => name)).toEqual([
      "Individual",
    ]);
    expect(buildPublicRanking(entries, "grupal").map(({ name }) => name)).toEqual([
      "Grupal",
    ]);
  });

  it("uses the reached date that belongs to the selected modality", () => {
    const ranking = buildPublicRanking(
      [
        entry("Después", {
          groupTitles: 2,
          finals: 3,
          groupTitlesReachedAt: new Date("2026-03-01"),
          championshipsReachedAt: new Date("2026-01-01"),
        }),
        entry("Antes", {
          groupTitles: 2,
          finals: 3,
          groupTitlesReachedAt: new Date("2026-02-01"),
          championshipsReachedAt: new Date("2026-04-01"),
        }),
      ],
      "grupal",
    );

    expect(ranking.map(({ name }) => name)).toEqual(["Antes", "Después"]);
  });

  it("normalizes invalid modes to the general ranking", () => {
    expect(parseRankingMode("grupal")).toBe("grupal");
    expect(parseRankingMode("desconocido")).toBe("general");
    expect(parseRankingMode()).toBe("general");
  });
});
