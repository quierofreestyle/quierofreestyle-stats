"use server";

import { redirect } from "next/navigation";

import {
  actionError,
  optionalDate,
  optionalUrl,
  readSubjectForm,
} from "../../../features/admin/subject-form";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

const SUBJECT_MANAGE = ["SUBJECT_MANAGE"] as const;

function destination(path: string, error?: unknown) {
  if (!error) return path;
  return `${path}?error=${encodeURIComponent(actionError(error))}`;
}

async function assertUniqueSubject(
  slug: string,
  displayName: string,
  excludingId?: string,
) {
  const duplicate = await db.subject.findFirst({
    where: {
      ...(excludingId ? { id: { not: excludingId } } : {}),
      OR: [
        { slug },
        { displayName: { equals: displayName, mode: "insensitive" } },
        {
          names: {
            some: {
              normalizedValue: { equals: displayName, mode: "insensitive" },
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("Ya existe un sujeto con ese nombre o slug.");
  }
}

export async function createCompetitor(formData: FormData) {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    "/admin/competidores/nuevo",
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject(subject.slug, subject.displayName);
    const homeRegionId = String(formData.get("homeRegionId") ?? "") || null;
    const birthDate = optionalDate(formData.get("birthDate"));
    await db.$transaction(async (tx) => {
      const created = await tx.subject.create({
        data: {
          ...subject,
          type: "COMPETITOR",
          names: {
            create: {
              value: subject.displayName,
              normalizedValue: subject.displayName,
              kind: "PRIMARY",
            },
          },
          competitor: {
            create: { homeRegionId, birthDate },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "CREATE",
          entityKind: "subject",
          entityId: created.id,
          afterData: subject,
          reason: "Alta administrativa de competidor",
        },
      });
    });
  } catch (error) {
    redirect(destination("/admin/competidores/nuevo", error));
  }
  redirect("/admin/competidores?success=created");
}

export async function updateCompetitor(id: string, formData: FormData) {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    `/admin/competidores/${id}/editar`,
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject(subject.slug, subject.displayName, id);
    const homeRegionId = String(formData.get("homeRegionId") ?? "") || null;
    const birthDate = optionalDate(formData.get("birthDate"));
    await db.$transaction(async (tx) => {
      const before = await tx.subject.findUniqueOrThrow({
        where: { id },
        include: { competitor: true, names: true },
      });
      if (before.displayName !== subject.displayName) {
        await tx.subjectName.updateMany({
          where: { subjectId: id, kind: "PRIMARY" },
          data: { kind: "PREVIOUS_NAME" },
        });
        await tx.subjectName.create({
          data: {
            subjectId: id,
            value: subject.displayName,
            normalizedValue: subject.displayName,
            kind: "PRIMARY",
          },
        });
      }
      await tx.subject.update({
        where: { id, type: "COMPETITOR" },
        data: {
          ...subject,
          competitor: { update: { homeRegionId, birthDate } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "UPDATE",
          entityKind: "subject",
          entityId: id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: { ...subject, homeRegionId, birthDate },
          reason: "Edición administrativa de competidor",
        },
      });
    });
  } catch (error) {
    redirect(destination(`/admin/competidores/${id}/editar`, error));
  }
  redirect("/admin/competidores?success=updated");
}

export async function createOrganization(formData: FormData) {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    "/admin/organizaciones/nueva",
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject(subject.slug, subject.displayName);
    const organizationType = String(formData.get("organizationType"));
    const foundedOn = optionalDate(formData.get("foundedOn"));
    const websiteUrl = optionalUrl(formData.get("websiteUrl"));
    if (!["ORGANIZER", "MEDIA", "LEAGUE", "COLLECTIVE", "OTHER"].includes(organizationType)) {
      throw new Error("Seleccioná un tipo de organización válido.");
    }
    await db.$transaction(async (tx) => {
      const created = await tx.subject.create({
        data: {
          ...subject,
          type: "ORGANIZATION",
          names: {
            create: {
              value: subject.displayName,
              normalizedValue: subject.displayName,
              kind: "PRIMARY",
            },
          },
          organization: {
            create: {
              organizationType: organizationType as
                | "ORGANIZER"
                | "MEDIA"
                | "LEAGUE"
                | "COLLECTIVE"
                | "OTHER",
              foundedOn,
              websiteUrl,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "CREATE",
          entityKind: "subject",
          entityId: created.id,
          afterData: subject,
          reason: "Alta administrativa de organización",
        },
      });
    });
  } catch (error) {
    redirect(destination("/admin/organizaciones/nueva", error));
  }
  redirect("/admin/organizaciones?success=created");
}

export async function updateOrganization(id: string, formData: FormData) {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    `/admin/organizaciones/${id}/editar`,
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject(subject.slug, subject.displayName, id);
    const organizationType = String(formData.get("organizationType"));
    const foundedOn = optionalDate(formData.get("foundedOn"));
    const websiteUrl = optionalUrl(formData.get("websiteUrl"));
    if (!["ORGANIZER", "MEDIA", "LEAGUE", "COLLECTIVE", "OTHER"].includes(organizationType)) {
      throw new Error("Seleccioná un tipo de organización válido.");
    }
    await db.$transaction(async (tx) => {
      const before = await tx.subject.findUniqueOrThrow({
        where: { id },
        include: { organization: true, names: true },
      });
      if (before.displayName !== subject.displayName) {
        await tx.subjectName.updateMany({
          where: { subjectId: id, kind: "PRIMARY" },
          data: { kind: "PREVIOUS_NAME" },
        });
        await tx.subjectName.create({
          data: {
            subjectId: id,
            value: subject.displayName,
            normalizedValue: subject.displayName,
            kind: "PRIMARY",
          },
        });
      }
      await tx.subject.update({
        where: { id, type: "ORGANIZATION" },
        data: {
          ...subject,
          organization: {
            update: {
              organizationType: organizationType as
                | "ORGANIZER"
                | "MEDIA"
                | "LEAGUE"
                | "COLLECTIVE"
                | "OTHER",
              foundedOn,
              websiteUrl,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "UPDATE",
          entityKind: "subject",
          entityId: id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: { ...subject, organizationType, foundedOn, websiteUrl },
          reason: "Edición administrativa de organización",
        },
      });
    });
  } catch (error) {
    redirect(destination(`/admin/organizaciones/${id}/editar`, error));
  }
  redirect("/admin/organizaciones?success=updated");
}

export async function createCompetition(formData: FormData) {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    "/admin/competencias/nueva",
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject(subject.slug, subject.displayName);
    const organizationId = String(formData.get("organizationId") ?? "");
    const shortName = String(formData.get("shortName") ?? "").trim() || null;
    const defaultScope = String(formData.get("defaultScope"));
    const defaultRegionId = String(formData.get("defaultRegionId") ?? "") || null;
    const foundedOn = optionalDate(formData.get("foundedOn"));
    if (!organizationId) throw new Error("Seleccioná una organización.");
    if (!["LOCAL", "REGIONAL", "PROVINCIAL", "NATIONAL", "INTERNATIONAL", "OTHER"].includes(defaultScope)) {
      throw new Error("Seleccioná un alcance válido.");
    }
    await db.$transaction(async (tx) => {
      const created = await tx.subject.create({
        data: {
          ...subject,
          type: "COMPETITION",
          names: {
            create: {
              value: subject.displayName,
              normalizedValue: subject.displayName,
              kind: "PRIMARY",
            },
          },
          competition: {
            create: {
              organizationId,
              shortName,
              defaultScope: defaultScope as
                | "LOCAL"
                | "REGIONAL"
                | "PROVINCIAL"
                | "NATIONAL"
                | "INTERNATIONAL"
                | "OTHER",
              defaultRegionId,
              foundedOn,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "CREATE",
          entityKind: "subject",
          entityId: created.id,
          afterData: subject,
          reason: "Alta administrativa de competencia",
        },
      });
    });
  } catch (error) {
    redirect(destination("/admin/competencias/nueva", error));
  }
  redirect("/admin/competencias?success=created");
}

export async function updateCompetition(id: string, formData: FormData) {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    `/admin/competencias/${id}/editar`,
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject(subject.slug, subject.displayName, id);
    const organizationId = String(formData.get("organizationId") ?? "");
    const shortName = String(formData.get("shortName") ?? "").trim() || null;
    const defaultScope = String(formData.get("defaultScope"));
    const defaultRegionId = String(formData.get("defaultRegionId") ?? "") || null;
    const foundedOn = optionalDate(formData.get("foundedOn"));
    if (!organizationId) throw new Error("Seleccioná una organización.");
    if (!["LOCAL", "REGIONAL", "PROVINCIAL", "NATIONAL", "INTERNATIONAL", "OTHER"].includes(defaultScope)) {
      throw new Error("Seleccioná un alcance válido.");
    }
    await db.$transaction(async (tx) => {
      const before = await tx.subject.findUniqueOrThrow({
        where: { id },
        include: { competition: true, names: true },
      });
      if (before.displayName !== subject.displayName) {
        await tx.subjectName.updateMany({
          where: { subjectId: id, kind: "PRIMARY" },
          data: { kind: "PREVIOUS_NAME" },
        });
        await tx.subjectName.create({
          data: {
            subjectId: id,
            value: subject.displayName,
            normalizedValue: subject.displayName,
            kind: "PRIMARY",
          },
        });
      }
      await tx.subject.update({
        where: { id, type: "COMPETITION" },
        data: {
          ...subject,
          competition: {
            update: {
              organizationId,
              shortName,
              defaultScope: defaultScope as
                | "LOCAL"
                | "REGIONAL"
                | "PROVINCIAL"
                | "NATIONAL"
                | "INTERNATIONAL"
                | "OTHER",
              defaultRegionId,
              foundedOn,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: "USER",
          actorUserId: actor.id,
          action: "UPDATE",
          entityKind: "subject",
          entityId: id,
          beforeData: JSON.parse(JSON.stringify(before)),
          afterData: {
            ...subject,
            organizationId,
            shortName,
            defaultScope,
            defaultRegionId,
            foundedOn,
          },
          reason: "Edición administrativa de competencia",
        },
      });
    });
  } catch (error) {
    redirect(destination(`/admin/competencias/${id}/editar`, error));
  }
  redirect("/admin/competencias?success=updated");
}
