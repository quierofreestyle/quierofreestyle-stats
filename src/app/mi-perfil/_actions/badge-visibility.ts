"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireManagedCompetitor } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

export async function setBadgeVisibility(
  subjectId: string,
  badgeInstanceId: string,
  isVisible: boolean,
) {
  const user = await requireManagedCompetitor(subjectId);
  const award = await db.badgeAward.findFirst({
    where: {
      recipientSubjectId: subjectId,
      badgeInstanceId,
      status: "ACTIVE",
    },
    select: { recipient: { select: { slug: true } } },
  });

  if (!award) {
    redirect("/mi-perfil/insignias?error=badge-not-active");
  }

  await db.profileBadgePreference.upsert({
    where: { subjectId_badgeInstanceId: { subjectId, badgeInstanceId } },
    create: {
      subjectId,
      badgeInstanceId,
      isVisible,
      updatedById: user.id,
    },
    update: { isVisible, updatedById: user.id },
  });

  revalidatePath(`/competidores/${award.recipient.slug}`);
  revalidatePath("/mi-perfil/insignias");
  redirect(`/mi-perfil/insignias?success=${isVisible ? "shown" : "hidden"}`);
}
