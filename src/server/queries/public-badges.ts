import "server-only";

import { db } from "../db";

export function findPublicBadge(slug: string) {
  return db.badgeInstance.findFirst({
    where: { slug, status: { in: ["ACTIVE", "ARCHIVED"] } },
    select: {
      slug: true,
      displayName: true,
      description: true,
      status: true,
      updatedAt: true,
      definition: {
        select: {
          kind: true,
          publicRule: true,
          imageUrl: true,
          recipientType: true,
          ruleVersions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: {
              tiers: {
                orderBy: { rank: "asc" },
                select: {
                  id: true,
                  rank: true,
                  displayName: true,
                  threshold: true,
                  color: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
      scope: { select: { scopeType: true } },
      awards: {
        where: { status: "ACTIVE", recipient: { status: "ACTIVE" } },
        orderBy: [{ awardedOn: "asc" }, { recipient: { displayName: "asc" } }],
        select: {
          awardedOn: true,
          recipient: { select: { id: true, slug: true, displayName: true, type: true } },
        },
      },
      progress: {
        where: { recipient: { status: "ACTIVE" } },
        select: {
          recipientSubjectId: true,
          metricValue: true,
          currentTier: { select: { displayName: true, imageUrl: true, color: true } },
        },
      },
    },
  });
}
