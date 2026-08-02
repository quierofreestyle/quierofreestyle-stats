"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { badgeActionError, readBadgeForm, type BadgeFormState, type BadgeFormValues } from "../../../features/admin/badge-form";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

const BADGE_MANAGE = ["BADGE_MANAGE"] as const;

function snapshot(values: BadgeFormValues) {
  return {
    code: values.code, name: values.name, slug: values.slug,
    kind: values.kind, assignmentMode: values.assignmentMode,
    recipientType: values.recipientType, permanenceMode: values.permanenceMode,
    status: values.status, scopeType: values.scopeType,
    competitionId: values.competitionId, metricId: values.metricId,
    operator: values.operator, threshold: values.threshold,
    tiers: values.tiers.map(({ rank, displayName, threshold, color, imageUrl }) => ({ rank, displayName, threshold, color, imageUrl })),
  };
}

async function validateReferences(values: BadgeFormValues) {
  if (values.scopeType === "COMPETITION") {
    const competition = await db.competition.findUnique({ where: { subjectId: values.competitionId! }, select: { subjectId: true } });
    if (!competition) throw new Error("La competencia seleccionada no existe.");
  }
  if (values.assignmentMode === "AUTOMATIC") {
    const metric = await db.metricDefinition.findFirst({
      where: { id: values.metricId!, isActive: true, recipientTypes: { some: { recipientType: values.recipientType } } },
      select: { id: true },
    });
    if (!metric) throw new Error("La métrica no está disponible para el destinatario seleccionado.");
  }
}

function ruleData(values: BadgeFormValues, versionNumber: number, actorId: string) {
  if (values.assignmentMode !== "AUTOMATIC") return undefined;
  return {
    metricId: values.metricId!, versionNumber,
    aggregation: "SUM" as const, operator: values.operator!,
    baseThreshold: values.threshold, config: { scopeType: values.scopeType },
    status: values.status === "ACTIVE" ? "ACTIVE" as const : "DRAFT" as const,
    createdById: actorId, reason: values.reason!,
    tiers: values.kind === "TIERED" ? { create: values.tiers.map((tier) => ({
      rank: tier.rank, code: tier.code, displayName: tier.displayName,
      threshold: tier.threshold, color: tier.color, imageUrl: tier.imageUrl,
    })) } : undefined,
  };
}

function instanceData(values: BadgeFormValues) {
  return {
    slug: values.slug, displayName: values.name, description: values.description,
    status: values.status, publishedAt: values.status === "ACTIVE" ? new Date() : null,
    scope: { create: {
      scopeType: values.scopeType,
      competitionId: values.scopeType === "COMPETITION" ? values.competitionId : null,
    } },
  };
}

export async function createBadge(_state: BadgeFormState, formData: FormData): Promise<BadgeFormState> {
  const actor = await requireAdminCapability(BADGE_MANAGE, "/admin/insignias/nueva");
  try {
    const values = readBadgeForm(formData);
    await validateReferences(values);
    await db.$transaction(async (tx) => {
      const created = await tx.badgeDefinition.create({
        data: {
          code: values.code, kind: values.kind, assignmentMode: values.assignmentMode,
          nameTemplate: values.name, descriptionTemplate: values.description,
          publicRule: values.publicRule, imageUrl: values.imageUrl,
          recipientType: values.recipientType, permanenceMode: values.permanenceMode,
          tiePolicy: values.kind === "UNIQUE" ? "FIRST_REACHED_NO_INITIAL_HOLDER" : null,
          status: values.status, archivedAt: values.status === "ARCHIVED" ? new Date() : null,
          createdById: actor.id,
          instances: { create: instanceData(values) },
          ruleVersions: ruleData(values, 1, actor.id) ? { create: ruleData(values, 1, actor.id)! } : undefined,
        },
      });
      await tx.auditLog.create({ data: {
        actorType: "USER", actorUserId: actor.id, action: "CREATE",
        entityKind: "badge_definition", entityId: created.id,
        afterData: snapshot(values), reason: "Alta administrativa de insignia",
      } });
    });
  } catch (error) { return { error: badgeActionError(error) }; }
  revalidatePath("/admin/insignias");
  redirect("/admin/insignias?success=created");
}

