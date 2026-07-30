"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { toPublicCompetitor } from "./public-competitor";

type PublicCompetitor = ReturnType<typeof toPublicCompetitor>;

export function CompetitorBrowser({
  competitors,
}: {
  competitors: PublicCompetitor[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return competitors;

    return competitors.filter((competitor) =>
      [
        competitor.name,
        competitor.aliases.join(" "),
        competitor.location ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(normalized),
    );
  }, [competitors, query]);

  return (
    <>
      <section className="filters competitor-filters" aria-label="Buscar competidores">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, alias o ubicación"
          />
        </label>
      </section>

      <p className="results-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "competidor" : "competidores"}
      </p>

      {filtered.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Sin coincidencias</p>
          <h2>No encontramos competidores con ese nombre</h2>
          <button type="button" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </button>
        </section>
      ) : (
        <section className="competitor-grid" aria-label="Competidores">
          {filtered.map((competitor) => (
            <article className="competitor-card" key={competitor.slug}>
              <div className="competitor-monogram" aria-hidden>
                {competitor.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2>{competitor.name}</h2>
                {competitor.location ? <p>{competitor.location}</p> : null}
              </div>
              <dl>
                <div><dt>Títulos</dt><dd>{competitor.championships}</dd></div>
                <div><dt>Finales</dt><dd>{competitor.finals}</dd></div>
              </dl>
              <Link href={competitor.href}>
                Ver perfil <span aria-hidden>→</span>
              </Link>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
