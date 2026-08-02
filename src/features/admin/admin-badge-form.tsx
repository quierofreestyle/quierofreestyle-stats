"use client";

import Link from "next/link";
import { type FormEvent, useActionState, useEffect, useRef, useState } from "react";

import type { BadgeFormState, BadgeTierInput } from "./badge-form";

type Option = { id: string; label: string; recipientTypes?: string[] };
type Defaults = {
  code?: string;
  name?: string;
  slug?: string;
  description?: string;
  publicRule?: string;
  imageUrl?: string;
  kind?: string;
  assignmentMode?: string;
  recipientType?: string;
  permanenceMode?: string;
  status?: string;
  scopeType?: string;
  competitionId?: string;
  metricId?: string;
  operator?: string;
  threshold?: string;
  reason?: string;
  tiers?: BadgeTierInput[];
};
type Props = {
  action: (state: BadgeFormState, formData: FormData) => Promise<BadgeFormState>;
  competitions: Option[];
  metrics: Option[];
  defaults?: Defaults;
  submitLabel: string;
};

const emptyTier = (rank: number): BadgeTierInput => ({ rank, code: "", displayName: "", threshold: rank, color: null });

export function AdminBadgeForm({ action, competitions, metrics, defaults = {}, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [valid, setValid] = useState(false);
  const [kind, setKind] = useState(defaults.kind ?? "ACHIEVEMENT");
  const [mode, setMode] = useState(defaults.assignmentMode ?? "AUTOMATIC");
  const [recipient, setRecipient] = useState(defaults.recipientType ?? "COMPETITOR");
  const [scope, setScope] = useState(defaults.scopeType ?? "GLOBAL");
  const [tiers, setTiers] = useState(defaults.tiers?.length ? defaults.tiers : [emptyTier(1), emptyTier(2)]);
  const [operator, setOperator] = useState(defaults.operator ?? "GTE");

  const availableMetrics = metrics.filter((metric) => metric.recipientTypes?.includes(recipient));

  function updateValidity() { setValid(formRef.current?.checkValidity() ?? false); }
  useEffect(updateValidity, [kind, mode, recipient, scope, tiers]);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!event.currentTarget.checkValidity()) {
      event.preventDefault();
      event.currentTarget.reportValidity();
    }
  }

  function changeTier(index: number, field: "displayName" | "threshold" | "color", value: string) {
    setTiers((current) => current.map((tier, itemIndex) => itemIndex === index
      ? { ...tier, [field]: field === "threshold" ? Number(value) : value }
      : tier));
  }

  return (
    <>
      {state.error ? <p className="admin-form-error" role="alert">{state.error}</p> : null}
      <form ref={formRef} action={formAction} className="admin-editor badge-editor" onInput={updateValidity} onSubmit={submit}>
        <section className="admin-form-section">
          <div><p className="eyebrow">Identidad pública</p><h2>Presentación</h2></div>
          <div className="admin-form-grid">
            <label>Nombre <span className="admin-required">*</span><input name="name" required maxLength={160} defaultValue={defaults.name} /></label>
            <label>Código <span className="admin-required">*</span><input name="code" required maxLength={80} placeholder="MAXIMO_GANADOR" defaultValue={defaults.code} /></label>
            <label>Slug <span className="admin-required">*</span><input name="slug" required maxLength={160} placeholder="maximo-ganador" defaultValue={defaults.slug} /></label>
            <label>Estado <span className="admin-required">*</span><select name="status" required defaultValue={defaults.status ?? "DRAFT"}><option value="DRAFT">Borrador</option><option value="ACTIVE">Activa</option><option value="ARCHIVED">Archivada</option></select></label>
            <label className="admin-field-wide">Descripción pública <span className="admin-required">*</span><textarea name="description" required maxLength={2000} rows={4} defaultValue={defaults.description} /></label>
            <label className="admin-field-wide">Regla pública <span className="admin-required">*</span><textarea name="publicRule" required maxLength={1000} rows={3} defaultValue={defaults.publicRule} /><small>Explicación comprensible de cómo se obtiene.</small></label>
            <label className="admin-field-wide">URL de imagen<input type="url" name="imageUrl" defaultValue={defaults.imageUrl} placeholder="https://..." /></label>
          </div>
        </section>

        <section className="admin-form-section">
          <div><p className="eyebrow">Comportamiento</p><h2>Tipo y destinatario</h2></div>
          <div className="admin-form-grid">
            <label>Mecánica <span className="admin-required">*</span><select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="UNIQUE">Única</option><option value="ACHIEVEMENT">De logro</option><option value="TIERED" disabled={mode === "EDITORIAL"}>Por niveles</option></select><small>Define cómo se conserva y progresa el reconocimiento.</small></label>
            <label>Asignación <span className="admin-required">*</span><select name="assignmentMode" value={mode} onChange={(event) => { const next = event.target.value; setMode(next); if (next === "EDITORIAL" && kind === "TIERED") setKind("ACHIEVEMENT"); }}><option value="AUTOMATIC">Automática</option><option value="EDITORIAL">Editorial</option></select><small>Editorial requiere intervención de un gestor autorizado.</small></label>
            <label>Destinatario <span className="admin-required">*</span><select name="recipientType" value={recipient} onChange={(event) => setRecipient(event.target.value)}><option value="COMPETITOR">Competidor</option><option value="COMPETITION">Competencia</option><option value="ORGANIZATION">Organización</option></select></label>
            <label>Permanencia <span className="admin-required">*</span><select name="permanenceMode" defaultValue={defaults.permanenceMode ?? "PERMANENT"}><option value="PERMANENT">Permanente</option><option value="TEMPORARY">Temporal</option></select></label>
          </div>
        </section>

        <section className="admin-form-section">
          <div><p className="eyebrow">Cobertura</p><h2>Ámbito</h2></div>
          <div className="admin-form-grid">
            <label>Ámbito <span className="admin-required">*</span><select name="scopeType" value={scope} onChange={(event) => setScope(event.target.value)}><option value="GLOBAL">Global</option><option value="COMPETITION">Por competencia</option></select></label>
            {scope === "COMPETITION" ? <label>Competencia <span className="admin-required">*</span><select name="competitionId" required defaultValue={defaults.competitionId ?? ""}><option value="" disabled>Seleccionar</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}
          </div>
        </section>

        {mode === "AUTOMATIC" ? (
  <section className="admin-form-section">
    <div>
      <p className="eyebrow">Regla controlada</p>
      <h2>Cálculo</h2>
    </div>

    <div className="admin-form-grid">
      <label>
        Métrica <span className="admin-required">*</span>

        <select
          name="metricId"
          required
          defaultValue={
            availableMetrics.some(({ id }) => id === defaults.metricId)
              ? defaults.metricId
              : ""
          }
        >
          <option value="" disabled>
            Seleccionar
          </option>

          {availableMetrics.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Operador <span className="admin-required">*</span>

        <select
          name="operator"
          required
          value={kind === "UNIQUE" ? "TOP_ONE" : operator}
          onChange={(event) => setOperator(event.target.value)}
          disabled={kind === "UNIQUE"}
        >
          <option value="GTE">Mayor o igual</option>
          <option value="EQ">Igual</option>
          <option value="TOP_ONE">Máximo actual</option>
          <option value="FIRST">Primero en lograrlo</option>
        </select>

        {kind === "UNIQUE" ? (
          <input type="hidden" name="operator" value="TOP_ONE" />
        ) : null}
      </label>

      {kind !== "TIERED" ? (
        <label>
          Umbral
          <input
            type="number"
            name="threshold"
            min="0"
            step="1"
            defaultValue={defaults.threshold ?? "1"}
          />
        </label>
      ) : null}

      <label className="admin-field-wide">
        Motivo de la versión <span className="admin-required">*</span>

        <textarea
          name="reason"
          required
          maxLength={500}
          rows={2}
          defaultValue={
            defaults.reason ??
            (defaults.name
              ? "Actualización de la configuración"
              : "Versión inicial")
          }
        />
      </label>
    </div>
  </section>
) : null}

        {kind === "TIERED" ? (
          <section className="admin-form-section badge-tiers">
            <div className="admin-section-heading"><div><p className="eyebrow">Progresión</p><h2>Niveles</h2></div><button type="button" onClick={() => setTiers((current) => [...current, emptyTier(current.length + 1)])}>Agregar nivel</button></div>
            <div className="badge-tier-list">
              {tiers.map((tier, index) => <div className="badge-tier-row" key={index}>
                <strong>{index + 1}</strong>
                <label>Nombre<input name="tierName" required value={tier.displayName} onChange={(event) => changeTier(index, "displayName", event.target.value)} placeholder={index === 0 ? "Bronce" : "Plata"} /></label>
                <label>Umbral<input type="number" name="tierThreshold" required min="0" step="1" value={tier.threshold} onChange={(event) => changeTier(index, "threshold", event.target.value)} /></label>
                <label>Color<input name="tierColor" value={tier.color ?? ""} onChange={(event) => changeTier(index, "color", event.target.value)} placeholder="#CD7F32" /></label>
                <button type="button" disabled={tiers.length <= 2} onClick={() => setTiers((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button>
              </div>)}
            </div>
          </section>
        ) : null}

        <div className="admin-form-actions"><Link href="/admin/insignias">Cancelar</Link><button type="submit" disabled={!valid || pending}>{pending ? "Guardando…" : submitLabel}</button></div>
      </form>
    </>
  );
}
