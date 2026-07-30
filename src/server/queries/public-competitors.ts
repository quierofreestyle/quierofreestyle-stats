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
