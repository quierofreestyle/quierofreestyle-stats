import { describe, expect, it } from "vitest";

import { toBadgeVisibilityItem } from "./profile-visibility";

const source = {
  id: "badge-1",
  slug: "amante-definiciones",
  displayName: "Amante de las definiciones",
  description: "Alcanzá finales definidas.",
  status: "ACTIVE",
  definitionImageUrl: "definition.png",
  currentTier: { displayName: "Bronce", imageUrl: "bronze.png" },
  preference: null,
};

describe("toBadgeVisibilityItem", () => {
  it("muestra por defecto una insignia sin preferencia guardada", () => {
    expect(toBadgeVisibilityItem(source).isVisible).toBe(true);
  });

  it("respeta una preferencia oculta", () => {
    expect(
      toBadgeVisibilityItem({
        ...source,
        preference: { isVisible: false },
      }).isVisible,
    ).toBe(false);
  });

  it("prioriza la imagen del nivel vigente", () => {
    expect(toBadgeVisibilityItem(source).imageUrl).toBe("bronze.png");
  });
});
