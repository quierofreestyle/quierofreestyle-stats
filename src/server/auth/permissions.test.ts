import { describe, expect, it } from "vitest";

import { ADMIN_CAPABILITIES, hasAnyCapability } from "./capabilities";

describe("hasAnyCapability", () => {
  it("permite el acceso cuando existe una capacidad requerida", () => {
    expect(
      hasAnyCapability(["EVENT_READ", "EVENT_MANAGE"], ADMIN_CAPABILITIES),
    ).toBe(true);
  });

  it("no confunde el nombre del rol con un permiso", () => {
    expect(hasAnyCapability(["SUPER_ADMIN"], ADMIN_CAPABILITIES)).toBe(false);
  });

  it("rechaza usuarios sin capacidades administrativas", () => {
    expect(
      hasAnyCapability(["SUBJECT_READ", "EVENT_READ"], ADMIN_CAPABILITIES),
    ).toBe(false);
  });
});
