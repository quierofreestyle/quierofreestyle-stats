"use server";

import { redirect } from "next/navigation";

import {
  actionError,
  optionalDate,
  optionalUrl,
  readSubjectForm,
  type SubjectFormState,
} from "../../../features/admin/subject-form";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

const SUBJECT_MANAGE = ["SUBJECT_MANAGE"] as const;

async function assertUniqueSubject(
  type: "COMPETITOR" | "COMPETITION" | "ORGANIZATION",
  slug: string,
  displayName: string,
  excludingId?: string,
) {
  const duplicate = await db.subject.findFirst({
    where: {
      type,
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
    throw new Error("Ya existe un registro de este tipo con ese nombre o slug.");
  }
}

export async function createCompetitor(
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    "/admin/competidores/nuevo",
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject("COMPETITOR", subject.slug, subject.displayName);
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
    return { error: actionError(error) };
  }
  redirect("/admin/competidores?success=created");
}

export async function updateCompetitor(
  id: string,
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    `/admin/competidores/${id}/editar`,
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject("COMPETITOR", subject.slug, subject.displayName, id);
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
    return { error: actionError(error) };
  }
  redirect("/admin/competidores?success=updated");
}

export async function createOrganization(
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    "/admin/organizaciones/nueva",
  );
  let createdId: string | null = null;
  let returnTo = "";
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject("ORGANIZATION", subject.slug, subject.displayName);
    const organizationType = String(formData.get("organizationType"));
    const foundedOn = optionalDate(formData.get("foundedOn"));
    const websiteUrl = optionalUrl(formData.get("websiteUrl"));
    if (!["ORGANIZER", "MEDIA", "LEAGUE", "COLLECTIVE", "OTHER"].includes(organizationType)) {
      throw new Error("Seleccioná un tipo de organización válido.");
    }
    returnTo = String(formData.get("returnTo") ?? "");
    const created = await db.$transaction(async (tx) => {
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
      return created;
    });
    createdId = created.id;
  } catch (error) {
    return { error: actionError(error) };
  }
  if (returnTo === "/admin/competencias/nueva" && createdId) {
    redirect(`${returnTo}?organizationId=${createdId}`);
  }
  redirect("/admin/organizaciones?success=created");
}

export async function updateOrganization(
  id: string,
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    `/admin/organizaciones/${id}/editar`,
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject("ORGANIZATION", subject.slug, subject.displayName, id);
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
    return { error: actionError(error) };
  }
  redirect("/admin/organizaciones?success=updated");
}

export async function createCompetition(
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    "/admin/competencias/nueva",
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject("COMPETITION", subject.slug, subject.displayName);
    const organizationId = String(formData.get("organizationId") ?? "");
    const shortName = String(formData.get("shortName") ?? "").trim() || null;
    const foundedOn = optionalDate(formData.get("foundedOn"));
    if (!organizationId) throw new Error("Seleccioná una organización.");
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
              // Compatibilidad temporal del esquema: el alcance real se define en cada evento.
              defaultScope: "LOCAL",
              defaultRegionId: null,
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
    return { error: actionError(error) };
  }
  redirect("/admin/competencias?success=created");
}

export async function updateCompetition(
  id: string,
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const actor = await requireAdminCapability(
    SUBJECT_MANAGE,
    `/admin/competencias/${id}/editar`,
  );
  try {
    const subject = readSubjectForm(formData);
    await assertUniqueSubject("COMPETITION", subject.slug, subject.displayName, id);
    const organizationId = String(formData.get("organizationId") ?? "");
    const shortName = String(formData.get("shortName") ?? "").trim() || null;
    const foundedOn = optionalDate(formData.get("foundedOn"));
    if (!organizationId) throw new Error("Seleccioná una organización.");
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
            foundedOn,
          },
          reason: "Edición administrativa de competencia",
        },
      });
    });
  } catch (error) {
    return { error: actionError(error) };
  }
  redirect("/admin/competencias?success=updated");
}
