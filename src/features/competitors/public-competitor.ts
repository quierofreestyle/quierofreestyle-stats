import { formatEventDate } from "../competitions/model";
import { publicEventHref } from "../events/public-event";

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
    slug: string;
    displayName: string;
    bio: string | null;
    names: Array<{ value: string; kind: string }>;
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
    appearances,
  };
}

export function toPublicCompetitors(sources: PublicCompetitorSource[]) {
  return sources.map(toPublicCompetitor);
}
