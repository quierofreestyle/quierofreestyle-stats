"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ALL_BADGES_FILTER,
  filterPublicBadgeCatalog,
  type PublicBadgeCatalogItem,
} from "./public-badge-catalog";

const filterOptions = {
  kind: [
    [ALL_BADGES_FILTER, "Todos"],
    ["UNIQUE", "Única"],
    ["ACHIEVEMENT", "De logro"],
    ["TIERED", "Por niveles"],
  ],
  scopeType: [
    [ALL_BADGES_FILTER, "Todos"],
    ["GLOBAL", "Global"],
    ["COMPETITION", "Competencia"],
    ["ORGANIZATION", "Organización"],
    ["SEASON", "Temporada"],
    ["REGION", "Región"],
  ],
  recipientType: [
    [ALL_BADGES_FILTER, "Todos"],
    ["COMPETITOR", "Competidor"],
    ["COMPETITION", "Competencia"],
    ["ORGANIZATION", "Organización"],
  ],
  status: [
    [ALL_BADGES_FILTER, "Todos"],
    ["ACTIVE", "Activa"],
    ["ARCHIVED", "Discontinuada"],
  ],
} as const;

const kindLabels: Record<string, string> = {
  UNIQUE: "Única",
  ACHIEVEMENT: "De logro",
  TIERED: "Por niveles",
};

const recipientLabels: Record<string, string> = {
  COMPETITOR: "Competidor",
  COMPETITION: "Competencia",
  ORGANIZATION: "Organización",
};

const scopeLabels: Record<string, string> = {
  GLOBAL: "Global",
  COMPETITION: "Por competencia",
  ORGANIZATION: "Por organización",
  SEASON: "Por temporada",
  REGION: "Por región",
};

function CatalogSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

export function PublicBadgeBrowser({ badges }: { badges: PublicBadgeCatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(ALL_BADGES_FILTER);
  const [scopeType, setScopeType] = useState(ALL_BADGES_FILTER);
  const [recipientType, setRecipientType] = useState(ALL_BADGES_FILTER);
  const [status, setStatus] = useState(ALL_BADGES_FILTER);

  const filtered = useMemo(
    () => filterPublicBadgeCatalog(badges, { query, kind, scopeType, recipientType, status }),
    [badges, kind, query, recipientType, scopeType, status],
  );

  const reset = () => {
    setQuery("");
    setKind(ALL_BADGES_FILTER);
    setScopeType(ALL_BADGES_FILTER);
    setRecipientType(ALL_BADGES_FILTER);
    setStatus(ALL_BADGES_FILTER);
  };

  return (
    <>
      <section className="badge-catalog-filters" aria-label="Filtros de insignias">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o descripción"
          />
        </label>
        <CatalogSelect label="Tipo" value={kind} options={filterOptions.kind} onChange={setKind} />
        <CatalogSelect label="Ámbito" value={scopeType} options={filterOptions.scopeType} onChange={setScopeType} />
        <CatalogSelect label="Destinatario" value={recipientType} options={filterOptions.recipientType} onChange={setRecipientType} />
        <CatalogSelect label="Estado" value={status} options={filterOptions.status} onChange={setStatus} />
      </section>

      <p className="results-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "insignia" : "insignias"}
      </p>

      {filtered.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Sin coincidencias</p>
          <h2>No encontramos insignias con esos filtros</h2>
          <p>Probá otra búsqueda o combiná criterios diferentes.</p>
          <button type="button" onClick={reset}>Limpiar filtros</button>
        </section>
      ) : (
        <section className="badge-catalog-grid" aria-label="Catálogo de insignias">
          {filtered.map((badge) => (
            <article className="badge-catalog-card" key={badge.id}>
              <Link className="badge-catalog-art-link" href={badge.href}>
                <span
                  className="public-badge-art badge-catalog-art"
                  role="img"
                  aria-label={`Insignia ${badge.name}`}
                  style={badge.imageUrl
                    ? { backgroundImage: `url(${badge.imageUrl})` }
                    : { color: badge.color ?? undefined }}
                >
                  {!badge.imageUrl ? badge.name.slice(0, 2).toUpperCase() : null}
                </span>
              </Link>
              <div className="badge-catalog-copy">
                <div className="badge-catalog-tags">
                  <span>{kindLabels[badge.kind] ?? badge.kind}</span>
                  <span>{scopeLabels[badge.scopeType] ?? badge.scopeType}</span>
                  <span>{recipientLabels[badge.recipientType] ?? badge.recipientType}</span>
                </div>
                <div className="badge-catalog-title">
                  <h2><Link href={badge.href}>{badge.name}</Link></h2>
                  {badge.status === "ARCHIVED" ? <span className="archived-label">Discontinuada</span> : null}
                </div>
                <p>{badge.description}</p>
                <Link className="badge-catalog-detail-link" href={badge.href}>Ver insignia <span aria-hidden>→</span></Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
