export type EventFormState = { error?: string };

export type PlacementInput = {
  position?: number;
  type?: "CHAMPION" | "RUNNER_UP" | "FINALIST";
  groupLabel: string | null;
  competitorIds: string[];
};

export type SourceInput = {
  url: string;
  title: string | null;
  publisher: string | null;
  type: "OFFICIAL" | "SOCIAL" | "VIDEO" | "DOCUMENT" | "OTHER";
  purpose: "RESULT" | "DATE" | "PARTICIPANTS" | "SCOPE" | "GENERAL";
};

export type EventDateInput = {
  datePrecision: "UNKNOWN" | "YEAR" | "MONTH" | "DAY";
  eventYear: number | null;
  eventMonth: number | null;
  eventDay: number | null;
};

export type EventFormatInput = "SOLO" | "DUO" | "TRIO" | "OTHER";
export type EventResolutionInput =
  | "DECIDED"
  | "SHARED_CHAMPIONSHIP"
  | "UNDECIDED";

export function placementMemberLimit(format: EventFormatInput) {
  return { SOLO: 1, DUO: 2, TRIO: 3, OTHER: 6 }[format];
}

export function placementStructure(resolution: EventResolutionInput) {
  if (resolution === "DECIDED") {
    return [
      { type: "CHAMPION" as const, position: 1 },
      { type: "RUNNER_UP" as const, position: 2 },
    ];
  }
  if (resolution === "SHARED_CHAMPIONSHIP") {
    return [
      { type: "CHAMPION" as const, position: 1 },
      { type: "CHAMPION" as const, position: 1 },
    ];
  }
  return [
    { type: "FINALIST" as const, position: 1 },
    { type: "FINALIST" as const, position: 1 },
  ];
}

const enumValue = <T extends string>(
  value: FormDataEntryValue | null,
  allowed: readonly T[],
  message: string,
): T => {
  const normalized = String(value ?? "");
  if (!allowed.includes(normalized as T)) throw new Error(message);
  return normalized as T;
};

function optionalText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() || null;
}

function optionalInteger(value: FormDataEntryValue | null, label: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) throw new Error(`${label} debe ser un número entero.`);
  return parsed;
}

function parseJson<T>(value: FormDataEntryValue | null, label: string): T[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    if (!Array.isArray(parsed)) throw new Error();
    return parsed as T[];
  } catch {
    throw new Error(`No se pudo interpretar ${label}.`);
  }
}

