import "server-only";

import { randomUUID } from "node:crypto";

import {
  calculateCompetitorStatistics,
  diagnosePublishedEvents,
} from "../../features/statistics/engine";
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
            },
            reason: "Reconstrucción cronológica de estadísticas",
            correlationId: run.correlationId,
          },
        });
        return completed;
      },
      { isolationLevel: "Serializable" },
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
