export type PublicBadgeCatalogSource = {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  status: string;
  definition: {
    kind: string;
    imageUrl: string | null;
    recipientType: string;
    ruleVersions: Array<{
      tiers: Array<{ imageUrl: string | null; color: string | null }>;
    }>;
  };
  scope: { scopeType: string } | null;
};

export type PublicBadgeCatalogItem = {
  id: string;
  slug: string;
  href: string;
  name: string;
  description: string;
  kind: string;
  recipientType: string;
  scopeType: string;
  status: string;
  imageUrl: string | null;
  color: string | null;
};

export type BadgeCatalogFilters = {
  query: string;
  kind: string;
  scopeType: string;
  recipientType: string;
  status: string;
};

export const ALL_BADGES_FILTER = "ALL";

export function toPublicBadgeCatalogItem(
  source: PublicBadgeCatalogSource,
): PublicBadgeCatalogItem {
  const firstTier = source.definition.ruleVersions[0]?.tiers[0] ?? null;

  return {
    id: source.id,
    slug: source.slug,
    href: `/insignias/${source.slug}`,
    name: source.displayName,
    description: source.description,
    kind: source.definition.kind,
    recipientType: source.definition.recipientType,
    scopeType: source.scope?.scopeType ?? "GLOBAL",
    status: source.status,
    imageUrl: source.definition.imageUrl ?? firstTier?.imageUrl ?? null,
    color: firstTier?.color ?? null,
  };
}

export function filterPublicBadgeCatalog(
  badges: PublicBadgeCatalogItem[],
  filters: BadgeCatalogFilters,
) {
  const query = filters.query.trim().toLocaleLowerCase("es");

  return badges.filter((badge) => {
    const matchesQuery = `${badge.name} ${badge.description}`
      .toLocaleLowerCase("es")
      .includes(query);

    return (
      matchesQuery &&
      (filters.kind === ALL_BADGES_FILTER || badge.kind === filters.kind) &&
      (filters.scopeType === ALL_BADGES_FILTER ||
        badge.scopeType === filters.scopeType) &&
      (filters.recipientType === ALL_BADGES_FILTER ||
        badge.recipientType === filters.recipientType) &&
      (filters.status === ALL_BADGES_FILTER || badge.status === filters.status)
    );
  });
}