export function slugifyEvent(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function argentinaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function isFutureEventDate(
  input: EventDateInput,
  today = argentinaToday(),
) {
  if (input.datePrecision === "UNKNOWN") return false;
  const [year, month, day] = today.split("-").map(Number);
  if (input.eventYear! !== year) return input.eventYear! > year;
  if (input.datePrecision === "YEAR") return false;
  if (input.eventMonth! !== month) return input.eventMonth! > month;
  if (input.datePrecision === "MONTH") return false;
  return input.eventDay! > day;
}

export function buildEventIdentity(
  competitionName: string,
  input: EventDateInput,
  suffix: string,
) {
  let titleDate = "Fecha desconocida";
  let slugDate = "fecha-desconocida";
  if (input.datePrecision === "YEAR") {
    titleDate = String(input.eventYear);
    slugDate = titleDate;
  } else if (input.datePrecision === "MONTH") {
    titleDate = `${String(input.eventMonth).padStart(2, "0")}/${input.eventYear}`;
    slugDate = `${input.eventYear}-${String(input.eventMonth).padStart(2, "0")}`;
  } else if (input.datePrecision === "DAY") {
    titleDate = `${String(input.eventDay).padStart(2, "0")}/${String(input.eventMonth).padStart(2, "0")}/${input.eventYear}`;
    slugDate = `${input.eventYear}-${String(input.eventMonth).padStart(2, "0")}-${String(input.eventDay).padStart(2, "0")}`;
  }
  return {
    title: `${competitionName} · ${titleDate}`,
    slug: `${slugifyEvent(competitionName)}-${slugDate}-${suffix}`,
  };
}

export function readEventForm(formData: FormData, today = argentinaToday()) {
  const competitionId = String(formData.get("competitionId") ?? "");
  if (!competitionId) throw new Error("Seleccioná una competencia.");

  const datePrecision = enumValue(
    formData.get("datePrecision"),
    ["UNKNOWN", "YEAR", "MONTH", "DAY"] as const,
    "Seleccioná una precisión de fecha válida.",
  );
  let eventYear = optionalInteger(formData.get("eventYear"), "El año");
  let eventMonth = optionalInteger(formData.get("eventMonth"), "El mes");
  let eventDay = optionalInteger(formData.get("eventDay"), "El día");
  if (datePrecision === "UNKNOWN") {
    eventYear = eventMonth = eventDay = null;
  } else {
    if (!eventYear || eventYear < 1900 || eventYear > 2100) {
      throw new Error("Ingresá un año válido.");
    }
    if (datePrecision === "YEAR") eventMonth = eventDay = null;
    if (datePrecision === "MONTH") eventDay = null;
    if (
      (datePrecision === "MONTH" || datePrecision === "DAY") &&
      (!eventMonth || eventMonth < 1 || eventMonth > 12)
    ) {
      throw new Error("Ingresá un mes válido.");
    }
    if (datePrecision === "DAY") {
      if (!eventDay || eventDay < 1 || eventDay > 31) {
        throw new Error("Ingresá un día válido.");
      }
      const candidate = new Date(Date.UTC(eventYear, eventMonth! - 1, eventDay));
      if (
        candidate.getUTCFullYear() !== eventYear ||
        candidate.getUTCMonth() !== eventMonth! - 1 ||
        candidate.getUTCDate() !== eventDay
      ) {
        throw new Error("La fecha ingresada no existe.");
      }
    }
  }
  const eventDate = { datePrecision, eventYear, eventMonth, eventDay };
  if (isFutureEventDate(eventDate, today)) {
    throw new Error("La fecha del evento no puede ser futura.");
  }

  const format = enumValue(
    formData.get("format"),
    ["SOLO", "DUO", "TRIO", "OTHER"] as const,
    "Seleccioná un formato válido.",
  );
  const resolution = enumValue(
    formData.get("resolution"),
    ["DECIDED", "SHARED_CHAMPIONSHIP", "UNDECIDED"] as const,
    "Seleccioná una resolución válida.",
  );
  const officialScope = enumValue(
    formData.get("officialScope"),
    ["LOCAL", "REGIONAL", "PROVINCIAL", "NATIONAL", "INTERNATIONAL", "OTHER"] as const,
    "Seleccioná un alcance válido.",
  );

  const rawPlacements = parseJson<PlacementInput>(
    formData.get("placements"),
    "los finalistas",
  );
  const structure = placementStructure(resolution);
  if (rawPlacements.length !== 0 && rawPlacements.length !== structure.length) {
    throw new Error("La cantidad de resultados no coincide con la resolución elegida.");
  }
  const memberLimit = placementMemberLimit(format);
  const placements = rawPlacements.map((placement, index) => {
      const competitorIds = [...new Set(placement.competitorIds.filter(Boolean))];
      if (!competitorIds.length) {
        throw new Error(`Seleccioná al menos un integrante para el resultado ${index + 1}.`);
      }
      if (competitorIds.length > memberLimit) {
        throw new Error(
          `El formato elegido admite hasta ${memberLimit} integrante${memberLimit === 1 ? "" : "s"} por resultado.`,
        );
      }
      return {
        position: structure[index].position,
        type: structure[index].type,
        groupLabel:
          format === "SOLO" ? null : placement.groupLabel?.trim() || null,
        competitorIds,
      };
    });

  if (placements.length) {
    const allCompetitorIds = placements.flatMap(({ competitorIds }) => competitorIds);
    if (new Set(allCompetitorIds).size !== allCompetitorIds.length) {
      throw new Error("Un competidor no puede integrar más de un resultado del evento.");
    }
  }

  const validateHttpUrl = (value: string, fieldLabel: string) => {
    const normalizedValue = value.trim();
    try {
      const parsed = new URL(normalizedValue);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw new Error(`${fieldLabel} debe ser una URL HTTP o HTTPS válida.`);
    }
    return normalizedValue;
  };

  const sources = parseJson<SourceInput>(formData.get("sources"), "las fuentes").map(
    (source, index) => {
      const url = validateHttpUrl(source.url, `La URL de la fuente ${index + 1}`);
      if (!["OFFICIAL", "SOCIAL", "VIDEO", "DOCUMENT", "OTHER"].includes(source.type)) {
        throw new Error(`El tipo de fuente ${index + 1} no es válido.`);
      }
      if (!["RESULT", "DATE", "PARTICIPANTS", "SCOPE", "GENERAL"].includes(source.purpose)) {
        throw new Error(`El propósito de la fuente ${index + 1} no es válido.`);
      }
      return {
        url,
        title: source.title?.trim() || null,
        publisher: source.publisher?.trim() || null,
        type: source.type,
        purpose: source.purpose,
      };
    },
  );
  const scopeSourceUrlInput = optionalText(formData.get("scopeSourceUrl"));

  return {
    competitionId,
    seasonId: optionalText(formData.get("seasonId")),
    editionNumber: optionalInteger(formData.get("editionNumber"), "La edición"),
    eventYear,
    eventMonth,
    eventDay,
    occurredOn:
      datePrecision === "DAY"
        ? new Date(Date.UTC(eventYear!, eventMonth! - 1, eventDay!))
        : null,
    datePrecision,
    officialScope,
    locationRegionId: optionalText(formData.get("locationRegionId")),
    scopeRegionId: optionalText(formData.get("scopeRegionId")),
    scopeDeclaredById: optionalText(formData.get("scopeDeclaredById")),
    scopeSourceUrl: scopeSourceUrlInput
      ? validateHttpUrl(scopeSourceUrlInput, "La fuente del alcance")
      : null,
    scopeNotes: optionalText(formData.get("scopeNotes")),
    format,
    resolution,
    placements,
    sources,
  };
}

export function eventFormError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("event_competition_id_slug_key")) {
      return "Ya existe un evento con ese identificador dentro de la competencia.";
    }
    if (
      error.message.includes("El competidor ya integra otro resultado activo del evento") ||
      error.message.includes("P0001")
    ) {
      return "El competidor ya forma parte de otro resultado de este evento.";
    }
    return error.message;
  }
  return "No se pudo guardar el evento.";
}
