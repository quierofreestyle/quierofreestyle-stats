export type PublicBadgeSource = {
  instanceId: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  publicRule: string;
  imageUrl: string | null;
  status: string;
  awardedOn: Date;
  publicJustification: string | null;
  metricValue: number;
  currentTier: {
    id: string;
    displayName: string;
    threshold: number;
    color: string | null;
    imageUrl: string | null;
  } | null;
  tiers: Array<{
    id: string;
    rank: number;
    displayName: string;
    threshold: number;
    color: string | null;
    imageUrl: string | null;
  }>;
  achievements: Array<{
    tierId: string;
    displayName: string;
    achievedOn: Date;
    eventHref: string | null;
    eventName: string | null;
  }>;
};

export function publicBadgeHref(slug: string) {
  return `/insignias/${slug}`;
}

export function toPublicBadge(source: PublicBadgeSource) {
  const tiers = [...source.tiers].sort((left, right) => left.rank - right.rank);
  const currentIndex = source.currentTier
    ? tiers.findIndex((tier) => tier.id === source.currentTier?.id)
    : -1;
  const nextTier = tiers[currentIndex + 1] ?? null;
  const progressPercent = nextTier
    ? Math.min(100, Math.max(0, (source.metricValue / nextTier.threshold) * 100))
    : 100;

  return {
    id: source.instanceId,
    slug: source.slug,
    href: publicBadgeHref(source.slug),
    name: source.name,
    description: source.description,
    kind: source.kind,
    publicRule: source.publicRule,
    imageUrl: source.currentTier?.imageUrl ?? source.imageUrl,
    color: source.currentTier?.color ?? null,
    isArchived: source.status === "ARCHIVED",
    awardedOn: source.awardedOn,
    awardedOnLabel: new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" }).format(source.awardedOn),
    publicJustification: source.publicJustification,
    metricValue: source.metricValue,
    currentTier: source.currentTier,
    nextTier,
    progressPercent,
    tiers,
    achievements: [...source.achievements].sort(
      (left, right) => left.achievedOn.getTime() - right.achievedOn.getTime(),
    ),
  };
}

