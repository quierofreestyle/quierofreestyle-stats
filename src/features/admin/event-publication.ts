import {
  placementMemberLimit,
  placementStructure,
  type EventFormatInput,
  type EventResolutionInput,
} from "./event-form";

export type PublicationPlacement = {
  competitorIds: string[];
  position: number;
  type: "CHAMPION" | "RUNNER_UP" | "FINALIST" | "OTHER";
};

export type EventPublicationInput = {
  competitionExists: boolean;
  datePrecision: "UNKNOWN" | "YEAR" | "MONTH" | "DAY";
  format: EventFormatInput;
  placements: PublicationPlacement[];
  resolution: EventResolutionInput;
  status: "DRAFT" | "PUBLISHED" | "CORRECTED" | "ANNULLED";
  operation?: "PUBLISH" | "CORRECT";
};

export type PublicationValidation = {
  errors: string[];
  warnings: string[];
  participantCount: number;
  resultCount: number;
};

export function validateEventPublication(
  input: EventPublicationInput,
): PublicationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const expected = placementStructure(input.resolution);

  const operation = input.operation ?? "PUBLISH";
  if (
    (operation === "PUBLISH" && input.status !== "DRAFT") ||
    (operation === "CORRECT" &&
      !["PUBLISHED", "CORRECTED"].includes(input.status))
  ) {
    errors.push(
      operation === "PUBLISH"
        ? "Solo se puede publicar un evento en borrador."
        : "Solo se puede corregir un evento publicado o corregido.",
    );
  }
  if (!input.competitionExists) {
    errors.push("La competencia asociada ya no está disponible.");
  }
  if (input.datePrecision === "UNKNOWN") {
    errors.push("Definí al menos el año del evento antes de publicarlo.");
  }
  const minimumResults = input.resolution === "DECIDED" ? 1 : expected.length;
  if (
    input.placements.length < minimumResults ||
    input.placements.length > expected.length
  ) {
    errors.push(
      input.resolution === "DECIDED"
        ? "Una final decidida debe tener al menos un campeón."
        : "El evento debe tener los dos resultados requeridos por su resolución.",
    );
  }
  if (
    input.resolution === "DECIDED" &&
    input.placements.length === 1 &&
    input.placements[0]?.type === "CHAMPION"
  ) {
    warnings.push(
      "El evento se publicará con información parcial: no se conoce el subcampeón.",
    );
  }

  const memberLimit = placementMemberLimit(input.format);
  input.placements.forEach((placement, index) => {
    const expectedPlacement = expected[index];
    if (
      !expectedPlacement ||
      placement.position !== expectedPlacement.position ||
      placement.type !== expectedPlacement.type
    ) {
      errors.push(`El resultado ${index + 1} no coincide con la resolución elegida.`);
    }
    if (!placement.competitorIds.length) {
      errors.push(`El resultado ${index + 1} no tiene integrantes.`);
    } else if (placement.competitorIds.length > memberLimit) {
      errors.push(
        `El resultado ${index + 1} supera el máximo de ${memberLimit} integrante${memberLimit === 1 ? "" : "s"} para el formato.`,
      );
    }
  });

  const competitorIds = input.placements.flatMap(
    ({ competitorIds }) => competitorIds,
  );
  if (new Set(competitorIds).size !== competitorIds.length) {
    errors.push("Un competidor figura en más de un resultado.");
  }

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    participantCount: new Set(competitorIds).size,
    resultCount: input.placements.length,
  };
}
