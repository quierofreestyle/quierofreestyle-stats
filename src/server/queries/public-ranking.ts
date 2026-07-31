import "server-only";

import { RecordStatus } from "../../generated/prisma/client";
import {
  buildPublicRanking,
  type RankingMode,
} from "../../features/statistics/public-ranking";
import { db } from "../db";

export async function listPublicRanking(mode: RankingMode) {
  const statistics = await db.competitorStatistic.findMany({
    where: { competitor: { subject: { status: RecordStatus.ACTIVE } } },
    select: {
      competitorId: true,
      championships: true,
      runnerUps: true,
      finals: true,
      individualTitles: true,
      groupTitles: true,
      championshipsReachedAt: true,
      individualTitlesReachedAt: true,
      groupTitlesReachedAt: true,
      competitor: {
        select: {
          subject: { select: { slug: true, displayName: true } },
        },
      },
    },
  });

  return buildPublicRanking(
    statistics.map(({ competitor, ...statistic }) => ({
      ...statistic,
      slug: competitor.subject.slug,
      name: competitor.subject.displayName,
    })),
    mode,
  );
}
