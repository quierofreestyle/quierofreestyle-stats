export type StatisticPlacement = {
  type: string;
  members: Array<{
    competitorId: string;
    status: string;
    mergedIntoId: string | null;
  }>;
};

export type StatisticEvent = {
  id: string;
  title: string;
  occurredOn: Date | null;
  datePrecision: string;
  resolution: string;
  placements: StatisticPlacement[];
};

export type CompetitorStatisticValue = {
  competitorId: string;
  championships: number;
  runnerUps: number;
  finals: number;
  individualTitles: number;
  groupTitles: number;
  firstFinalOn: Date | null;
  lastFinalOn: Date | null;
  championshipsReachedAt: Date | null;
  individualTitlesReachedAt: Date | null;
  groupTitlesReachedAt: Date | null;
  runnerUpsReachedAt: Date | null;
  finalsReachedAt: Date | null;
};

export type DataHealthFinding = {
  severity: "ERROR" | "WARNING";
  code: string;
  entityId?: string;
  message: string;
};

function emptyStatistic(competitorId: string): CompetitorStatisticValue {
  return {
    competitorId,
    championships: 0,
    runnerUps: 0,
    finals: 0,
    individualTitles: 0,
    groupTitles: 0,
    firstFinalOn: null,
    lastFinalOn: null,
    championshipsReachedAt: null,
    individualTitlesReachedAt: null,
    groupTitlesReachedAt: null,
    runnerUpsReachedAt: null,
    finalsReachedAt: null,
  };
}

function eventTime(event: StatisticEvent) {
  return event.occurredOn?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

export function diagnosePublishedEvents(
  events: StatisticEvent[],
): DataHealthFinding[] {
  const findings: DataHealthFinding[] = [];
  const dates = new Map<number, string[]>();

  for (const event of events) {
    if (!event.occurredOn || event.datePrecision !== "DAY") {
      findings.push({
        severity: "ERROR",
        code: "INVALID_EVENT_DATE",
        entityId: event.id,
        message: `${event.title}: un evento publicado necesita fecha completa.`,
      });
    } else {
      const time = event.occurredOn.getTime();
      dates.set(time, [...(dates.get(time) ?? []), event.title]);
    }

    if (event.placements.length === 0) {
      findings.push({
        severity: "ERROR",
        code: "EMPTY_RESULT",
        entityId: event.id,
        message: `${event.title}: no tiene resultados activos.`,
      });
    }

    const seen = new Set<string>();
    for (const placement of event.placements) {
      if (placement.members.length === 0) {
        findings.push({
          severity: "ERROR",
          code: "EMPTY_PLACEMENT",
          entityId: event.id,
          message: `${event.title}: contiene una posición sin integrantes.`,
        });
      }
      for (const member of placement.members) {
        if (seen.has(member.competitorId)) {
          findings.push({
            severity: "ERROR",
            code: "DUPLICATE_FINALIST",
            entityId: event.id,
            message: `${event.title}: una persona ocupa más de un resultado.`,
          });
        }
        seen.add(member.competitorId);
        if (member.status !== "ACTIVE" || member.mergedIntoId) {
          findings.push({
            severity: "ERROR",
            code: "INACTIVE_COMPETITOR",
            entityId: event.id,
            message: `${event.title}: referencia un competidor inactivo o fusionado.`,
          });
        }
      }
    }
  }

  for (const titles of dates.values()) {
    if (titles.length > 1) {
      findings.push({
        severity: "WARNING",
        code: "SAME_DAY_EVENTS",
        message: `${titles.length} eventos comparten fecha; se usa el identificador estable como desempate: ${titles.join(", ")}.`,
      });
    }
  }

  return findings;
}

export function calculateCompetitorStatistics(
  events: StatisticEvent[],
): CompetitorStatisticValue[] {
  const values = new Map<string, CompetitorStatisticValue>();
  const ordered = [...events].sort(
    (left, right) =>
      eventTime(left) - eventTime(right) || left.id.localeCompare(right.id),
  );

  for (const event of ordered) {
    if (!event.occurredOn) continue;
    for (const placement of event.placements) {
      const isFinal =
        placement.type === "CHAMPION" ||
        placement.type === "RUNNER_UP" ||
        placement.type === "FINALIST";
      const isChampion =
        placement.type === "CHAMPION" && event.resolution !== "UNDECIDED";
      const isRunnerUp = placement.type === "RUNNER_UP";

      for (const member of placement.members) {
        const value =
          values.get(member.competitorId) ??
          emptyStatistic(member.competitorId);

        if (isFinal) {
          value.finals += 1;
          value.firstFinalOn ??= event.occurredOn;
          value.lastFinalOn = event.occurredOn;
          value.finalsReachedAt = event.occurredOn;
        }
        if (isChampion) {
          value.championships += 1;
          value.championshipsReachedAt = event.occurredOn;
          if (placement.members.length > 1) {
            value.groupTitles += 1;
            value.groupTitlesReachedAt = event.occurredOn;
          } else {
            value.individualTitles += 1;
            value.individualTitlesReachedAt = event.occurredOn;
          }
        }
        if (isRunnerUp) {
          value.runnerUps += 1;
          value.runnerUpsReachedAt = event.occurredOn;
        }
        values.set(member.competitorId, value);
      }
    }
  }

  return [...values.values()].sort((a, b) =>
    a.competitorId.localeCompare(b.competitorId),
  );
}
