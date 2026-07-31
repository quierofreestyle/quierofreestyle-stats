import type { Metadata } from "next";
import Link from "next/link";

import {
  parseRankingMode,
  rankingModeLabels,
  rankingModes,
} from "../../features/statistics/public-ranking";
import { listPublicRanking } from "../../server/queries/public-ranking";

type Props = {
  searchParams: Promise<{ modalidad?: string; pagina?: string }>;
};

const PAGE_SIZE = 25;

export const metadata: Metadata = {
  title: "Ranking de competidores",
  description:
    "Ranking histórico de competidores por títulos, finales y modalidades de freestyle.",
};

export const dynamic = "force-dynamic";

function parsePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function rankingHref(mode: string, page?: number) {
  const params = new URLSearchParams();
  if (mode !== "general") params.set("modalidad", mode);
  if (page && page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `/ranking?${query}` : "/ranking";
}

export default async function RankingPage({ searchParams }: Props) {
  const query = await searchParams;
  const mode = parseRankingMode(query.modalidad);
  const requestedPage = parsePage(query.pagina);
  const ranking = await listPublicRanking(mode);
  const pageCount = Math.max(1, Math.ceil(ranking.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * PAGE_SIZE;
  const visibleEntries = ranking.slice(offset, offset + PAGE_SIZE);

  return (
    <main className="page-shell content-page">
      <section className="page-intro ranking-intro">
        <p className="eyebrow">Estadísticas oficiales</p>
        <h1>Ranking</h1>
        <p>
          Clasificación histórica construida únicamente con resultados
          publicados. Cada título grupal acredita a todos sus integrantes.
        </p>
      </section>

      <nav className="ranking-tabs" aria-label="Modalidad del ranking">
        {rankingModes.map((item) => (
          <Link
            aria-current={item === mode ? "page" : undefined}
            className={item === mode ? "active" : undefined}
            href={rankingHref(item)}
            key={item}
          >
            {rankingModeLabels[item]}
          </Link>
        ))}
      </nav>

      {ranking.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Sin estadísticas</p>
          <h2>Todavía no hay resultados para este ranking</h2>
          <p>
            Aparecerá cuando existan eventos publicados y una reconstrucción de
            estadísticas aplicada.
          </p>
        </section>
      ) : (
        <>
          <p className="results-count" aria-live="polite">
            {ranking.length} {ranking.length === 1 ? "competidor" : "competidores"}
            {pageCount > 1 ? ` · Página ${page} de ${pageCount}` : ""}
          </p>

          <section className="ranking-table-wrap" aria-label={`Ranking ${rankingModeLabels[mode].toLowerCase()}`}>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th scope="col">Posición</th>
                  <th scope="col">Competidor</th>
                  <th scope="col">Títulos</th>
                  <th scope="col">Subcampeonatos</th>
                  <th scope="col">Finales</th>
                  <th scope="col">Individuales</th>
                  <th scope="col">Grupales</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry, index) => (
                  <tr key={entry.competitorId}>
                    <td className="ranking-position">{offset + index + 1}</td>
                    <th scope="row">
                      <Link href={`/competidores/${entry.slug}`}>
                        {entry.name} <span aria-hidden="true">↗</span>
                      </Link>
                    </th>
                    <td className={mode === "general" ? "ranking-highlight" : undefined}>
                      {entry.championships}
                    </td>
                    <td>{entry.runnerUps}</td>
                    <td>{entry.finals}</td>
                    <td className={mode === "individual" ? "ranking-highlight" : undefined}>
                      {entry.individualTitles}
                    </td>
                    <td className={mode === "grupal" ? "ranking-highlight" : undefined}>
                      {entry.groupTitles}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {pageCount > 1 ? (
            <nav className="pagination" aria-label="Páginas del ranking">
              {page > 1 ? <Link href={rankingHref(mode, page - 1)}>← Anterior</Link> : <span />}
              <span>Página {page} de {pageCount}</span>
              {page < pageCount ? <Link href={rankingHref(mode, page + 1)}>Siguiente →</Link> : <span />}
            </nav>
          ) : null}

          <aside className="ranking-methodology">
            <p className="eyebrow">Cómo se ordena</p>
            <p>
              En {rankingModeLabels[mode].toLowerCase()}, se priorizan los {mode === "general" ? "títulos totales" : `títulos ${rankingModeLabels[mode].toLowerCase()}es`}; luego las finales disputadas, la fecha más temprana en que se alcanzó el valor actual y, por último, el nombre.
            </p>
          </aside>
        </>
      )}
    </main>
  );
}
