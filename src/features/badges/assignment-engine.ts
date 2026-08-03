export type SupportedBadgeMetric =
  | "titlesWon"
  | "finalsReached";

export type BadgeMetricSnapshot = {
  recipientSubjectId: string;
  value: number;
  reachedOn: Date | null;
  milestones?: Array<{
    value: number;
    reachedOn: Date;
    sourceEventId: string;
  }>;
};

export type BadgeTierRule = {
  id: string;
  rank: number;
  threshold: number;
};

export type AutomaticBadgeRule = {
  badgeInstanceId: string;
  ruleVersionId: string;
  kind: "ACHIEVEMENT" | "TIERED";
  operator: "GTE" | "EQ" | "FIRST";
  threshold: number | null;
  tiers: BadgeTierRule[];
};

export type BadgeEvaluation = {
  badgeInstanceId: string;
  ruleVersionId: string;
  recipientSubjectId: string;
  metricValue: number;
  reachedOn: Date | null;
  sourceEventId: string | null;
  qualifies: boolean;
  currentTierId: string | null;
  achievedTierIds: string[];
  tierAchievements: Array<{
    tierId: string;
    achievedOn: Date | null;
    sourceEventId: string | null;
  }>;
};

function milestoneFor(snapshot: BadgeMetricSnapshot, threshold: number) {
  return snapshot.milestones?.find(({ value }) => value >= threshold) ?? null;
}

function qualifies(operator: AutomaticBadgeRule["operator"], value: number, threshold: number) {
  if (operator === "EQ") return value === threshold;
  return value >= threshold;
}

export function evaluateAutomaticBadge(
  rule: AutomaticBadgeRule,
  snapshots: BadgeMetricSnapshot[],
): BadgeEvaluation[] {
  const tiers = [...rule.tiers].sort(
    (left, right) => left.threshold - right.threshold || left.rank - right.rank,
  );

  return snapshots.map((snapshot) => {
    if (rule.kind === "TIERED") {
      const achieved = tiers.filter(({ threshold }) => snapshot.value >= threshold);
      const tierAchievements = achieved.map((tier) => {
        const milestone = milestoneFor(snapshot, tier.threshold);
        return {
          tierId: tier.id,
          achievedOn: milestone?.reachedOn ?? snapshot.reachedOn,
          sourceEventId: milestone?.sourceEventId ?? null,
        };
      });
      const currentMilestone = tierAchievements.at(-1);
      return {
        badgeInstanceId: rule.badgeInstanceId,
        ruleVersionId: rule.ruleVersionId,
        recipientSubjectId: snapshot.recipientSubjectId,
        metricValue: snapshot.value,
        reachedOn: currentMilestone?.achievedOn ?? snapshot.reachedOn,
        sourceEventId: currentMilestone?.sourceEventId ?? null,
        qualifies: achieved.length > 0,
        currentTierId: achieved.at(-1)?.id ?? null,
        achievedTierIds: achieved.map(({ id }) => id),
        tierAchievements,
      };
    }

    const threshold = rule.threshold ?? 0;
    const milestone = milestoneFor(snapshot, threshold);
    return {
      badgeInstanceId: rule.badgeInstanceId,
      ruleVersionId: rule.ruleVersionId,
      recipientSubjectId: snapshot.recipientSubjectId,
      metricValue: snapshot.value,
      reachedOn: milestone?.reachedOn ?? snapshot.reachedOn,
      sourceEventId: milestone?.sourceEventId ?? null,
      qualifies: qualifies(rule.operator, snapshot.value, threshold),
      currentTierId: null,
      achievedTierIds: [],
      tierAchievements: [],
    };
  });
}

export function isSupportedBadgeMetric(
  implementationKey: string,
): implementationKey is SupportedBadgeMetric {
  return implementationKey === "titlesWon" || implementationKey === "finalsReached";
}
