"use client";

import Link from "next/link";
import {
  type FormEvent,
  useActionState,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { createQuickCompetitor } from "../../app/admin/_actions/events";
import {
  isFutureEventDate,
  placementMemberLimit,
  placementStructure,
  type EventFormState,
} from "./event-form";

type Option = { id: string; label: string };
type CompetitionOption = Option & { seasons: Option[] };
type PlacementDraft = {
  position: number;
  type: "CHAMPION" | "RUNNER_UP" | "FINALIST";
  groupLabel: string;
  competitorIds: string[];
};
type SourceDraft = {
  url: string;
  title: string;
  publisher: string;
  type: "OFFICIAL" | "SOCIAL" | "VIDEO" | "DOCUMENT" | "OTHER";
  purpose: "RESULT" | "DATE" | "PARTICIPANTS" | "SCOPE" | "GENERAL";
};

type InitialEvent = {
  title: string;
  slug: string;
  competitionId: string;
  seasonId: string;
  editionNumber: number | null;
  eventYear: number | null;
  eventMonth: number | null;
  eventDay: number | null;
  datePrecision: "UNKNOWN" | "YEAR" | "MONTH" | "DAY";
  officialScope: string;
  locationRegionId: string;
  scopeRegionId: string;
  scopeDeclaredById: string;
  scopeSourceUrl: string;
  scopeNotes: string;
  format: "SOLO" | "DUO" | "TRIO" | "OTHER";
  resolution: "DECIDED" | "SHARED_CHAMPIONSHIP" | "UNDECIDED";
  placements: Array<
    Omit<PlacementDraft, "type"> & { type: PlacementDraft["type"] | "OTHER" }
  >;
  sources: SourceDraft[];
};

type Props = {
  action: (state: EventFormState, data: FormData) => Promise<EventFormState>;
  cancelHref: string;
  competitions: CompetitionOption[];
  competitors: Option[];
  declarants: Option[];
  initial?: InitialEvent;
  regions: Option[];
  submitLabel: string;
  today: string;
  expectedUpdatedAt?: string;
  reasonRequired?: boolean;
  confirmationText?: string;
};

function placementsForResolution(
  resolution: InitialEvent["resolution"],
  current: InitialEvent["placements"] = [],
) {
  return placementStructure(resolution).map((definition, index) => ({
    ...definition,
    groupLabel: current[index]?.groupLabel ?? "",
    competitorIds: current[index]?.competitorIds ?? [],
  }));
}
const blankSource = (): SourceDraft => ({
  url: "",
  title: "",
  publisher: "",
  type: "OFFICIAL",
  purpose: "GENERAL",
});

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type CompetitorPickerProps = {
  excludedIds: string[];
  limit: number;
  onChange: (ids: string[]) => void;
  onOptionsChange: (options: Option[]) => void;
  options: Option[];
  selectedIds: string[];
};

function CompetitorPicker({
  excludedIds,
  limit,
  onChange,
  onOptionsChange,
  options,
  selectedIds,
}: CompetitorPickerProps) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [creating, startCreating] = useTransition();
  const excluded = new Set(excludedIds);
  const selected = new Set(selectedIds);
  const normalizedQuery = normalizeSearch(query);
  const matches = options
    .filter(
      ({ id, label }) =>
        !excluded.has(id) &&
        !selected.has(id) &&
        (!normalizedQuery || normalizeSearch(label).includes(normalizedQuery)),
    )
    .slice(0, 8);
  const exactMatch = options.some(
    ({ label }) => normalizeSearch(label) === normalizedQuery,
  );
  const atLimit = selectedIds.length >= limit;

  function createCompetitor() {
    startCreating(async () => {
      const result = await createQuickCompetitor(query);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      const competitor = result.competitor;
      onOptionsChange(
        [...options, competitor].sort((a, b) =>
          a.label.localeCompare(b.label, "es"),
        ),
      );
      onChange([...selectedIds, competitor.id]);
      setQuery("");
      setCreateOpen(false);
      setCreateError("");
    });
  }

  return (
    <div className="admin-competitor-picker">
      <div className="admin-picker-chips">
        {selectedIds.map((id) => {
          const option = options.find((item) => item.id === id);
          return (
            <span className="admin-picker-chip" key={id}>
              {option?.label ?? "Competidor"}
              <button
                aria-label={`Quitar ${option?.label ?? "competidor"}`}
                type="button"
                onClick={() => onChange(selectedIds.filter((item) => item !== id))}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      <input
        aria-label="Buscar competidor"
        autoComplete="off"
        disabled={atLimit}
        placeholder={atLimit ? "Límite alcanzado" : "Escribí un nombre o alias…"}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCreateOpen(false);
          setCreateError("");
        }}
      />
      {!atLimit && query.trim() ? (
        <div className="admin-picker-results">
          {matches.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange([...selectedIds, option.id]);
                setQuery("");
              }}
            >
              {option.label}
            </button>
          ))}
          {!exactMatch && query.trim().length >= 2 ? (
            <button
              className="admin-picker-create"
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              + Agregar nuevo competidor: “{query.trim()}”
            </button>
          ) : null}
          {!matches.length && exactMatch ? (
            <p>Ese competidor ya fue seleccionado en este evento.</p>
          ) : null}
        </div>
      ) : null}
      {createOpen ? (
        <div className="admin-picker-create-panel">
          <p>Se creará “{query.trim()}” como competidor en borrador.</p>
          {createError ? <p className="admin-inline-error">{createError}</p> : null}
          <div>
            <button type="button" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
            <button type="button" disabled={creating} onClick={createCompetitor}>
              {creating ? "Agregando…" : "Crear y seleccionar"}
            </button>
          </div>
        </div>
      ) : null}
      <small>
        {atLimit
          ? `Límite alcanzado: ${selectedIds.length} de ${limit} integrantes.`
          : `${selectedIds.length} de ${limit} integrantes seleccionados.`}
      </small>
    </div>
  );
}

