import "server-only";

import { toBadgeVisibilityItem } from "../../features/badges/profile-visibility";
import { db } from "../db";

export async function findManagedBadgeProfiles(userId: string) {
  const now = new Date();
  const managements = await db.subjectManager.findMany({
    where: {
      userId,
      accessLevel: { in: ["OWNER", "EDITOR"] },
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gt: now } }],
      subject: { type: "COMPETITOR" },
    },
    orderBy: { subject: { displayName: "asc" } },
    select: {
      subject: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          badgeAwards: {
            where: {
              status: "ACTIVE",
              badgeInstance: { status: { in: ["ACTIVE", "ARCHIVED"] } },
            },
            orderBy: { awardedOn: "desc" },
            distinct: ["badgeInstanceId"],
            select: {
              badgeInstance: {
                select: {
                  id: true,
                  slug: true,
                  displayName: true,
                  description: true,
                  status: true,
                  definition: { select: { imageUrl: true } },
                  progress: {
                    select: {
                      recipientSubjectId: true,
                      currentTier: {
                        select: { displayName: true, imageUrl: true },
                      },
                    },
                  },
                  preferences: {
                    select: { subjectId: true, isVisible: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return managements.map(({ subject }) => ({
    id: subject.id,
    slug: subject.slug,
    name: subject.displayName,
    badges: subject.badgeAwards.map(({ badgeInstance }) => {
      const progress = badgeInstance.progress.find(
        (item) => item.recipientSubjectId === subject.id,
      );
      const preference = badgeInstance.preferences.find(
        (item) => item.subjectId === subject.id,
      );

      return toBadgeVisibilityItem({
        id: badgeInstance.id,
        slug: badgeInstance.slug,
        displayName: badgeInstance.displayName,
        description: badgeInstance.description,
        status: badgeInstance.status,
        definitionImageUrl: badgeInstance.definition.imageUrl,
        currentTier: progress?.currentTier ?? null,
        preference: preference ? { isVisible: preference.isVisible } : null,
      });
    }),
  }));
}
