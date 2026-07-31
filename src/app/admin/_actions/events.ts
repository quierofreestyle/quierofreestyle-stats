"use server";

import { randomInt, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildEventIdentity,
  eventFormError,
  readEventForm,
  type EventFormState,
} from "../../../features/admin/event-form";
import { validateEventPublication } from "../../../features/admin/event-publication";
import { normalizeSlug } from "../../../features/admin/subject-form";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

const EVENT_MANAGE = ["EVENT_MANAGE"] as const;
const EVENT_PUBLISH = ["EVENT_PUBLISH"] as const;

export type QuickCompetitorResult =
  | { competitor: { id: string; label: string }; error?: never }
  | { competitor?: never; error: string };

export async function createQuickCompetitor(
  displayNameInput: string,
): Promise<QuickCompetitorResult> {
  const actor = await requireAdminCapability(EVENT_MANAGE, "/admin/eventos/nuevo");
  const displayName = displayNameInput.trim();
  if (displayName.length < 2 || displayName.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }
  const slug = normalizeSlug(displayName);
  try {
    const duplicate = await db.subject.findFirst({
      where: {
        type: "COMPETITOR",
        OR: [
          { displayName: { equals: displayName, mode: "insensitive" } },
          { slug },
          {
            names: {
              some: {
                normalizedValue: { equals: displayName, mode: "insensitive" },
              },
            },
          },
        ],
      },
      select: { id: true, displayName: true },
    });
    if (duplicate) {
      return {
        error: `Ya existe el competidor “${duplicate.displayName}”. Seleccionalo desde la búsqueda.`,
      };
    }
    const created = await db.$transaction(async (tx) => {
      const subject = await tx.subject.create({
        data: {
          displayName,
          slug,
          type: "COMPETITOR",
          status: "DRAFT",
          names: {
            create: {
              value: displayName,
              normalizedValue: displayName,
              kind: "PRIMARY",
            },
          },
          competitor: { create: {} },
        },
        select: { id: true, displayName: true },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "CREATE",
          entityKind: "subject",
          entityId: subject.id,
          afterData: { displayName, slug, type: "COMPETITOR", status: "DRAFT" },
          reason: "Alta rápida de competidor desde evento",
        },
      });
      return subject;
    });
    return { competitor: { id: created.id, label: created.displayName } };
  } catch (error) {
    return { error: eventFormError(error) };
  }
}

function eventData(
  input: ReturnType<typeof readEventForm>,
  identity: ReturnType<typeof buildEventIdentity>,
) {
  const {
    placements: _placements,
    sources: _sources,
    ...data
  } = input;
  void _placements;
  void _sources;
  return { ...data, ...identity, status: "DRAFT" as const };
}

function placementCreates(input: ReturnType<typeof readEventForm>) {
  return input.placements.map((placement, slotIndex) => ({
    position: placement.position,
    slot: slotIndex + 1,
    type: placement.type,
    groupLabel: placement.groupLabel,
    members: {
      create: placement.competitorIds.map((competitorId, memberIndex) => ({
        competitorId,
        memberOrder: memberIndex + 1,
      })),
    },
  }));
}

function sourceCreates(input: ReturnType<typeof readEventForm>) {
  return input.sources.map((source) => ({
    purpose: source.purpose,
    source: {
      create: {
        url: source.url,
        title: source.title,
        publisher: source.publisher,
        type: source.type,
      },
    },
  }));
}

