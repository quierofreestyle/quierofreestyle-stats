"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { PublicCompetition } from "./model";

type Props = {
  competitions: PublicCompetition[];
};

export function CompetitionBrowser({ competitions }: Props) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("Todos");

  const scopes = useMemo(
    () => ["Todos", ...new Set(competitions.map((item) => item.scope))],
    [competitions],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");

    return competitions.filter((competition) => {
      const matchesScope = scope === "Todos" || competition.scope === scope;
      const haystack =
        `${competition.name} ${competition.shortName ?? ""} ${competition.organization}`.toLocaleLowerCase(
          "es",
        );
      return matchesScope && haystack.includes(normalizedQuery);
    });
  }, [competitions, query, scope]);

  return (
    <>
      <section className="filters" aria-label="Filtros de competencias">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Competencia u organización"
          />
        </label>
        <div className="scope-filter">
          <span>Alcance</span>
          <div className="filter-options">
            {scopes.map((option) => (
              <button
                key={option}
                type="button"
                className={scope === option ? "active" : ""}
                onClick={() => setScope(option)}
                aria-pressed={scope === option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      <p className="results-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "competencia" : "competencias"}
      </p>

      {filtered.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Sin coincidencias</p>
          <h2>No encontramos competencias con esos filtros</h2>
          <p>Probá otro nombre o seleccioná un alcance diferente.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setScope("Todos");
            }}
          >
            Limpiar filtros
          </button>
        </section>
      ) : (
        <section className="competition-grid" aria-label="Competencias">
          {filtered.map((competition) => (
            <article className="competition-card" key={competition.slug}>
              <div className="card-topline">
                <span className="scope-badge">{competition.scope}</span>
                <span>
                  {competition.eventCount}{" "}
                  {competition.eventCount === 1 ? "evento" : "eventos"}
                </span>
              </div>
              <div>
                <p className="organization">{competition.organization}</p>
                <h2>{competition.name}</h2>
                {competition.shortName ? (
                  <p className="short-name">{competition.shortName}</p>
                ) : null}
              </div>
              <div className="latest-result">
                <span>Último registro</span>
                <strong>
                  {competition.latestChampions.length > 0
                    ? competition.latestChampions.join(" · ")
                    : competition.latestEventLabel
                      ? "Sin campeón definido"
                      : "Todavía sin eventos"}
                </strong>
                {competition.latestEventLabel ? (
                  <small>{competition.latestEventLabel}</small>
                ) : null}
              </div>
              <Link href={`/competencias/${competition.slug}`}>
                Ver historial <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
