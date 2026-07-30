import { describe, expect, it } from "vitest";

import {
  type EventPublicationInput,
  validateEventPublication,
} from "./event-publication";

function validEvent(
  overrides: Partial<EventPublicationInput> = {},
): EventPublicationInput {
  return {
    competitionExists: true,
    datePrecision: "DAY",
    format: "SOLO",
    placements: [
      { position: 1, type: "CHAMPION", competitorIds: ["a"] },
      { position: 2, type: "RUNNER_UP", competitorIds: ["b"] },
    ],
    resolution: "DECIDED",
    status: "DRAFT",
    ...overrides,
  };
}

describe("publicación administrativa de eventos", () => {
  it("acepta un evento completo y resume su impacto", () => {
    expect(validateEventPublication(validEvent())).toEqual({
      errors: [],
      warnings: [],
      participantCount: 2,
      resultCount: 2,
    });
  });

  it("permite publicar con campeón conocido y advierte si falta el subcampeón", () => {
    expect(
      validateEventPublication(
        validEvent({
          placements: [
            { position: 1, type: "CHAMPION", competitorIds: ["a"] },
          ],
        }),
      ),
    ).toEqual({
      errors: [],
      warnings: [
        "El evento se publicará con información parcial: no se conoce el subcampeón.",
      ],
      participantCount: 1,
      resultCount: 1,
    });
  });

  it("rechaza un borrador sin fecha ni resultados completos", () => {
    const result = validateEventPublication(
      validEvent({
        datePrecision: "UNKNOWN",
        placements: [],
      }),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/año del evento/i),
        expect.stringMatching(/al menos un campeón/i),
      ]),
    );
  });

  it("permite publicar sin fuentes asociadas", () => {
    expect(validateEventPublication(validEvent()).errors).toEqual([]);
  });

  it("valida la estructura de un campeonato compartido", () => {
    const result = validateEventPublication(
      validEvent({
        resolution: "SHARED_CHAMPIONSHIP",
        placements: [
          { position: 1, type: "CHAMPION", competitorIds: ["a"] },
          { position: 2, type: "RUNNER_UP", competitorIds: ["b"] },
        ],
      }),
    );

    expect(result.errors).toContain(
      "El resultado 2 no coincide con la resolución elegida.",
    );
  });

  it("impide publicar dos veces y detecta participantes repetidos", () => {
    const result = validateEventPublication(
      validEvent({
        status: "PUBLISHED",
        placements: [
          { position: 1, type: "CHAMPION", competitorIds: ["a"] },
          { position: 2, type: "RUNNER_UP", competitorIds: ["a"] },
        ],
      }),
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/evento en borrador/i),
        expect.stringMatching(/más de un resultado/i),
      ]),
    );
  });
});
