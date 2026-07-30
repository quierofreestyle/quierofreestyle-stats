import { randomUUID } from "node:crypto";

import {
  DatePrecision,
  EventResolution,
  EventStatus,
  MigrationRecordStatus,
  OrganizationType,
  PlacementStatus,
  PlacementType,
  RecordStatus,
  SeasonStatus,
  SubjectNameKind,
  SubjectType,
  PrismaClient,
} from "../../generated/prisma/client";
import {
  type LegacyImportPlan,
  organizationSlug,
  payloadHash,
} from "./legacy-data";

const SOURCE_SYSTEM = "quiero-freestyle-json-v1";

async function upsertSubject(
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  input: {
    slug: string;
    displayName: string;
    type: SubjectType;
    status: RecordStatus;
    bio?: string;
  },
) {
  const subject = await tx.subject.upsert({
    where: {
      type_slug: {
        type: input.type,
        slug: input.slug,
      },
    },
    update: {
      displayName: input.displayName,
      status: input.status,
      bio: input.bio,
    },
    create: input,
  });
  const primaryName = await tx.subjectName.findFirst({
    where: { subjectId: subject.id, kind: SubjectNameKind.PRIMARY },
    orderBy: { createdAt: "asc" },
  });
  if (primaryName) {
    await tx.subjectName.update({
      where: { id: primaryName.id },
      data: {
        value: input.displayName,
        normalizedValue: input.displayName.trim().toLocaleLowerCase("es"),
      },
    });
    await tx.subjectName.deleteMany({
      where: {
        subjectId: subject.id,
        kind: SubjectNameKind.PRIMARY,
        id: { not: primaryName.id },
      },
    });
  } else {
    await tx.subjectName.create({
      data: {
        subjectId: subject.id,
        value: input.displayName,
        normalizedValue: input.displayName.trim().toLocaleLowerCase("es"),
        kind: SubjectNameKind.PRIMARY,
      },
    });
  }
  return subject;
}

async function ensureProvisionalOrganization(
  tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  competitionSlug: string,
  displayName: string,
) {
  const slug = organizationSlug(competitionSlug);
  const existing = await tx.subject.findUnique({
    where: {
      type_slug: {
        type: SubjectType.ORGANIZATION,
        slug,
      },
    },
  });
  if (existing) {
    return existing;
  }
  return upsertSubject(tx, {
    slug,
    displayName,
    type: SubjectType.ORGANIZATION,
    status: RecordStatus.DRAFT,
    bio: "Organización provisional pendiente de completar.",
  });
}