export function AdminEventForm({
  action,
  cancelHref,
  competitions,
  competitors,
  declarants,
  initial,
  regions,
  submitLabel,
  today,
  expectedUpdatedAt,
  reasonRequired = false,
  confirmationText,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState("");
  const [competitionId, setCompetitionId] = useState(initial?.competitionId ?? "");
  const [precision, setPrecision] = useState(initial?.datePrecision ?? "UNKNOWN");
  const [format, setFormat] = useState<InitialEvent["format"]>(
    initial?.format ?? "SOLO",
  );
  const [resolution, setResolution] = useState<InitialEvent["resolution"]>(
    initial?.resolution ?? "DECIDED",
  );
  const [placements, setPlacements] = useState<PlacementDraft[]>(
    placementsForResolution(
      initial?.resolution ?? "DECIDED",
      initial?.placements ?? [],
    ),
  );
  const [competitorOptions, setCompetitorOptions] = useState(competitors);
  const [sources, setSources] = useState<SourceDraft[]>(initial?.sources ?? []);
  const seasons = useMemo(
    () => competitions.find(({ id }) => id === competitionId)?.seasons ?? [],
    [competitionId, competitions],
  );
  const selectedCompetition = competitions.find(({ id }) => id === competitionId);
  const serializedPlacements = placements.every(
    ({ competitorIds }) => competitorIds.length === 0,
  )
    ? []
    : placements;

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!event.currentTarget.checkValidity()) {
      event.preventDefault();
      event.currentTarget.reportValidity();
      return;
    }
    const data = new FormData(event.currentTarget);
    const datePrecision = String(data.get("datePrecision")) as InitialEvent["datePrecision"];
    const numberOrNull = (name: string) => {
      const value = String(data.get(name) ?? "");
      return value ? Number(value) : null;
    };
    if (isFutureEventDate({
      datePrecision,
      eventYear: numberOrNull("eventYear"),
      eventMonth: numberOrNull("eventMonth"),
      eventDay: numberOrNull("eventDay"),
    }, today)) {
      event.preventDefault();
      setClientError("La fecha del evento no puede ser futura.");
      return;
    }
    setClientError("");
  }

  return (
    <>
      {state.error || clientError ? <p className="admin-form-error" role="alert">{clientError || state.error}</p> : null}
      <form ref={formRef} action={formAction} className="admin-event-editor" onSubmit={submit}>
        <input type="hidden" name="placements" value={JSON.stringify(serializedPlacements)} />
        <input type="hidden" name="sources" value={JSON.stringify(sources)} />
        {expectedUpdatedAt ? (
          <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
        ) : null}

        {reasonRequired ? (
          <section className="admin-form-section">
            <div>
              <p className="eyebrow">Trazabilidad</p>
              <h2>Motivo de la corrección</h2>
              <small>Quedará registrado junto con los valores anteriores y nuevos.</small>
            </div>
            <label className="admin-field-wide">
              Motivo <span className="admin-required">*</span>
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={500}
                placeholder="Explicá qué dato se corrige y por qué."
              />
            </label>
          </section>
        ) : null}

        <section className="admin-form-section">
          <div><p className="eyebrow">Identificación</p><h2>Datos del evento</h2></div>
          <div className="admin-form-grid">
            <div className="admin-field-wide">
              <span>Nombre e identificador</span>
              <small>
                {selectedCompetition
                  ? "Se generan automáticamente con la competencia y la fecha al guardar."
                  : "Seleccioná una competencia para generar estos datos automáticamente."}
              </small>
            </div>
            <label>Número de edición
              <input name="editionNumber" type="number" min="1" defaultValue={initial?.editionNumber ?? ""} />
            </label>
            <label>Competencia <span className="admin-required">*</span>
              <select name="competitionId" required value={competitionId} onChange={(event) => setCompetitionId(event.target.value)}>
                <option value="">Seleccionar</option>
                {competitions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>Temporada
              <select name="seasonId" defaultValue={initial?.seasonId ?? ""} key={`${competitionId}-${initial?.seasonId}`}>
                <option value="">Sin temporada</option>
                {seasons.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>Formato
              <select name="format" value={format} onChange={(event) => {
                const next = event.target.value as InitialEvent["format"];
                const limit = placementMemberLimit(next);
                setFormat(next);
                setPlacements((current) => current.map((item) => ({
                  ...item,
                  competitorIds: item.competitorIds.slice(0, limit),
                })));
              }}>
                <option value="SOLO">Individual</option><option value="DUO">Dupla</option>
                <option value="TRIO">Trío</option><option value="OTHER">Otro</option>
              </select>
            </label>
            <label>Resolución
              <select name="resolution" value={resolution} onChange={(event) => {
                const next = event.target.value as InitialEvent["resolution"];
                setResolution(next);
                setPlacements((current) => placementsForResolution(next, current));
              }}>
                <option value="DECIDED">Final decidida</option>
                <option value="SHARED_CHAMPIONSHIP">Campeonato compartido</option>
                <option value="UNDECIDED">Final indefinida</option>
              </select>
            </label>
          </div>
        </section>

        <section className="admin-form-section">
          <div><p className="eyebrow">Fecha</p><h2>Precisión conocida</h2><small>No inventes datos desconocidos.</small></div>
          <div className="admin-form-grid">
            <label>Precisión
              <select name="datePrecision" value={precision} onChange={(event) => setPrecision(event.target.value as typeof precision)}>
                <option value="UNKNOWN">Desconocida</option><option value="YEAR">Solo año</option>
                <option value="MONTH">Año y mes</option><option value="DAY">Fecha completa</option>
              </select>
            </label>
            <label>Año<input name="eventYear" type="number" min="1900" max={Number(today.slice(0, 4))} disabled={precision === "UNKNOWN"} required={precision !== "UNKNOWN"} defaultValue={initial?.eventYear ?? ""} /></label>
            <label>Mes<input name="eventMonth" type="number" min="1" max="12" disabled={!["MONTH", "DAY"].includes(precision)} required={["MONTH", "DAY"].includes(precision)} defaultValue={initial?.eventMonth ?? ""} /></label>
            <label>Día<input name="eventDay" type="number" min="1" max="31" disabled={precision !== "DAY"} required={precision === "DAY"} defaultValue={initial?.eventDay ?? ""} /></label>
          </div>
        </section>

        <section className="admin-form-section">
          <div><p className="eyebrow">Territorio</p><h2>Ubicación y alcance</h2><small>El alcance oficial es independiente del lugar físico.</small></div>
          <div className="admin-form-grid">
            <label>Alcance oficial
              <select name="officialScope" defaultValue={initial?.officialScope ?? "LOCAL"}>
                <option value="LOCAL">Local</option><option value="REGIONAL">Regional</option>
                <option value="PROVINCIAL">Provincial</option><option value="NATIONAL">Nacional</option>
                <option value="INTERNATIONAL">Internacional</option><option value="OTHER">Otro</option>
              </select>
            </label>
            <label>Región del alcance<select name="scopeRegionId" defaultValue={initial?.scopeRegionId ?? ""}><option value="">Sin región</option>{regions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>Ubicación física<select name="locationRegionId" defaultValue={initial?.locationRegionId ?? ""}><option value="">Sin ubicación</option>{regions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>Quién declara el alcance<select name="scopeDeclaredById" defaultValue={initial?.scopeDeclaredById ?? ""}><option value="">Sin declarar</option>{declarants.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="admin-field-wide">Fuente del alcance<input name="scopeSourceUrl" type="url" defaultValue={initial?.scopeSourceUrl ?? ""} placeholder="https://…" /></label>
            <label className="admin-field-wide">Notas<textarea name="scopeNotes" defaultValue={initial?.scopeNotes ?? ""} /></label>
          </div>
        </section>

        <section className="admin-form-section admin-repeatable">
          <div className="admin-repeatable-heading"><div><p className="eyebrow">Resultado</p><h2>Finalistas y agrupaciones</h2><small>Los tipos y posiciones se calculan automáticamente según la resolución. En una final decidida, el subcampeón puede quedar sin informar.</small></div></div>
          {placements.map((placement, index) => (
            <article className="admin-repeatable-card" key={index}>
              <h3 className="admin-result-title">
                {placement.type === "CHAMPION"
                  ? resolution === "SHARED_CHAMPIONSHIP"
                    ? `Campeón compartido ${index + 1}`
                    : "Campeón"
                  : placement.type === "RUNNER_UP"
                    ? "Subcampeón"
                    : `Finalista ${index + 1}`}
              </h3>
              <div className="admin-form-grid">
                {format !== "SOLO" ? (
                  <label className="admin-field-wide">
                    Nombre del equipo
                    <input
                      value={placement.groupLabel}
                      onChange={(event) =>
                        setPlacements((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, groupLabel: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder="Nombre del equipo usado en el evento (opcional)"
                    />
                  </label>
                ) : null}
                <div className="admin-field-wide">
                  <span>
                    Integrantes{" "}
                    {resolution === "DECIDED" && placement.type === "RUNNER_UP" ? (
                      <small>(opcional si no se conoce)</small>
                    ) : (
                      <span className="admin-required">*</span>
                    )}
                  </span>
                  <CompetitorPicker
                    options={competitorOptions}
                    selectedIds={placement.competitorIds}
                    excludedIds={placements.flatMap((item, itemIndex) =>
                      itemIndex === index ? [] : item.competitorIds
                    )}
                    limit={placementMemberLimit(format)}
                    onOptionsChange={setCompetitorOptions}
                    onChange={(competitorIds) =>
                      setPlacements((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, competitorIds } : item
                        )
                      )
                    }
                  />
                </div>
              </div>
            </article>
          ))}
          <p className="admin-empty">Podés guardar el borrador con ambos resultados vacíos. Una final decidida puede publicarse con campeón conocido y subcampeón sin informar.</p>
        </section>

        <section className="admin-form-section admin-repeatable">
          <div className="admin-repeatable-heading"><div><p className="eyebrow">Trazabilidad</p><h2>Fuentes</h2></div><button type="button" onClick={() => setSources((current) => [...current, blankSource()])}>+ Agregar fuente</button></div>
          {sources.length === 0 ? <p className="admin-empty">Todavía no hay fuentes asociadas.</p> : null}
          {sources.map((source, index) => (
            <article className="admin-repeatable-card" key={index}>
              <div className="admin-form-grid">
                <label className="admin-field-wide">URL <span className="admin-required">*</span><input type="url" required value={source.url} onChange={(event) => setSources((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} /></label>
                <label>Título<input value={source.title} onChange={(event) => setSources((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></label>
                <label>Publicador<input value={source.publisher} onChange={(event) => setSources((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, publisher: event.target.value } : item))} /></label>
                <label>Tipo<select value={source.type} onChange={(event) => setSources((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as SourceDraft["type"] } : item))}><option value="OFFICIAL">Oficial</option><option value="SOCIAL">Red social</option><option value="VIDEO">Video</option><option value="DOCUMENT">Documento</option><option value="OTHER">Otro</option></select></label>
                <label>Propósito<select value={source.purpose} onChange={(event) => setSources((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, purpose: event.target.value as SourceDraft["purpose"] } : item))}><option value="GENERAL">General</option><option value="RESULT">Resultado</option><option value="DATE">Fecha</option><option value="PARTICIPANTS">Participantes</option><option value="SCOPE">Alcance</option></select></label>
              </div>
              <button className="admin-remove-action" type="button" onClick={() => setSources((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar fuente</button>
            </article>
          ))}
        </section>

        {confirmationText ? (
          <section className="admin-form-section">
            <label className="admin-field-wide">
              <input name="confirmed" type="checkbox" required />
              {confirmationText}
            </label>
          </section>
        ) : null}

        <div className="admin-form-actions">
          <Link href={cancelHref}>Cancelar</Link>
          <button type="submit" disabled={pending}>{pending ? "Guardando…" : submitLabel}</button>
        </div>
      </form>
    </>
  );
}