async function validateReferences(input: ReturnType<typeof readEventForm>) {
  const competition = await db.competition.findUnique({
    where: { subjectId: input.competitionId },
    select: { subject: { select: { displayName: true } } },
  });
  if (!competition) throw new Error("La competencia seleccionada ya no está disponible.");
  if (input.seasonId) {
    const season = await db.season.findUnique({
      where: {
        id_competitionId: {
          id: input.seasonId,
          competitionId: input.competitionId,
        },
      },
      select: { id: true },
    });
    if (!season) throw new Error("La temporada no pertenece a la competencia seleccionada.");
  }
  const competitorIds = [
    ...new Set(input.placements.flatMap(({ competitorIds }) => competitorIds)),
  ];
  if (competitorIds.length) {
    const count = await db.competitor.count({
      where: { subjectId: { in: competitorIds } },
    });
    if (count !== competitorIds.length) {
      throw new Error("Uno de los integrantes seleccionados ya no está disponible.");
    }
  }
  return competition.subject.displayName;
}

async function createIdentity(
  input: ReturnType<typeof readEventForm>,
  competitionName: string,
  currentSlug?: string,
) {
  const probe = buildEventIdentity(competitionName, input, "00");
  const base = probe.slug.slice(0, -3);
  if (currentSlug?.startsWith(`${base}-`)) {
    return { title: probe.title, slug: currentSlug };
  }
  const used = new Set(
    (
      await db.event.findMany({
        where: {
          competitionId: input.competitionId,
          slug: { startsWith: `${base}-` },
        },
        select: { slug: true },
      })
    ).map(({ slug }) => slug),
  );
  const start = randomInt(10, 100);
  for (let offset = 0; offset < 90; offset += 1) {
    const suffix = String(10 + ((start - 10 + offset) % 90));
    const identity = buildEventIdentity(competitionName, input, suffix);
    if (!used.has(identity.slug)) return identity;
  }
  throw new Error("No se pudo generar un identificador único para este evento.");
}

export async function createEvent(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await requireAdminCapability(EVENT_MANAGE, "/admin/eventos/nuevo");
  try {
    const input = readEventForm(formData);
    const competitionName = await validateReferences(input);
    const identity = await createIdentity(input, competitionName);
    await db.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          ...eventData(input, identity),
          placements: { create: placementCreates(input) },
          sources: { create: sourceCreates(input) },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "CREATE",
          entityKind: "event",
          entityId: created.id,
          afterData: JSON.parse(JSON.stringify({ ...input, ...identity })),
          reason: "Alta administrativa de evento en borrador",
        },
      });
    });
  } catch (error) {
    return { error: eventFormError(error) };
  }
  redirect("/admin/eventos?success=created");
}

export async function updateEvent(
  id: string,
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await requireAdminCapability(
    EVENT_MANAGE,
    `/admin/eventos/${id}/editar`,
  );
  try {
    const input = readEventForm(formData);
    const competitionName = await validateReferences(input);
    const current = await db.event.findUnique({ where: { id }, select: { slug: true } });
    if (!current) throw new Error("El evento ya no existe.");
    const identity = await createIdentity(input, competitionName, current.slug);
    await db.$transaction(async (tx) => {
      const before = await tx.event.findUniqueOrThrow({
        where: { id },
        include: {
          placements: { include: { members: true } },
          sources: { include: { source: true } },
        },
      });
      if (before.status !== "DRAFT") {
        throw new Error(
          "Solo se pueden editar eventos en borrador. Los datos publicados requieren el flujo de corrección.",
        );
      }
      await tx.placementMember.deleteMany({
        where: { placement: { eventId: id } },
      });
      await tx.placement.deleteMany({ where: { eventId: id } });
      const previousSourceIds = before.sources.map(({ sourceId }) => sourceId);
      await tx.eventSource.deleteMany({ where: { eventId: id } });
      if (previousSourceIds.length) {
        await tx.source.deleteMany({
          where: {
            id: { in: previousSourceIds },
            events: { none: {} },
          },
        });
      }
      await tx.event.update({
        where: { id, status: "DRAFT" },
        data: {
          ...eventData(input, identity),
          placements: { create: placementCreates(input) },
          sources: { create: sourceCreates(input) },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "UPDATE",
          entityKind: "event",
          entityId: id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: JSON.parse(JSON.stringify({ ...input, ...identity })),
          reason: "Edición administrativa de evento en borrador",
        },
      });
    });
  } catch (error) {
    return { error: eventFormError(error) };
  }
  redirect(`/admin/eventos/${id}?success=updated`);
}