export async function updateBadge(id: string, _state: BadgeFormState, formData: FormData): Promise<BadgeFormState> {
  const actor = await requireAdminCapability(BADGE_MANAGE, `/admin/insignias/${id}/editar`);
  try {
    const values = readBadgeForm(formData);
    await validateReferences(values);
    await db.$transaction(async (tx) => {
      const before = await tx.badgeDefinition.findUniqueOrThrow({
        where: { id }, include: { instances: { include: { scope: true } }, ruleVersions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      });
      const instance = before.instances[0];
      if (!instance) throw new Error("La insignia no tiene una instancia administrable.");
      const nextVersion = (before.ruleVersions[0]?.versionNumber ?? 0) + 1;

      await tx.badgeRuleVersion.updateMany({ where: { badgeDefinitionId: id, status: { in: ["DRAFT", "ACTIVE"] } }, data: { status: "RETIRED" } });
      await tx.badgeDefinition.update({ where: { id }, data: {
        code: values.code, kind: values.kind, assignmentMode: values.assignmentMode,
        nameTemplate: values.name, descriptionTemplate: values.description,
        publicRule: values.publicRule, imageUrl: values.imageUrl,
        recipientType: values.recipientType, permanenceMode: values.permanenceMode,
        tiePolicy: values.kind === "UNIQUE" ? "FIRST_REACHED_NO_INITIAL_HOLDER" : null,
        status: values.status, archivedAt: values.status === "ARCHIVED" ? new Date() : null,
        ruleVersions: ruleData(values, nextVersion, actor.id) ? { create: ruleData(values, nextVersion, actor.id)! } : undefined,
      } });
      await tx.badgeInstance.update({ where: { id: instance.id }, data: {
        slug: values.slug, displayName: values.name, description: values.description,
        status: values.status, publishedAt: values.status === "ACTIVE" ? (instance.publishedAt ?? new Date()) : null,
      } });
      await tx.badgeScope.upsert({ where: { badgeInstanceId: instance.id }, create: {
        badgeInstanceId: instance.id, scopeType: values.scopeType,
        competitionId: values.scopeType === "COMPETITION" ? values.competitionId : null,
      }, update: {
        scopeType: values.scopeType,
        competitionId: values.scopeType === "COMPETITION" ? values.competitionId : null,
        organizationId: null, seasonId: null, regionId: null,
      } });
      await tx.auditLog.create({ data: {
        actorType: "USER", actorUserId: actor.id, action: values.status === "ARCHIVED" ? "ARCHIVE" : "UPDATE",
        entityKind: "badge_definition", entityId: id,
        beforeData: { code: before.code, name: before.nameTemplate, status: before.status, version: before.ruleVersions[0]?.versionNumber ?? null },
        afterData: snapshot(values), reason: values.reason ?? "Edición administrativa de insignia",
      } });
    });
  } catch (error) { return { error: badgeActionError(error) }; }
  revalidatePath("/admin/insignias");
  redirect("/admin/insignias?success=updated");
}

export async function archiveBadge(id: string) {
  const actor = await requireAdminCapability(BADGE_MANAGE, "/admin/insignias");
  await db.$transaction(async (tx) => {
    const before = await tx.badgeDefinition.findUniqueOrThrow({ where: { id }, select: { status: true } });
    await tx.badgeDefinition.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date(), instances: { updateMany: { where: {}, data: { status: "ARCHIVED" } } } } });
    await tx.auditLog.create({ data: {
      actorType: "USER", actorUserId: actor.id, action: "ARCHIVE", entityKind: "badge_definition", entityId: id,
      beforeData: { status: before.status }, afterData: { status: "ARCHIVED" }, reason: "Archivado administrativo sin eliminación",
    } });
  });
  revalidatePath("/admin/insignias");
  redirect("/admin/insignias?success=archived");
}
