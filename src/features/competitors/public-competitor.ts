import { formatEventDate } from "../competitions/model";
import { publicEventHref } from "../events/public-event";
import { toPublicBadge, type PublicBadgeSource } from "../badges/public-badge";

type RegionSource = {
  name: string;
  parent: {
    name: string;
    parent: { name: string } | null;
  } | null;
} | null;

type PlacementSource = {
  displayNameAtEvent: string | null;
  placement: {
    position: number;
    slot: number;
    type: string;
    groupLabel: string | null;
    event: {
      id: string;
      slug: string;
      title: string;
      occurredOn: Date | null;
      datePrecision: string;
      format: string;
      resolution: string;
      competition: {
        subject: { slug: string; displayName: string };
      };
      placements: Array<{
        members: Array<{
          displayNameAtEvent: string | null;
          competitor: { subject: { displayName: string } };
        }>;
      }>;
    };
  };
};

export type PublicCompetitorSource = {
  locationVisibility: string;
  homeRegion: RegionSource;
  subject: {
    id: string;
    slug: string;
    displayName: string;
    bio: string | null;
    names: Array<{ value: string; kind: string }>;
    badgeAwards: Array<{
      awardedOn: Date;
      publicJustification: string | null;
      badgeInstanceId: string;
    }>;
    badgeProgress: Array<{
      metricValue: number;
      currentTier: PublicBadgeSource["currentTier"];
      ruleVersion: { tiers: PublicBadgeSource["tiers"] };
      badgeInstance: {
        id: string;
        slug: string;
        displayName: string;
        description: string;
        status: string;
        definition: {
          kind: string;
          publicRule: string;
          imageUrl: string | null;
        };
      };
    }>;
    tierAchievements: Array<{
      badgeInstanceId: string;
      achievedOn: Date;
      tier: { id: string; displayName: string };
      sourceEvent: {
        slug: string;
        title: string;
        competition: { subject: { slug: string } };
      } | null;
    }>;
    badgePreferences: Array<{ badgeInstanceId: string }>;
  };
  placements: PlacementSource[];
};

const placementLabels: Record<string, string> = {
  CHAMPION: "Campeón",
  RUNNER_UP: "Subcampeón",
  FINALIST: "Finalista",
  OTHER: "Resultado",
};

const formatLabels: Record<string, string> = {
  SOLO: "Individual",
  DUO: "Duplas",
  TRIO: "Tríos",
  OTHER: "Otro formato",
};

function locationLabel(region: RegionSource) {
  if (!region) return null;
  return [region.name, region.parent?.name, region.parent?.parent?.name]
    .filter(Boolean)
    .join(", ");
}

function championNames(placement: PlacementSource) {
  if (placement.placement.event.resolution === "UNDECIDED") return [];

  return placement.placement.event.placements.flatMap((champion) =>
    champion.members.map(
      (member) =>
        member.displayNameAtEvent ?? member.competitor.subject.displayName,
    ),
  );
}

export function competitorHref(slug: string) {
  return `/competidores/${slug}`;
}

export function toPublicCompetitor(source: PublicCompetitorSource) {
  const appearances = source.placements.map((member) => {
    const { placement } = member;
    const { event } = placement;

    return {
      key: `${event.id}-${placement.position}-${placement.slot}`,
      href: publicEventHref(event.competition.subject.slug, event.slug),
      event: event.title,
      competition: event.competition.subject.displayName,
      dateLabel: formatEventDate(event.occurredOn, event.datePrecision),
      type: placement.type,
      resolution: event.resolution,
      resultLabel: placementLabels[placement.type] ?? "Resultado",
      format: formatLabels[event.format] ?? event.format,
      groupLabel: placement.groupLabel,
      nameAtEvent: member.displayNameAtEvent,
      champions: championNames(member),
    };
  });

  const hiddenBadges = new Set(
    source.subject.badgePreferences.map(({ badgeInstanceId }) => badgeInstanceId),
  );
  const awards = new Map(
    source.subject.badgeAwards.map((award) => [award.badgeInstanceId, award]),
  );
  const badges = source.subject.badgeProgress
    .filter(({ badgeInstance }) =>
      awards.has(badgeInstance.id) && !hiddenBadges.has(badgeInstance.id),
    )
    .map((progress) => {
      const award = awards.get(progress.badgeInstance.id)!;
      return toPublicBadge({
        instanceId: progress.badgeInstance.id,
        slug: progress.badgeInstance.slug,
        name: progress.badgeInstance.displayName,
        description: progress.badgeInstance.description,
        kind: progress.badgeInstance.definition.kind,
        publicRule: progress.badgeInstance.definition.publicRule,
        imageUrl: progress.badgeInstance.definition.imageUrl,
        status: progress.badgeInstance.status,
        awardedOn: award.awardedOn,
        publicJustification: award.publicJustification,
        metricValue: Number(progress.metricValue),
        currentTier: progress.currentTier
          ? { ...progress.currentTier, threshold: Number(progress.currentTier.threshold) }
          : null,
        tiers: progress.ruleVersion.tiers.map((tier) => ({
          ...tier,
          threshold: Number(tier.threshold),
        })),
        achievements: source.subject.tierAchievements
          .filter(({ badgeInstanceId }) => badgeInstanceId === progress.badgeInstance.id)
          .map((achievement) => ({
            tierId: achievement.tier.id,
            displayName: achievement.tier.displayName,
            achievedOn: achievement.achievedOn,
            eventHref: achievement.sourceEvent
              ? publicEventHref(
                  achievement.sourceEvent.competition.subject.slug,
                  achievement.sourceEvent.slug,
                )
              : null,
            eventName: achievement.sourceEvent?.title ?? null,
          })),
      });
    })
    .sort((left, right) => right.awardedOn.getTime() - left.awardedOn.getTime());

  return {
    slug: source.subject.slug,
    href: competitorHref(source.subject.slug),
    name: source.subject.displayName,
    bio: source.subject.bio,
    aliases: source.subject.names.map((name) => name.value),
    location:
      source.locationVisibility === "PUBLIC"
        ? locationLabel(source.homeRegion)
        : null,
    finals: appearances.length,
    championships: appearances.filter(
      (item) =>
        item.type === "CHAMPION" && item.resolution !== "UNDECIDED",
    ).length,
    runnerUps: appearances.filter((item) => item.type === "RUNNER_UP").length,
    badges,
    appearances,
  };
}

export function toPublicCompetitors(sources: PublicCompetitorSource[]) {
  return sources.map(toPublicCompetitor);
}