export async function publishEvent(id: string) {
  const actor = await requireAdminCapability(
    EVENT_PUBLISH,
    `/admin/eventos/${id}/publicar`,
  );
  let publicationError: string | null = null;

  try {
    const correlationId = randomUUID();
    await db.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id },
        include: {
          competition: { select: { subjectId: true } },
          placements: {
            where: { status: "ACTIVE" },
            include: { members: { select: { competitorId: true } } },
            orderBy: [{ position: "asc" }, { slot: "asc" }],
          },
        },
      });
      if (!event) throw new Error("El evento ya no existe.");

      const validation = validateEventPublication({
        competitionExists: Boolean(event.competition),
        datePrecision: event.datePrecision,
        format: event.format,
        placements: event.placements.map((placement) => ({
          competitorIds: placement.members.map(({ competitorId }) => competitorId),
          position: placement.position,
          type: placement.type,
        })),
        resolution: event.resolution,
        status: event.status,
      });
      if (validation.errors.length) {
        throw new Error(validation.errors.join(" "));
      }

      const publishedAt = new Date();
      const updated = await tx.event.update({
        where: { id, status: "DRAFT" },
        data: {
          publishedAt,
          publishedById: actor.id,
          status: "PUBLISHED",
        },
      });
      await tx.recalculationRun.create({
        data: {
          correlationId,
          triggerType: "EVENT_PUBLISHED",
          triggerEntityId: id,
          mode: "APPLY",
          status: "QUEUED",
          initiatedById: actor.id,
          summary: {
            eventId: id,
            participantCount: validation.participantCount,
            resultCount: validation.resultCount,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "PUBLISH",
          entityKind: "event",
          entityId: id,
          beforeData: {
            publishedAt: event.publishedAt,
            publishedById: event.publishedById,
            status: event.status,
          },
          afterData: {
            publishedAt: updated.publishedAt,
            publishedById: updated.publishedById,
            status: updated.status,
          },
          reason: "Publicación administrativa de evento",
          correlationId,
        },
      });
    });
  } catch (error) {
    publicationError = eventFormError(error);
  }

  if (publicationError) {
    redirect(
      `/admin/eventos/${id}/publicar?error=${encodeURIComponent(publicationError)}`,
    );
  }
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  redirect(`/admin/eventos/${id}?success=published`);
}

function requiredReason(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10 || reason.length > 500) {
    throw new Error("El motivo debe tener entre 10 y 500 caracteres.");
  }
  return reason;
}

function expectedVersion(formData: FormData) {
  const value = String(formData.get("expectedUpdatedAt") ?? "");
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error("No se pudo verificar la versión del evento. Volvé a cargar la página.");
  }
  return date;
}

