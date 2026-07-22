import { describe, expect, it } from "vitest";

import { parseDatabaseUrl } from "../../src/server/env";

describe("parseDatabaseUrl", () => {
  it("acepta una URL PostgreSQL válida", () => {
    const url = "postgresql://usuario:clave@localhost:5432/base";

    expect(parseDatabaseUrl(url)).toBe(url);
  });

  it("rechaza una variable ausente", () => {
    expect(() => parseDatabaseUrl(undefined)).toThrow("DATABASE_URL es obligatoria");
  });

  it("rechaza protocolos que no sean PostgreSQL", () => {
    expect(() => parseDatabaseUrl("https://ejemplo.com/base")).toThrow(
      "DATABASE_URL debe ser una URL de PostgreSQL",
    );
  });
});
