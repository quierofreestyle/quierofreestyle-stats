export const rankingModes = ["general", "individual", "grupal"] as const;

export type RankingMode = (typeof rankingModes)[number];

export type RankingEntry = {
  competitorId: string;
  slug: string;
  name: string;
  championships: number;
  runnerUps: number;
  finals: number;
  individualTitles: number;
  groupTitles: number;
  championshipsReachedAt: Date | null;
  individualTitlesReachedAt: Date | null;
  groupTitlesReachedAt: Date | null;
};

export const rankingModeLabels: Record<RankingMode, string> = {
  general: "General",
  individual: "Individual",
  grupal: "Grupal",
};

export function parseRankingMode(value?: string): RankingMode {
  return rankingModes.includes(value as RankingMode)
    ? (value as RankingMode)
    : "general";
}

export function rankingValue(entry: RankingEntry, mode: RankingMode) {
  if (mode === "individual") return entry.individualTitles;
  if (mode === "grupal") return entry.groupTitles;
  return entry.championships;
}

export function compareRankingEntries(
  left: RankingEntry,
  right: RankingEntry,
  mode: RankingMode,
) {
  const byValue = rankingValue(right, mode) - rankingValue(left, mode);
  if (byValue) return byValue;

  const byFinals = right.finals - left.finals;
  if (byFinals) return byFinals;

  const reachedAt = (entry: RankingEntry) => {
    if (mode === "individual") return entry.individualTitlesReachedAt;
    if (mode === "grupal") return entry.groupTitlesReachedAt;
    return entry.championshipsReachedAt;
  };
  const leftReached = reachedAt(left)?.getTime() ?? Infinity;
  const rightReached = reachedAt(right)?.getTime() ?? Infinity;
  const byReachedAt = leftReached - rightReached;
  if (byReachedAt) return byReachedAt;

  return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
}

export function buildPublicRanking(
  entries: RankingEntry[],
  mode: RankingMode,
) {
  return [...entries]
    .filter((entry) =>
      mode === "general"
        ? entry.championships > 0 || entry.runnerUps > 0 || entry.finals > 0
        : rankingValue(entry, mode) > 0,
    )
    .sort((left, right) => compareRankingEntries(left, right, mode));
}
