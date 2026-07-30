import {
  formatEventDate,
  labelScope,
  type PlacementSource,
} from "../competitions/model";

export type PublicEventListSource = {
  id: string;
  slug: string;
  title: string;
  occurredOn: Date | null;
  datePrecision: string;
  officialScope: string;
  format: string;
  resolution: string;
  competition: {
    shortName: string | null;
    subject: { slug: string; displayName: string };
    organization: { subject: { displayName: string } };
  };
  placements: PlacementSource[];
};

export type PublicEventDetailSource = PublicEventListSource & {
  scopeNotes: string | null;
  season: { name: string } | null;
  venue: { name: string; address: string | null } | null;
  locationRegion: { name: string } | null;
  sources: Array<{
    purpose: string;
    source: {
      url: string;
      title: string | null;
      publisher: string | null;
      type: string;
    };
  }>;
};

const formatLabels: Record<string, string> = {
  SOLO: "Individual",
  DUO: "Duplas",
  TRIO: "Tríos",
  OTHER: "Otro formato",
};

const resolutionLabels: Record<string, string> = {
  DECIDED: "Final decidida",
  SHARED_CHAMPIONSHIP: "Campeonato compartido",
  UNDECIDED: "Final indefinida",
};

const placementLabels: Record<string, string> = {
  CHAMPION: "Campeón",
  RUNNER_UP: "Subcampeón",
  FINALIST: "Finalista",
  OTHER: "Resultado",
};

function memberNames(placement: PlacementSource) {
  return placement.members.map(
    (member) =>
      member.displayNameAtEvent ?? member.competitor.subject.displayName,
  );
}

export function publicEventHref(competitionSlug: string, eventSlug: string) {
  return `/competencias/${competitionSlug}/eventos/${eventSlug}`;
}

export function toPublicEventCard(event: PublicEventListSource) {
  const champions =
    event.resolution === "UNDECIDED"
      ? []
      : event.placements
          .filter((placement) => placement.type === "CHAMPION")
          .flatMap(memberNames);

  return {
    id: event.id,
    href: publicEventHref(event.competition.subject.slug, event.slug),
    title: event.title,
    competition: event.competition.subject.displayName,
    organization: event.competition.organization.subject.displayName,
    dateLabel: formatEventDate(event.occurredOn, event.datePrecision),
    scope: labelScope(event.officialScope),
    format: formatLabels[event.format] ?? event.format,
    resolution: event.resolution,
    resolutionLabel: resolutionLabels[event.resolution] ?? event.resolution,
    champions,
  };
}

export function toPublicEventDetail(event: PublicEventDetailSource) {
  const runnerUpKnown = event.placements.some(
    (placement) => placement.type === "RUNNER_UP",
  );

  return {
    ...toPublicEventCard(event),
    competitionSlug: event.competition.subject.slug,
    season: event.season?.name ?? null,
    location:
      [event.venue?.name, event.locationRegion?.name]
        .filter(Boolean)
        .join(" · ") || null,
    address: event.venue?.address ?? null,
    scopeNotes: event.scopeNotes,
    runnerUpKnown,
    placements: event.placements.map((placement) => ({
      key: `${placement.position}-${placement.slot}`,
      position: placement.position,
      label:
        placement.groupLabel ??
        placementLabels[placement.type] ??
        `Posición ${placement.position}`,
      typeLabel: placementLabels[placement.type] ?? "Resultado",
      members: placement.members.map((member) => ({
        name:
          member.displayNameAtEvent ??
          member.competitor.subject.displayName,
        href: competitorHref(member.competitor.subject.slug),
      })),
    })),
    sources: event.sources.map(({ purpose, source }) => ({
      url: source.url,
      label: source.title ?? source.publisher ?? "Ver fuente",
      publisher: source.publisher,
      type: source.type,
      purpose,
    })),
  };
}

function competitorHref(slug: string) {
  return `/competidores/${slug}`;
}
