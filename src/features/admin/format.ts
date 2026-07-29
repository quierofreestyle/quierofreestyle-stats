const labels: Record<string, string> = {
  ACTIVE: "Activo",
  ANNULLED: "Anulado",
  ARCHIVED: "Archivado",
  CORRECTED: "Corregido",
  DECIDED: "Definido",
  DRAFT: "Borrador",
  IGNORED: "Descartada",
  INVALID_FINALIST_ID: "Finalista inválido",
  LOCAL: "Local",
  MISSING_RUNNER_UP: "Subcampeón faltante",
  OPEN: "Abierta",
  ORGANIZER: "Organizadora",
  OTHER: "Otro",
  PUBLISHED: "Publicado",
  REGIONAL: "Regional",
  RESOLVED: "Resuelta",
  SHARED_CHAMPIONSHIP: "Campeonato compartido",
  SOLO: "Individual",
  DUO: "Dupla",
  TRIO: "Trío",
  UNDECIDED: "Indefinido",
};

export function adminLabel(value: string | null | undefined) {
  if (!value) return "Sin definir";
  return labels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("es");
}

export function formatAdminDate(value: Date | null | undefined) {
  if (!value) return "Fecha sin confirmar";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function issueDetail(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }
  return "La importación no informó un detalle adicional.";
}
