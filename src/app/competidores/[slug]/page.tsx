import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  toPublicCompetitor,
  type PublicCompetitorSource,
} from "../../../features/competitors/public-competitor";
import { findPublicCompetitor } from "../../../server/queries/public-competitors";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

async function getCompetitor(slug: string) {
  const data = await findPublicCompetitor(slug);
  return data
    ? toPublicCompetitor(data as unknown as PublicCompetitorSource)
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competitor = await getCompetitor(slug);
  if (!competitor) return { title: "Competidor no encontrado" };

  return {
    title: competitor.name,
    description: `${competitor.name}: ${competitor.championships} títulos y ${competitor.finals} finales registradas.`,
  };
}

export default async function CompetitorPage({ params }: Props) {
  const { slug } = await params;
  const competitor = await getCompetitor(slug);
  if (!competitor) notFound();

  return (
    <main className="page-shell content-page">
      <Link className="back-link" href="/competidores">
        <span aria-hidden>←</span> Volver a competidores
      </Link>

      <section className="detail-hero competitor-detail-hero">
        <div className="competitor-identity">
          <div className="competitor-monogram large" aria-hidden>
            {competitor.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">Perfil de competidor</p>
            <h1>{competitor.name}</h1>
            {competitor.location ? <p>{competitor.location}</p> : null}
          </div>
        </div>
        <dl className="detail-stats competitor-detail-stats">
          <div><dt>Títulos</dt><dd>{competitor.championships}</dd></div>
          <div><dt>Subcampeonatos</dt><dd>{competitor.runnerUps}</dd></div>
          <div><dt>Finales</dt><dd>{competitor.finals}</dd></div>
        </dl>
      </section>

      {competitor.bio || competitor.aliases.length ? (
        <section className="competitor-profile-notes">
          {competitor.bio ? (
            <div>
              <p className="eyebrow">Sobre el competidor</p>
              <p>{competitor.bio}</p>
            </div>
          ) : null}
          {competitor.aliases.length ? (
            <div>
              <p className="eyebrow">También conocido como</p>
              <p>{competitor.aliases.join(" · ")}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="competitor-history">
        <div className="section-heading">
          <p className="eyebrow">Trayectoria publicada</p>
          <h2>Historial de finales</h2>
        </div>

        {competitor.appearances.length ? (
          <ol className="competitor-result-list">
            {competitor.appearances.map((appearance) => (
              <li key={appearance.key}>
                <div className={`result-rank ${appearance.type.toLowerCase()}`}>
                  <strong>{appearance.resultLabel}</strong>
                  <span>{appearance.dateLabel}</span>
                </div>
                <div>
                  <p>{appearance.competition}</p>
                  <h3>
                    <Link href={appearance.href}>{appearance.event}</Link>
                  </h3>
                  <div className="result-context">
                    <span>{appearance.format}</span>
                    {appearance.groupLabel ? (
                      <span>Equipo: {appearance.groupLabel}</span>
                    ) : null}
                    {appearance.nameAtEvent &&
                    appearance.nameAtEvent !== competitor.name ? (
                      <span>Compitió como {appearance.nameAtEvent}</span>
                    ) : null}
                  </div>
                  {appearance.type === "CHAMPION" &&
                  appearance.champions.length > 1 ? (
                    <small>
                      Campeonato compartido con{" "}
                      {appearance.champions
                        .filter((name) => name !== appearance.nameAtEvent)
                        .join(" · ")}
                    </small>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <section className="empty-state">
            <h3>Todavía no tiene finales publicadas</h3>
            <p>El historial se actualizará al publicar nuevos resultados.</p>
          </section>
        )}
      </section>
    </main>
  );
}
