import "server-only";

import {
  EventStatus,
  PlacementStatus,
  Prisma,
  RecordStatus,
} from "../../generated/prisma/client";
import { db } from "../db";

const publicStatuses = [EventStatus.PUBLISHED, EventStatus.CORRECTED];

const publicEventSelect = {
  id: true,
  slug: true,
  title: true,
  occurredOn: true,
  datePrecision: true,
  officialScope: true,
  format: true,
  resolution: true,
  competition: {
    select: {
      shortName: true,
      subject: { select: { slug: true, displayName: true } },
      organization: {
        select: { subject: { select: { displayName: true } } },
      },
    },
  },
  placements: {
    where: { status: PlacementStatus.ACTIVE },
    orderBy: [{ position: "asc" }, { slot: "asc" }],
    select: {
      position: true,
      slot: true,
      type: true,
      groupLabel: true,
      members: {
        orderBy: { memberOrder: "asc" },
        select: {
          displayNameAtEvent: true,
          competitor: {
            select: {
              subject: { select: { slug: true, displayName: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.EventSelect;

export function listPublicEvents() {
  return db.event.findMany({
    where: {
      status: { in: publicStatuses },
      competition: { subject: { status: RecordStatus.ACTIVE } },
    },
    orderBy: [
      { occurredOn: { sort: "desc", nulls: "last" } },
      { eventYear: "desc" },
      { eventMonth: "desc" },
      { eventDay: "desc" },
      { title: "asc" },
    ],
    select: publicEventSelect,
  });
}

export function findPublicEvent(
  competitionSlug: string,
  eventSlug: string,
) {
  return db.event.findFirst({
    where: {
      slug: eventSlug,
      status: { in: publicStatuses },
      competition: {
        subject: {
          slug: competitionSlug,
          status: RecordStatus.ACTIVE,
        },
      },
    },
    select: {
      ...publicEventSelect,
      scopeNotes: true,
      season: { select: { name: true } },
      venue: { select: { name: true, address: true } },
      locationRegion: { select: { name: true } },
      sources: {
        select: {
          purpose: true,
          source: {
            select: {
              url: true,
              title: true,
              publisher: true,
              type: true,
            },
          },
        },
      },
    },
  });
}
