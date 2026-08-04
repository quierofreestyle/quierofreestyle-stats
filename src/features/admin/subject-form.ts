const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SubjectFormValues = {
  displayName: string;
  slug: string;
  bio: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

export type SubjectFormState = {
  error?: string;
};

export const INITIAL_SUBJECT_FORM_STATE: SubjectFormState = {};

export function initialSeasonForYear(year: number) {
  if (!Number.isInteger(year) || year < 1) {
    throw new Error("El año de la temporada no es válido.");
  }

  return {
    name: String(year),
    startsOn: new Date(Date.UTC(year, 0, 1)),
    endsOn: new Date(Date.UTC(year, 11, 31)),
    status: "ACTIVE" as const,
  };
}

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readSubjectForm(formData: FormData): SubjectFormValues {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? displayName));
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const requestedStatus = String(formData.get("status") ?? "DRAFT");
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(requestedStatus)
    ? (requestedStatus as SubjectFormValues["status"])
    : "DRAFT";

  if (displayName.length < 2 || displayName.length > 120) {
    throw new Error("El nombre debe tener entre 2 y 120 caracteres.");
  }
  if (!SLUG_PATTERN.test(slug) || slug.length > 120) {
    throw new Error("El slug debe usar letras minúsculas, números y guiones.");
  }
  if (bio && bio.length > 2_000) {
    throw new Error("La descripción no puede superar los 2000 caracteres.");
  }

  return { displayName, slug, bio, status };
}

export function optionalDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("La fecha ingresada no es válida.");
  }
  return parsed;
}

export function optionalUrl(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("La URL debe comenzar con http:// o https://.");
  }
  return parsed.toString();
}

export function actionError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return "Ya existe un registro con ese slug o nombre normalizado.";
  }
  return error instanceof Error ? error.message : "No se pudo guardar el registro.";
}
