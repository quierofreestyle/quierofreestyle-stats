export type BadgeVisibilitySource = {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  status: string;
  definitionImageUrl: string | null;
  currentTier: {
    displayName: string;
    imageUrl: string | null;
  } | null;
  preference: { isVisible: boolean } | null;
};

export function toBadgeVisibilityItem(source: BadgeVisibilitySource) {
  return {
    id: source.id,
    name: source.displayName,
    description: source.description,
    href: `/insignias/${source.slug}`,
    imageUrl: source.currentTier?.imageUrl ?? source.definitionImageUrl,
    tierName: source.currentTier?.displayName ?? null,
    isVisible: source.preference?.isVisible ?? true,
    isArchived: source.status === "ARCHIVED",
  };
}
