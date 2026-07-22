import "server-only";

import {
  EventStatus,
  PlacementStatus,
  RecordStatus,
} from "../../generated/prisma/client";
import { db } from "../db";

const publicEventStatuses = [EventStatus.PUBLISHED, EventStatus.CORRECTED];

export async function listPublicCompetitions() {
  return db.competition.findMany({
    where: {
      subject: {
        status: RecordStatus.ACTIVE,
      },
    },
    orderBy: {
      subject: {
        displayName: "asc",
      },
    },
    select: {
      shortName: true,
      defaultScope: true,
      subject: {
        select: {
          slug: true,
          displayName: true,
        },
      },
      organization: {
        select: {
          subject: {
            select: {
              slug: true,
              displayName: true,
            },
          },
        },
      },
      events: {
        where: {
          status: {
            in: publicEventStatuses,
          },
        },
        orderBy: [
          { occurredOn: { sort: "desc", nulls: "last" } },
          { eventYear: "desc" },
          { eventMonth: "desc" },
          { eventDay: "desc" },
        ],
        select: {
          id: true,
          slug: true,
          title: true,
          occurredOn: true,
          datePrecision: true,
          officialScope: true,
          format: true,
          resolution: true,
          status: true,
          placements: {
            where: {
              status: PlacementStatus.ACTIVE,
            },
            orderBy: [{ position: "asc" }, { slot: "asc" }],
            select: {
              position: true,
              slot: true,
              type: true,
              groupLabel: true,
              members: {
                orderBy: {
                  memberOrder: "asc",
                },
                select: {
                  memberOrder: true,
                  displayNameAtEvent: true,
                  competitor: {
                    select: {
                      subject: {
                        select: {
                          slug: true,
                          displayName: true,
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
  });
}
