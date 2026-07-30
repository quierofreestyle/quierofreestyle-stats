import { describe, expect, it } from "vitest";

import {
  buildEventIdentity,
  placementMemberLimit,
  placementStructure,
  readEventForm,
  slugifyEvent,
} from "./event-form";

function validForm() {
  const form = new FormData();
  form.set("competitionId", "competition-id");
  form.set("datePrecision", "DAY");
  form.set("eventYear", "2025");
  form.set("eventMonth", "12");
  form.set("eventDay", "6");
  form.set("format", "SOLO");
  form.set("resolution", "DECIDED");
  form.set("officialScope", "INTERNATIONAL");
  form.set(
    "placements",
    JSON.stringify([
      { position: 1, type: "CHAMPION", groupLabel: "", competitorIds: ["a"] },
      { position: 2, type: "RUNNER_UP", groupLabel: "", competitorIds: ["b"] },
    ]),
  );
  form.set("sources", "[]");
  return form;
}

describe("formulario administrativo de eventos", () => {
  it("genera un slug estable desde el título", () => {
    expect(slugifyEvent("  FMS España · Final 2026 ")).toBe("fms-espana-final-2026");
  });

  it("genera automáticamente el nombre y el identificador público", () => {
    const input = readEventForm(validForm(), "2026-07-29");
    expect(buildEventIdentity("Euforia Freestyle", input, "55")).toEqual({
      title: "Euforia Freestyle · 06/12/2025",
      slug: "euforia-freestyle-2025-12-06-55",
    });
  });

  it("conserva una fecha diaria coherente", () => {
    const parsed = readEventForm(validForm(), "2026-07-29");
    expect(parsed.occurredOn?.toISOString()).toBe("2025-12-06T00:00:00.000Z");
  });

  it("rechaza fechas futuras según el calendario de Argentina", () => {
    const form = validForm();
    form.set("eventYear", "2026");
    form.set("eventMonth", "7");
    form.set("eventDay", "30");
    expect(() => readEventForm(form, "2026-07-29")).toThrow(
      /no puede ser futura/i,
    );
  });

  it("rechaza una estructura incompleta para la resolución", () => {
    const form = validForm();
    form.set(
      "placements",
      JSON.stringify([
        { position: 1, type: "CHAMPION", groupLabel: "", competitorIds: ["a"] },
      ]),
    );
    expect(() => readEventForm(form)).toThrow(/cantidad de resultados/i);
  });

  it("acepta un campeonato compartido", () => {
    const form = validForm();
    form.set("resolution", "SHARED_CHAMPIONSHIP");
    form.set(
      "placements",
      JSON.stringify([
        { position: 1, type: "CHAMPION", groupLabel: "", competitorIds: ["a"] },
        { position: 1, type: "CHAMPION", groupLabel: "", competitorIds: ["b"] },
      ]),
    );
    expect(readEventForm(form).placements).toHaveLength(2);
  });

  it("calcula tipos y posiciones sin aceptar valores manipulados", () => {
    const form = validForm();
    form.set(
      "placements",
      JSON.stringify([
        { position: 8, type: "FINALIST", groupLabel: "", competitorIds: ["a"] },
        { position: 9, type: "CHAMPION", groupLabel: "", competitorIds: ["b"] },
      ]),
    );
    expect(readEventForm(form).placements).toMatchObject([
      { position: 1, type: "CHAMPION" },
      { position: 2, type: "RUNNER_UP" },
    ]);
  });

  it("rechaza un competidor repetido entre resultados", () => {
    const form = validForm();
    form.set(
      "placements",
      JSON.stringify([
        { groupLabel: "", competitorIds: ["a"] },
        { groupLabel: "", competitorIds: ["a"] },
      ]),
    );
    expect(() => readEventForm(form)).toThrow(/más de un resultado/i);
  });

  it("descarta el nombre del equipo en eventos individuales", () => {
    const form = validForm();
    form.set(
      "placements",
      JSON.stringify([
        { groupLabel: "Nombre residual", competitorIds: ["a"] },
        { groupLabel: "Otro nombre residual", competitorIds: ["b"] },
      ]),
    );

    expect(
      readEventForm(form).placements.map(({ groupLabel }) => groupLabel),
    ).toEqual([null, null]);
  });

  it("aplica el máximo de integrantes según el formato", () => {
    expect(["SOLO", "DUO", "TRIO", "OTHER"].map(placementMemberLimit)).toEqual([
      1, 2, 3, 6,
    ]);
    const form = validForm();
    form.set(
      "placements",
      JSON.stringify([
        { groupLabel: "", competitorIds: ["a", "b"] },
        { groupLabel: "", competitorIds: ["c"] },
      ]),
    );
    expect(() => readEventForm(form)).toThrow(/hasta 1 integrante/i);
  });

  it("deriva los dos resultados de una final indefinida", () => {
    expect(placementStructure("UNDECIDED")).toEqual([
      { type: "FINALIST", position: 1 },
      { type: "FINALIST", position: 1 },
    ]);
  });

  it("acepta solamente fuentes HTTP o HTTPS", () => {
    const form = validForm();
    form.set(
      "sources",
      JSON.stringify([
        {
          url: "javascript:alert(1)",
          title: "",
          publisher: "",
          type: "OTHER",
          purpose: "GENERAL",
        },
      ]),
    );

    expect(() => readEventForm(form)).toThrow(/HTTP o HTTPS/i);

    form.set(
      "sources",
      JSON.stringify([
        {
          url: " https://example.com/resultado ",
          title: "",
          publisher: "",
          type: "OFFICIAL",
          purpose: "RESULT",
        },
      ]),
    );
    expect(readEventForm(form).sources[0].url).toBe(
      "https://example.com/resultado",
    );
  });

  it("valida la fuente del alcance del lado servidor", () => {
    const form = validForm();
    form.set("scopeSourceUrl", "ftp://example.com/alcance");
    expect(() => readEventForm(form)).toThrow(/fuente del alcance.*HTTP o HTTPS/i);

    form.set("scopeSourceUrl", "https://example.com/alcance");
    expect(readEventForm(form).scopeSourceUrl).toBe(
      "https://example.com/alcance",
    );
  });
});
