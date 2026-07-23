export type PlacementSource = {
  position: number;
  slot: number;
  type: string;
  groupLabel: string | null;
  members: Array<{
    displayNameAtEvent: string | null;
    competitor: { subject: { slug: string; displayName: string } };
  }>;
};

export type EventSource = {
  id: string;
  slug: string;
  title: string;
  occurredOn: Date | null;
  datePrecision: string;
  officialScope: string;
  format: string;
  resolution: string;
  status: string;
  placements: PlacementSource[];
};

export type CompetitionSource = {
  shortName: string | null;
  defaultScope: string;
  subject: { slug: string; displayName: string };
  organization: {
    subject: { slug: string; displayName: string };
  };
  events: EventSource[];
};

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  date: string | null;
  dateLabel: string;
  scope: string;
  format: string;
  resolution: string;
  resolutionLabel: string;
  champions: string[];
  finalists: string[];
};

export type PublicCompetition = {
  slug: string;
  name: string;
  shortName: string | null;
  organization: string;
  scope: string;
  eventCount: number;
  latestEventLabel: string | null;
  latestChampions: string[];
  events: PublicEvent[];
};

const scopeLabels: Record<string, string> = {
  LOCAL: "Local",
  REGIONAL: "Regional",
  PROVINCIAL: "Provincial",
  NATIONAL: "Nacional",
  INTERNATIONAL: "Internacional",
  OTHER: "Otro",
};

const resolutionLabels: Record<string, string> = {
  DECIDED: "Final decidida",
  SHARED_CHAMPIONSHIP: "Campeonato compartido",
  UNDECIDED: "Final indefinida",
};

const formatLabels: Record<string, string> = {
  SOLO: "Individual",
  DUO: "Duplas",
  TRIO: "Tríos",
  OTHER: "Otro formato",
};

export function labelScope(scope: string): string {
  return scopeLabels[scope] ?? scope;
}

function memberNames(placement: PlacementSource): string[] {
  return placement.members.map(
    (member) =>
      member.displayNameAtEvent ?? member.competitor.subject.displayName,
  );
}

export function formatEventDate(
  date: Date | null,
  precision: string,
): string {
  if (!date || precision === "UNKNOWN") return "Fecha por confirmar";

  const options: Intl.DateTimeFormatOptions =
    precision === "YEAR"
      ? { year: "numeric", timeZone: "UTC" }
      : precision === "MONTH"
        ? { month: "long", year: "numeric", timeZone: "UTC" }
        : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };

  return new Intl.DateTimeFormat("es-AR", options).format(date);
}

export function toPublicEvent(event: EventSource): PublicEvent {
  const championPlacements = event.placements.filter(
    (placement) => placement.type === "CHAMPION",
  );
  const finalistPlacements = event.placements.filter(
    (placement) =>
      placement.type === "CHAMPION" ||
      placement.type === "RUNNER_UP" ||
      placement.type === "FINALIST",
  );

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    date: event.occurredOn?.toISOString() ?? null,
    dateLabel: formatEventDate(event.occurredOn, event.datePrecision),
    scope: labelScope(event.officialScope),
    format: formatLabels[event.format] ?? event.format,
    resolution: event.resolution,
    resolutionLabel:
      resolutionLabels[event.resolution] ?? event.resolution,
    champions:
      event.resolution === "UNDECIDED"
        ? []
        : championPlacements.flatMap(memberNames),
    finalists: finalistPlacements.flatMap(memberNames),
  };
}

export function toPublicCompetition(
  competition: CompetitionSource,
): PublicCompetition {
  const events = competition.events.map(toPublicEvent);
  const latestEvent = events[0];

  return {
    slug: competition.subject.slug,
    name: competition.subject.displayName,
    shortName: competition.shortName,
    organization: competition.organization.subject.displayName,
    scope: labelScope(competition.defaultScope),
    eventCount: events.length,
    latestEventLabel: latestEvent?.dateLabel ?? null,
    latestChampions: latestEvent?.champions ?? [],
    events,
  };
}

export function toPublicCompetitions(
  competitions: CompetitionSource[],
): PublicCompetition[] {
  return competitions.map(toPublicCompetition);
}
