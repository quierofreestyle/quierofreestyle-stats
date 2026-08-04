import "server-only";

import {
  EventStatus,
  PlacementType,
  PlacementStatus,
  Prisma,
  RecordStatus,
  SubjectNameKind,
} from "../../generated/prisma/client";
import { db } from "../db";

const publicEventStatuses = [EventStatus.PUBLISHED, EventStatus.CORRECTED];

const publicPlacementWhere = {
  placement: {
    status: PlacementStatus.ACTIVE,
    event: {
      status: { in: publicEventStatuses },
      competition: { subject: { status: RecordStatus.ACTIVE } },
    },
  },
} satisfies Prisma.PlacementMemberWhereInput;

const publicCompetitorSelect = {
  locationVisibility: true,
  homeRegion: {
    select: {
      name: true,
      parent: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
    },
  },
  subject: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      bio: true,
      names: {
        where: {
          isSearchable: true,
          kind: {
            in: [SubjectNameKind.ALIAS, SubjectNameKind.PREVIOUS_NAME],
          },
        },
        orderBy: [{ kind: "asc" as const }, { value: "asc" as const }],
        select: { value: true, kind: true },
      },
      badgeAwards: {
        where: { status: "ACTIVE" },
        orderBy: { awardedOn: "desc" },
        select: {
          awardedOn: true,
          publicJustification: true,
          badgeInstanceId: true,
        },
      },
      badgeProgress: {
        where: {
          badgeInstance: { status: { in: ["ACTIVE", "ARCHIVED"] } },
        },
        select: {
          metricValue: true,
          currentTier: {
            select: {
              id: true,
              displayName: true,
              threshold: true,
              color: true,
              imageUrl: true,
            },
          },
          ruleVersion: {
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
          badgeInstance: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              description: true,
              status: true,
              definition: {
                select: { kind: true, publicRule: true, imageUrl: true },
              },
            },
          },
        },
      },
      tierAchievements: {
        where: { status: "ACTIVE" },
        orderBy: { achievedOn: "asc" },
        select: {
          badgeInstanceId: true,
          achievedOn: true,
          tier: { select: { id: true, displayName: true } },
          sourceEvent: {
            select: {
              slug: true,
              title: true,
              competition: { select: { subject: { select: { slug: true } } } },
            },
          },
        },
      },
      badgePreferences: {
        where: { isVisible: false },
        select: { badgeInstanceId: true },
      },
    },
  },
  placements: {
    where: publicPlacementWhere,
    orderBy: [
      { placement: { event: { occurredOn: { sort: "desc", nulls: "last" } } } },
      { placement: { event: { eventYear: "desc" } } },
      { placement: { position: "asc" } },
    ],
    select: {
      displayNameAtEvent: true,
      placement: {
        select: {
          position: true,
          slot: true,
          type: true,
          groupLabel: true,
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              occurredOn: true,
              datePrecision: true,
              format: true,
              resolution: true,
              competition: {
                select: {
                  subject: {
                    select: { slug: true, displayName: true },
                  },
                },
              },
              placements: {
                where: {
                  status: PlacementStatus.ACTIVE,
                  type: PlacementType.CHAMPION,
                },
                orderBy: [{ position: "asc" }, { slot: "asc" }],
                select: {
                  members: {
                    orderBy: { memberOrder: "asc" },
                    select: {
                      displayNameAtEvent: true,
                      competitor: {
                        select: {
                          subject: { select: { displayName: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CompetitorSelect;

export function listPublicCompetitors() {
  return db.competitor.findMany({
    where: { subject: { status: RecordStatus.ACTIVE } },
    orderBy: { subject: { displayName: "asc" } },
    select: publicCompetitorSelect,
  });
}

export function findPublicCompetitor(slug: string) {
  return db.competitor.findFirst({
    where: {
      subject: {
        slug,
        status: RecordStatus.ACTIVE,
      },
    },
    select: publicCompetitorSelect,
  });
}
