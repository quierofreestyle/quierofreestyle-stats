import { describe, expect, it } from "vitest";

import { adminLabel, formatAdminDate, issueDetail } from "./format";

describe("formato del panel administrativo", () => {
  it("traduce estados e incidencias conocidos", () => {
    expect(adminLabel("PUBLISHED")).toBe("Publicado");
    expect(adminLabel("INVALID_FINALIST_ID")).toBe("Finalista inválido");
  });

  it("formatea fechas sin desplazarlas de día", () => {
    expect(formatAdminDate(new Date("2026-07-24T00:00:00.000Z"))).toContain(
      "24",
    );
    expect(formatAdminDate(null)).toBe("Fecha sin confirmar");
  });

  it("extrae el detalle seguro de una incidencia", () => {
    expect(issueDetail({ detail: "Falta el subcampeón." })).toBe(
      "Falta el subcampeón.",
    );
    expect(issueDetail({ detail: 10 })).toMatch(/no informó/);
  });
});
