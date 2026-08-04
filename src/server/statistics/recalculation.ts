import "server-only";

import { randomUUID } from "node:crypto";

import {
  calculateCompetitorStatistics,
  diagnosePublishedEvents,
  type StatisticEvent,
} from "../../features/statistics/engine";
import {
  evaluateAutomaticBadge,
  isSupportedBadgeMetric,
} from "../../features/badges/assignment-engine";
import { db } from "../db";

class DataQualityError extends Error {
  constructor(
    message: string,
    readonly findings: ReturnType<typeof diagnosePublishedEvents>,
  ) {
    super(message);
  }
}

const eventSelect = {
  id: true,
  title: true,
  occurredOn: true,
  datePrecision: true,
  resolution: true,
  placements: {
    where: { status: "ACTIVE" as const },
    orderBy: [{ position: "asc" as const }, { slot: "asc" as const }],
    select: {
      type: true,
      members: {
        orderBy: { memberOrder: "asc" as const },
        select: {
          competitorId: true,
          competitor: {
            select: {
              subject: {
                select: { status: true, mergedIntoId: true },
              },
            },
          },
        },
      },
    },
  },
};

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function evaluateAndApplyBadges(
  tx: TransactionClient,
  run: { id: string; mode: "APPLY" | "DRY_RUN" },
  statistics: ReturnType<typeof calculateCompetitorStatistics>,
  events: StatisticEvent[],
  calculatedAt: Date,
) {
  const [definitions, competitors] = await Promise.all([
    tx.badgeDefinition.findMany({
      where: {
        status: "ACTIVE",
        assignmentMode: "AUTOMATIC",
        kind: { in: ["ACHIEVEMENT", "TIERED"] },
      },
      select: {
        code: true,
        kind: true,
        recipientType: true,
        publicRule: true,
        instances: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            scope: { select: { scopeType: true } },
          },
        },
        ruleVersions: {
          where: { status: "ACTIVE" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            id: true,
            operator: true,
            baseThreshold: true,
            metric: { select: { implementationKey: true } },
            tiers: {
              orderBy: { rank: "asc" },
              select: { id: true, rank: true, threshold: true },
            },
          },
        },
      },
    }),
    tx.subject.findMany({
      where: { type: "COMPETITOR", status: "ACTIVE", mergedIntoId: null },
      select: { id: true },
    }),
  ]);

  const statisticByCompetitor = new Map(
    statistics.map((value) => [value.competitorId, value]),
  );
  const milestones = {
    titlesWon: new Map<string, Array<{ value: number; reachedOn: Date; sourceEventId: string }>>(),
    finalsReached: new Map<string, Array<{ value: number; reachedOn: Date; sourceEventId: string }>>(),
  };
  const orderedEvents = [...events].sort(
    (left, right) =>
      (left.occurredOn?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (right.occurredOn?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );
  for (const event of orderedEvents) {
    if (!event.occurredOn) continue;
    for (const placement of event.placements) {
      const isFinal = ["CHAMPION", "RUNNER_UP", "FINALIST"].includes(placement.type);
      const isTitle = placement.type === "CHAMPION" && event.resolution !== "UNDECIDED";
      for (const { competitorId } of placement.members) {
        for (const key of [
          ...(isTitle ? ["titlesWon" as const] : []),
          ...(isFinal ? ["finalsReached" as const] : []),
        ]) {
          const history = milestones[key].get(competitorId) ?? [];
          history.push({
            value: history.length + 1,
            reachedOn: event.occurredOn,
            sourceEventId: event.id,
          });
          milestones[key].set(competitorId, history);
        }
      }
    }
  }
  const unsupported: Array<{ badgeCode: string; reason: string }> = [];
  let awardCount = 0;
  let revokeCount = 0;
  let levelChangeCount = 0;

  for (const definition of definitions) {
    const rule = definition.ruleVersions[0];
    if (!rule || definition.recipientType !== "COMPETITOR") {
      unsupported.push({
        badgeCode: definition.code,
        reason: !rule ? "No tiene una regla activa." : "El destinatario todavía no está soportado.",
      });
      continue;
    }
    if (!isSupportedBadgeMetric(rule.metric.implementationKey)) {
      unsupported.push({
        badgeCode: definition.code,
        reason: `La métrica ${rule.metric.implementationKey} todavía no está implementada.`,
      });
      continue;
    }
    if (rule.operator === "FIRST" || rule.operator === "TOP_ONE") {
      unsupported.push({
        badgeCode: definition.code,
        reason: `El operador ${rule.operator} se incorporará con las reglas cronológicas y las insignias únicas.`,
      });
      continue;
    }

    for (const instance of definition.instances) {
      if (instance.scope?.scopeType !== "GLOBAL") {
        unsupported.push({
          badgeCode: definition.code,
          reason: "Esta versión del motor solo evalúa el ámbito global.",
        });
        continue;
      }

      const snapshots = competitors.map(({ id }) => {
        const statistic = statisticByCompetitor.get(id);
        const metricMilestones = milestones[rule.metric.implementationKey].get(id) ?? [];
        return rule.metric.implementationKey === "titlesWon"
          ? {
              recipientSubjectId: id,
              value: statistic?.championships ?? 0,
              reachedOn: statistic?.championshipsReachedAt ?? null,
              milestones: metricMilestones,
            }
          : {
              recipientSubjectId: id,
              value: statistic?.finals ?? 0,
              reachedOn: statistic?.finalsReachedAt ?? null,
              milestones: metricMilestones,
            };
      });
      const evaluations = evaluateAutomaticBadge(
        {
          badgeInstanceId: instance.id,
          ruleVersionId: rule.id,
          kind: definition.kind === "TIERED" ? "TIERED" : "ACHIEVEMENT",
          operator: rule.operator as "GTE" | "EQ" | "FIRST",
          threshold: rule.baseThreshold?.toNumber() ?? null,
          tiers: rule.tiers.map((tier) => ({
            id: tier.id,
            rank: tier.rank,
            threshold: tier.threshold.toNumber(),
          })),
        },
        snapshots,
      );

      const [activeAwards, previousProgress, activeAchievements] = await Promise.all([
        tx.badgeAward.findMany({
          where: { badgeInstanceId: instance.id, status: "ACTIVE" },
          select: { id: true, recipientSubjectId: true },
        }),
        tx.badgeProgress.findMany({
          where: { badgeInstanceId: instance.id },
          select: {
            recipientSubjectId: true,
            currentTierId: true,
            metricValue: true,
          },
        }),
        tx.tierAchievement.findMany({
          where: { badgeInstanceId: instance.id, status: "ACTIVE" },
          select: { id: true, recipientSubjectId: true, tierId: true },
        }),
      ]);
      const awardByRecipient = new Map(activeAwards.map((award) => [award.recipientSubjectId, award]));
      const progressByRecipient = new Map(previousProgress.map((progress) => [progress.recipientSubjectId, progress]));

      for (const evaluation of evaluations) {
        const activeAward = awardByRecipient.get(evaluation.recipientSubjectId);
        const previous = progressByRecipient.get(evaluation.recipientSubjectId);
        const changedTier = previous?.currentTierId !== evaluation.currentTierId;
        const changeType = evaluation.qualifies && !activeAward
          ? "AWARD"
          : !evaluation.qualifies && activeAward
            ? "REVOKE"
            : changedTier && evaluation.currentTierId
              ? "LEVEL_UP"
              : changedTier && previous?.currentTierId
                ? "LEVEL_DOWN"
                : null;

        if (changeType) {
          if (changeType === "AWARD") awardCount += 1;
          else if (changeType === "REVOKE") revokeCount += 1;
          else levelChangeCount += 1;
          await tx.recalculationChange.create({
            data: {
              runId: run.id,
              badgeInstanceId: instance.id,
              subjectId: evaluation.recipientSubjectId,
              changeType,
              beforeState: previous
                ? { metricValue: previous.metricValue.toString(), currentTierId: previous.currentTierId }
                : undefined,
              afterState: {
                metricValue: evaluation.metricValue,
                currentTierId: evaluation.currentTierId,
                qualifies: evaluation.qualifies,
              },
              appliedAt: run.mode === "APPLY" ? calculatedAt : null,
            },
          });
        }

        if (run.mode !== "APPLY") continue;
        const effectiveDate = evaluation.reachedOn ?? calculatedAt;
        await tx.badgeProgress.upsert({
          where: {
            badgeInstanceId_recipientSubjectId: {
              badgeInstanceId: instance.id,
              recipientSubjectId: evaluation.recipientSubjectId,
            },
          },
          create: {
            badgeInstanceId: instance.id,
            recipientSubjectId: evaluation.recipientSubjectId,
            ruleVersionId: rule.id,
            currentTierId: evaluation.currentTierId,
            metricValue: evaluation.metricValue,
            reachedValueOn: evaluation.reachedOn,
            calculatedAt,
            runId: run.id,
          },
          update: {
            ruleVersionId: rule.id,
            currentTierId: evaluation.currentTierId,
            metricValue: evaluation.metricValue,
            reachedValueOn: evaluation.reachedOn,
            calculatedAt,
            runId: run.id,
          },
        });
        if (evaluation.qualifies) {
          const awardData = {
            ruleVersionId: rule.id,
            sourceEventId: evaluation.sourceEventId,
            publicJustification: definition.publicRule,
            evidence: {
              metric: rule.metric.implementationKey,
              value: evaluation.metricValue,
              runId: run.id,
            },
          };
          if (activeAward) {
            await tx.badgeAward.update({
              where: { id: activeAward.id },
              data: awardData,
            });
          } else {
            await tx.badgeAward.create({
              data: {
                badgeInstanceId: instance.id,
                recipientSubjectId: evaluation.recipientSubjectId,
                awardedOn: effectiveDate,
                status: "ACTIVE",
                ...awardData,
              },
            });
          }
        } else if (!evaluation.qualifies && activeAward) {
          await tx.badgeAward.update({
            where: { id: activeAward.id },
            data: { status: "REVOKED", revokedAt: calculatedAt },
          });
        }

        const desiredTiers = new Set(evaluation.achievedTierIds);
        for (const achievement of activeAchievements.filter(
          ({ recipientSubjectId }) => recipientSubjectId === evaluation.recipientSubjectId,
        )) {
          if (!desiredTiers.has(achievement.tierId)) {
            await tx.tierAchievement.update({
              where: { id: achievement.id },
              data: { status: "REVOKED", revokedAt: calculatedAt },
            });
          }
        }
        for (const tierAchievement of evaluation.tierAchievements) {
          const tierId = tierAchievement.tierId;
          await tx.tierAchievement.upsert({
            where: {
              badgeInstanceId_recipientSubjectId_tierId_ruleVersionId: {
                badgeInstanceId: instance.id,
                recipientSubjectId: evaluation.recipientSubjectId,
                tierId,
                ruleVersionId: rule.id,
              },
            },
            create: {
              badgeInstanceId: instance.id,
              recipientSubjectId: evaluation.recipientSubjectId,
              tierId,
              ruleVersionId: rule.id,
              sourceEventId: tierAchievement.sourceEventId,
              achievedOn: tierAchievement.achievedOn ?? effectiveDate,
              status: "ACTIVE",
            },
            update: {
              sourceEventId: tierAchievement.sourceEventId,
              achievedOn: tierAchievement.achievedOn ?? effectiveDate,
              status: "ACTIVE",
              revokedAt: null,
            },
          });
        }
      }
    }
  }

  return { awardCount, revokeCount, levelChangeCount, unsupported };
}

export async function inspectStatisticsDataHealth() {
  const [events, openMigrationIssues, duplicateNames] = await Promise.all([
    db.event.findMany({
      where: { status: { in: ["PUBLISHED", "CORRECTED"] } },
      orderBy: [{ occurredOn: "asc" }, { id: "asc" }],
      select: eventSelect,
    }),
    db.migrationIssue.count({ where: { status: "OPEN" } }),
    db.subjectName.groupBy({
      by: ["normalizedValue"],
      where: {
        subject: { type: "COMPETITOR", status: { not: "MERGED" } },
        isSearchable: true,
      },
      _count: { subjectId: true },
      having: { subjectId: { _count: { gt: 1 } } },
    }),
  ]);

  const findings = diagnosePublishedEvents(
    events.map((event) => ({
      ...event,
      placements: event.placements.map((placement) => ({
        type: placement.type,
        members: placement.members.map((member) => ({
          competitorId: member.competitorId,
          status: member.competitor.subject.status,
          mergedIntoId: member.competitor.subject.mergedIntoId,
        })),
      })),
    })),
  );

  if (openMigrationIssues) {
    findings.push({
      severity: "WARNING",
      code: "OPEN_MIGRATION_ISSUES",
      message: `${openMigrationIssues} incidencias de migración continúan abiertas.`,
    });
  }
  if (duplicateNames.length) {
    findings.push({
      severity: "WARNING",
      code: "POTENTIAL_DUPLICATES",
      message: `${duplicateNames.length} nombres buscables aparecen en más de un competidor.`,
    });
  }
  return findings;
}

export async function processRecalculationRun(runId: string) {
  const claimed = await db.recalculationRun.updateMany({
    where: { id: runId, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: new Date(), finishedAt: null, error: null },
  });
  if (claimed.count !== 1) {
    throw new Error("La ejecución ya fue tomada o no está pendiente.");
  }

  try {
    return await db.$transaction(
      async (tx) => {
        const run = await tx.recalculationRun.findUniqueOrThrow({
          where: { id: runId },
          select: { id: true, mode: true, correlationId: true },
        });
        const events = await tx.event.findMany({
          where: { status: { in: ["PUBLISHED", "CORRECTED"] } },
          orderBy: [{ occurredOn: "asc" }, { id: "asc" }],
          select: eventSelect,
        });
        const source = events.map((event) => ({
          ...event,
          placements: event.placements.map((placement) => ({
            type: placement.type,
            members: placement.members.map((member) => ({
              competitorId: member.competitorId,
              status: member.competitor.subject.status,
              mergedIntoId: member.competitor.subject.mergedIntoId,
            })),
          })),
        }));
        const findings = diagnosePublishedEvents(source);
        const errors = findings.filter(({ severity }) => severity === "ERROR");
        if (errors.length) {
          throw new DataQualityError(
            "Los datos publicados contienen inconsistencias críticas.",
            findings,
          );
        }

        const statistics = calculateCompetitorStatistics(source);
        const calculatedAt = new Date();
        if (run.mode === "APPLY") {
          await tx.competitorStatistic.deleteMany();
          if (statistics.length) {
            await tx.competitorStatistic.createMany({
              data: statistics.map((value) => ({
                ...value,
                runId,
                calculatedAt,
              })),
            });
          }
        }
        const badgeResult = await evaluateAndApplyBadges(
          tx,
          { id: run.id, mode: run.mode },
          statistics,
          source,
          calculatedAt,
        );
        const completed = await tx.recalculationRun.update({
          where: { id: runId, status: "RUNNING" },
          data: {
            status: "SUCCEEDED",
            finishedAt: calculatedAt,
            summary: {
              eventCount: events.length,
              competitorCount: statistics.length,
              warningCount: findings.length,
              mode: run.mode,
              applied: run.mode === "APPLY",
              findings,
              badges: badgeResult,
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            action: run.mode === "APPLY" ? "RECALCULATE" : "SIMULATE",
            entityKind: "recalculation_run",
            entityId: runId,
            afterData: {
              status: "SUCCEEDED",
              eventCount: events.length,
              competitorCount: statistics.length,
              badgeAwardCount: badgeResult.awardCount,
              badgeRevokeCount: badgeResult.revokeCount,
              badgeLevelChangeCount: badgeResult.levelChangeCount,
              unsupportedBadgeCount: badgeResult.unsupported.length,
            },
            reason: "Reconstrucción cronológica de estadísticas e insignias compatibles",
            correlationId: run.correlationId,
          },
        });
        return completed;
      },
      {
        isolationLevel: "Serializable",
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  } catch (error) {
    const payload =
      error instanceof DataQualityError
        ? { message: error.message, findings: error.findings }
        : {
            message:
              error instanceof Error ? error.message : "Error desconocido.",
          };
    await db.$transaction(async (tx) => {
      const failed = await tx.recalculationRun.update({
        where: { id: runId },
        data: { status: "FAILED", finishedAt: new Date(), error: payload },
        select: { correlationId: true },
      });
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          action: "RECALCULATION_FAILED",
          entityKind: "recalculation_run",
          entityId: runId,
          afterData: payload,
          reason: "La reconstrucción no modificó las estadísticas vigentes",
          correlationId: failed.correlationId,
        },
      });
    });
    throw error;
  }
}

export async function processNextRecalculationRun() {
  const next = await db.recalculationRun.findFirst({
    where: { status: "QUEUED" },
    orderBy: [{ queuedAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return next ? processRecalculationRun(next.id) : null;
}

export function queueFullRebuild(
  initiatedById: string,
  mode: "APPLY" | "DRY_RUN" = "APPLY",
) {
  return db.$transaction(async (tx) => {
    const correlationId = randomUUID();
    const run = await tx.recalculationRun.create({
      data: {
        correlationId,
        triggerType: "FULL_REBUILD",
        mode,
        status: "QUEUED",
        initiatedById,
        summary: { requestedFrom: "admin" },
      },
    });
    await tx.auditLog.create({
      data: {
        actorType: "USER",
        actorUserId: initiatedById,
        action: mode === "APPLY" ? "QUEUE_RECALCULATION" : "QUEUE_SIMULATION",
        entityKind: "recalculation_run",
        entityId: run.id,
        afterData: { mode, status: "QUEUED", triggerType: "FULL_REBUILD" },
        reason: "Reconstrucción total solicitada desde administración",
        correlationId,
      },
    });
    return run;
  });
}

export function retryRecalculationRun(id: string, initiatedById: string) {
  return db.$transaction(async (tx) => {
    const run = await tx.recalculationRun.update({
      where: { id, status: "FAILED" },
      data: {
        status: "QUEUED",
        queuedAt: new Date(),
        startedAt: null,
        finishedAt: null,
        error: null,
        initiatedById,
      },
      select: { id: true, correlationId: true },
    });
    await tx.auditLog.create({
      data: {
        actorType: "USER",
        actorUserId: initiatedById,
        action: "RETRY_RECALCULATION",
        entityKind: "recalculation_run",
        entityId: id,
        afterData: { status: "QUEUED" },
        reason: "Reintento solicitado desde administración",
        correlationId: run.correlationId,
      },
    });
    return run;
  });
}
