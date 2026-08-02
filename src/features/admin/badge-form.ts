const CODE_PATTERN = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BadgeFormState = { error?: string };
export type BadgeTierInput = {
  rank: number;
  code: string;
  displayName: string;
  threshold: number;
  color: string | null;
};

export type BadgeFormValues = {
  code: string;
  name: string;
  slug: string;
  description: string;
  publicRule: string;
  imageUrl: string | null;
  kind: "UNIQUE" | "ACHIEVEMENT" | "TIERED";
  assignmentMode: "AUTOMATIC" | "EDITORIAL";
  recipientType: "COMPETITOR" | "COMPETITION" | "ORGANIZATION";
  permanenceMode: "PERMANENT" | "TEMPORARY";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  scopeType: "GLOBAL" | "COMPETITION";
  competitionId: string | null;
  metricId: string | null;
  operator: "GTE" | "EQ" | "TOP_ONE" | "FIRST" | null;
  threshold: number | null;
  reason: string | null;
  tiers: BadgeTierInput[];
};

function oneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${label} no es válido.`);
  return value as T;
}

function required(formData: FormData, name: string, label: string, max: number) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) throw new Error(`${label} es obligatorio.`);
  if (value.length > max) throw new Error(`${label} no puede superar ${max} caracteres.`);
  return value;
}

export function normalizeBadgeCode(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function normalizeBadgeSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function optionalUrl(value: string) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("La imagen debe usar una URL http o https.");
  return parsed.toString();
}

function parseNumber(value: FormDataEntryValue | null, label: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} debe ser un número mayor o igual a cero.`);
  return number;
}

function readTiers(formData: FormData): BadgeTierInput[] {
  const names = formData.getAll("tierName").map(String);
  const thresholds = formData.getAll("tierThreshold").map(String);
  const colors = formData.getAll("tierColor").map(String);
  const tiers = names.map((rawName, index) => {
    const displayName = rawName.trim();
    const threshold = Number(thresholds[index]);
    if (!displayName || !Number.isFinite(threshold) || threshold < 0) {
      throw new Error("Cada nivel debe tener nombre y un umbral válido.");
    }
    return {
      rank: index + 1,
      code: normalizeBadgeCode(displayName),
      displayName,
      threshold,
      color: colors[index]?.trim() || null,
    };
  });
  if (new Set(tiers.map(({ code }) => code)).size !== tiers.length) throw new Error("Los niveles deben tener nombres diferentes.");
  for (let index = 1; index < tiers.length; index += 1) {
    if (tiers[index].threshold <= tiers[index - 1].threshold) throw new Error("Los umbrales de niveles deben ser estrictamente crecientes.");
  }
  return tiers;
}

export function readBadgeForm(formData: FormData): BadgeFormValues {
  const name = required(formData, "name", "El nombre", 160);
  const code = normalizeBadgeCode(String(formData.get("code") ?? name));
  const slug = normalizeBadgeSlug(String(formData.get("slug") ?? name));
  if (!CODE_PATTERN.test(code) || code.length > 80) throw new Error("El código debe usar letras mayúsculas, números y guiones bajos.");
  if (!SLUG_PATTERN.test(slug) || slug.length > 160) throw new Error("El slug debe usar minúsculas, números y guiones.");

  const kind = oneOf(String(formData.get("kind") ?? ""), ["UNIQUE", "ACHIEVEMENT", "TIERED"] as const, "El tipo");
  const assignmentMode = oneOf(String(formData.get("assignmentMode") ?? ""), ["AUTOMATIC", "EDITORIAL"] as const, "El modo de asignación");
  if (assignmentMode === "EDITORIAL" && kind === "TIERED") {
    throw new Error("Las insignias editoriales por niveles se habilitarán junto con el motor de otorgamientos.");
  }
  const recipientType = oneOf(String(formData.get("recipientType") ?? ""), ["COMPETITOR", "COMPETITION", "ORGANIZATION"] as const, "El destinatario");
  const permanenceMode = oneOf(String(formData.get("permanenceMode") ?? "PERMANENT"), ["PERMANENT", "TEMPORARY"] as const, "La permanencia");
  const status = oneOf(String(formData.get("status") ?? "DRAFT"), ["DRAFT", "ACTIVE", "ARCHIVED"] as const, "El estado");
  const scopeType = oneOf(String(formData.get("scopeType") ?? "GLOBAL"), ["GLOBAL", "COMPETITION"] as const, "El ámbito");
  const competitionId = scopeType === "COMPETITION" ? required(formData, "competitionId", "La competencia", 80) : null;
  const description = required(formData, "description", "La descripción", 2_000);
  const publicRule = required(formData, "publicRule", "La regla pública", 1_000);
  const imageUrl = optionalUrl(String(formData.get("imageUrl") ?? "").trim());
  const metricId = assignmentMode === "AUTOMATIC" ? required(formData, "metricId", "La métrica", 80) : null;
  const operator = assignmentMode === "AUTOMATIC"
    ? oneOf(String(formData.get("operator") ?? ""), ["GTE", "EQ", "TOP_ONE", "FIRST"] as const, "El operador")
    : null;
  const threshold = assignmentMode === "AUTOMATIC" && kind !== "TIERED"
    ? parseNumber(formData.get("threshold"), "El umbral")
    : null;
  const tiers = kind === "TIERED" ? readTiers(formData) : [];
  if (assignmentMode === "AUTOMATIC" && kind === "TIERED" && tiers.length < 2) throw new Error("Una insignia por niveles necesita al menos dos niveles.");
  if (kind === "UNIQUE" && operator !== "TOP_ONE") throw new Error("Una insignia única automática debe utilizar el operador Máximo actual.");
  const reason = assignmentMode === "AUTOMATIC" ? required(formData, "reason", "El motivo de la versión", 500) : null;

  return { code, name, slug, description, publicRule, imageUrl, kind, assignmentMode, recipientType, permanenceMode, status, scopeType, competitionId, metricId, operator, threshold, reason, tiers };
}

export function badgeActionError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    return "Ya existe una insignia con ese código, slug o nivel.";
  }
  return error instanceof Error ? error.message : "No se pudo guardar la insignia.";
}