export async function applyLegacyImportPlan(
  database: PrismaClient,
  plan: LegacyImportPlan,
) {
  const batchId = randomUUID();

  await database.$transaction(async (tx) => {
    const competitorIds = new Map<string, string>();
    const competitionIds = new Map<string, string>();

    for (const legacy of plan.competitors) {
      const subject = await upsertSubject(tx, {
        slug: legacy.slug,
        displayName: legacy.nombre,
        type: SubjectType.COMPETITOR,
        status: legacy.activo ? RecordStatus.ACTIVE : RecordStatus.ARCHIVED,
        bio: legacy.frase || undefined,
      });
      await tx.competitor.upsert({
        where: { subjectId: subject.id },
        update: {},
        create: { subjectId: subject.id },
      });
      competitorIds.set(legacy.id, subject.id);
      await tx.legacyRecordMap.upsert({
        where: {
          sourceSystem_entityKind_legacyId: {
            sourceSystem: SOURCE_SYSTEM,
            entityKind: "competitor",
            legacyId: legacy.id,
          },
        },
        update: {
          targetId: subject.id,
          payloadHash: payloadHash(legacy),
          batchId,
          status: MigrationRecordStatus.MAPPED,
          migratedAt: new Date(),
        },
        create: {
          sourceSystem: SOURCE_SYSTEM,
          entityKind: "competitor",
          legacyId: legacy.id,
          targetId: subject.id,
          payloadHash: payloadHash(legacy),
          batchId,
          status: MigrationRecordStatus.MAPPED,
        },
      });
    }

    for (const legacy of plan.competitions) {
      const organizationSubject = await ensureProvisionalOrganization(
        tx,
        legacy.slug,
        legacy.nombre,
      );
      await tx.organization.upsert({
        where: { subjectId: organizationSubject.id },
        update: { organizationType: OrganizationType.ORGANIZER },
        create: {
          subjectId: organizationSubject.id,
          organizationType: OrganizationType.ORGANIZER,
        },
      });

      const competitionSubject = await upsertSubject(tx, {
        slug: legacy.slug,
        displayName: legacy.nombre,
        type: SubjectType.COMPETITION,
        status: RecordStatus.ACTIVE,
        bio: legacy.descripcion || undefined,
      });
      await tx.competition.upsert({
        where: { subjectId: competitionSubject.id },
        update: { organizationId: organizationSubject.id },
        create: {
          subjectId: competitionSubject.id,
          organizationId: organizationSubject.id,
        },
      });
      await tx.season.upsert({
        where: {
          competitionId_name: {
            competitionId: competitionSubject.id,
            name: "2026",
          },
        },
        update: { status: SeasonStatus.ACTIVE },
        create: {
          competitionId: competitionSubject.id,
          name: "2026",
          startsOn: new Date("2026-01-01T00:00:00.000Z"),
          endsOn: new Date("2026-12-31T00:00:00.000Z"),
          status: SeasonStatus.ACTIVE,
        },
      });
      competitionIds.set(legacy.id, competitionSubject.id);

      for (const [entityKind, legacyId, targetId, payload] of [
        ["organization", legacy.id, organizationSubject.id, legacy],
        ["competition", legacy.id, competitionSubject.id, legacy],
      ] as const) {
        await tx.legacyRecordMap.upsert({
          where: {
            sourceSystem_entityKind_legacyId: {
              sourceSystem: SOURCE_SYSTEM,
              entityKind,
              legacyId,
            },
          },
          update: {
            targetId,
            payloadHash: payloadHash(payload),
            batchId,
            status: MigrationRecordStatus.MAPPED,
            migratedAt: new Date(),
          },
          create: {
            sourceSystem: SOURCE_SYSTEM,
            entityKind,
            legacyId,
            targetId,
            payloadHash: payloadHash(payload),
            batchId,
            status: MigrationRecordStatus.MAPPED,
          },
        });
      }
    }

    for (const legacy of plan.events) {
      const competitionId = competitionIds.get(legacy.competencia_id);
      if (!competitionId) throw new Error(`Competencia no mapeada: ${legacy.competencia_id}`);
      const season = await tx.season.findUniqueOrThrow({
        where: { competitionId_name: { competitionId, name: "2026" } },
      });
      const date = new Date(`${legacy.fecha}T00:00:00.000Z`);
      const event = await tx.event.upsert({
        where: {
          competitionId_slug: { competitionId, slug: legacy.id },
        },
        update: {
          seasonId: season.id,
          title: `${legacy.competencia_nombre} · ${legacy.fecha_visible}`,
          eventYear: date.getUTCFullYear(),
          eventMonth: date.getUTCMonth() + 1,
          eventDay: date.getUTCDate(),
          occurredOn: date,
          datePrecision: DatePrecision.DAY,
          officialScope: legacy.officialScope,
          scopeNotes: legacy.scopeNotes,
          format: legacy.format,
          resolution: EventResolution.DECIDED,
          status: legacy.publish ? EventStatus.PUBLISHED : EventStatus.DRAFT,
          publishedAt: legacy.publish ? date : null,
        },
        create: {
          competitionId,
          seasonId: season.id,
          slug: legacy.id,
          title: `${legacy.competencia_nombre} · ${legacy.fecha_visible}`,
          eventYear: date.getUTCFullYear(),
          eventMonth: date.getUTCMonth() + 1,
          eventDay: date.getUTCDate(),
          occurredOn: date,
          datePrecision: DatePrecision.DAY,
          officialScope: legacy.officialScope,
          scopeNotes: legacy.scopeNotes,
          format: legacy.format,
          resolution: EventResolution.DECIDED,
          status: legacy.publish ? EventStatus.PUBLISHED : EventStatus.DRAFT,
          publishedAt: legacy.publish ? date : null,
        },
      });

      await tx.placementMember.deleteMany({
        where: { placement: { eventId: event.id } },
      });
      await tx.placement.deleteMany({ where: { eventId: event.id } });

      for (const placement of [
        {
          position: 1,
          type: PlacementType.CHAMPION,
          members: legacy.validWinners,
        },
        {
          position: 2,
          type: PlacementType.RUNNER_UP,
          members: legacy.validRunnersUp,
        },
      ]) {
        if (placement.members.length === 0) continue;
        const created = await tx.placement.create({
          data: {
            eventId: event.id,
            position: placement.position,
            type: placement.type,
            status: PlacementStatus.ACTIVE,
            groupLabel: placement.members.length > 1 ? legacy.modalidad : null,
          },
        });
        await tx.placementMember.createMany({
          data: placement.members.map((member, index) => ({
            placementId: created.id,
            competitorId: competitorIds.get(member.competidor_id)!,
            memberOrder: index + 1,
            displayNameAtEvent: member.competidor_nombre,
          })),
        });
      }

      await tx.legacyRecordMap.upsert({
        where: {
          sourceSystem_entityKind_legacyId: {
            sourceSystem: SOURCE_SYSTEM,
            entityKind: "event",
            legacyId: legacy.id,
          },
        },
        update: {
          targetId: event.id,
          payloadHash: payloadHash(legacy),
          batchId,
          status: MigrationRecordStatus.MAPPED,
          migratedAt: new Date(),
        },
        create: {
          sourceSystem: SOURCE_SYSTEM,
          entityKind: "event",
          legacyId: legacy.id,
          targetId: event.id,
          payloadHash: payloadHash(legacy),
          batchId,
          status: MigrationRecordStatus.MAPPED,
        },
      });
    }

    for (const issue of plan.issues) {
      const existing = await tx.migrationIssue.findFirst({
        where: {
          entityKind: issue.entityKind,
          legacyKey: issue.legacyKey,
          issueType: issue.issueType,
          status: "OPEN",
        },
      });
      if (!existing) {
        await tx.migrationIssue.create({
          data: {
            batchId,
            entityKind: issue.entityKind,
            legacyKey: issue.legacyKey,
            issueType: issue.issueType,
            payload: { detail: issue.detail },
          },
        });
      }
    }
  }, { maxWait: 30_000, timeout: 900_000 });

  return { batchId, ...plan.report };
}