export async function correctEvent(
  id: string,
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await requireAdminCapability(
    EVENT_MANAGE,
    `/admin/eventos/${id}/corregir`,
  );
  try {
    const reason = requiredReason(formData);
    const version = expectedVersion(formData);
    const input = readEventForm(formData);
    const competitionName = await validateReferences(input);
    const current = await db.event.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!current) throw new Error("El evento ya no existe.");
    const identity = await createIdentity(input, competitionName, current.slug);
    const correlationId = randomUUID();

    await db.$transaction(async (tx) => {
      const before = await tx.event.findUniqueOrThrow({
        where: { id },
        include: {
          placements: {
            where: { status: "ACTIVE" },
            include: { members: true },
            orderBy: [{ position: "asc" }, { slot: "asc" }],
          },
          sources: { include: { source: true } },
        },
      });
      const validation = validateEventPublication({
        competitionExists: true,
        datePrecision: input.datePrecision,
        format: input.format,
        placements: input.placements.map((placement) => ({
          competitorIds: placement.competitorIds,
          position: placement.position,
          type: placement.type,
        })),
        resolution: input.resolution,
        status: before.status,
        operation: "CORRECT",
      });
      if (validation.errors.length) {
        throw new Error(validation.errors.join(" "));
      }

      const scalarData = eventData(input, identity);
      const { status: _draftStatus, ...correctedData } = scalarData;
      void _draftStatus;
      const claimed = await tx.event.updateMany({
        where: {
          id,
          status: { in: ["PUBLISHED", "CORRECTED"] },
          updatedAt: version,
        },
        data: { ...correctedData, status: "CORRECTED" },
      });
      if (claimed.count !== 1) {
        throw new Error(
          "El evento cambió desde que abriste esta pantalla. Recargalo y revisá la corrección antes de confirmar.",
        );
      }

      await tx.placementMember.deleteMany({
        where: { placement: { eventId: id } },
      });
      await tx.placement.deleteMany({ where: { eventId: id } });
      const previousSourceIds = before.sources.map(({ sourceId }) => sourceId);
      await tx.eventSource.deleteMany({ where: { eventId: id } });
      if (previousSourceIds.length) {
        await tx.source.deleteMany({
          where: { id: { in: previousSourceIds }, events: { none: {} } },
        });
      }
      await tx.event.update({
        where: { id },
        data: {
          placements: { create: placementCreates(input) },
          sources: { create: sourceCreates(input) },
        },
      });
      const after = JSON.parse(
        JSON.stringify({ ...input, ...identity, status: "CORRECTED" }),
      );
      await tx.recalculationRun.create({
        data: {
          correlationId,
          triggerType: "EVENT_CORRECTED",
          triggerEntityId: id,
          mode: "APPLY",
          status: "QUEUED",
          initiatedById: actor.id,
          summary: {
            eventId: id,
            participantCount: validation.participantCount,
            resultCount: validation.resultCount,
            warnings: validation.warnings,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "CORRECT",
          entityKind: "event",
          entityId: id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: after,
          reason,
          correlationId,
        },
      });
    });
  } catch (error) {
    return { error: eventFormError(error) };
  }
  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath("/eventos");
  redirect(`/admin/eventos/${id}?success=corrected`);
}

export async function annulEvent(id: string, formData: FormData) {
  const actor = await requireAdminCapability(
    EVENT_MANAGE,
    `/admin/eventos/${id}/anular`,
  );
  let actionError: string | null = null;
  try {
    const reason = requiredReason(formData);
    const version = expectedVersion(formData);
    const correlationId = randomUUID();
    await db.$transaction(async (tx) => {
      const before = await tx.event.findUnique({ where: { id } });
      if (!before) throw new Error("El evento ya no existe.");
      const updated = await tx.event.updateMany({
        where: {
          id,
          status: { in: ["PUBLISHED", "CORRECTED"] },
          updatedAt: version,
        },
        data: { status: "ANNULLED" },
      });
      if (updated.count !== 1) {
        throw new Error(
          "El evento cambió desde que abriste esta pantalla. Recargalo antes de anular.",
        );
      }
      await tx.recalculationRun.create({
        data: {
          correlationId,
          triggerType: "EVENT_ANNULLED",
          triggerEntityId: id,
          mode: "APPLY",
          status: "QUEUED",
          initiatedById: actor.id,
          summary: { eventId: id, previousStatus: before.status },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "ANNUL",
          entityKind: "event",
          entityId: id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: { status: "ANNULLED" },
          reason,
          correlationId,
        },
      });
    });
  } catch (error) {
    actionError = eventFormError(error);
  }
  if (actionError) {
    redirect(`/admin/eventos/${id}/anular?error=${encodeURIComponent(actionError)}`);
  }
  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${id}`);
  revalidatePath("/eventos");
  redirect(`/admin/eventos/${id}?success=annulled`);
}
