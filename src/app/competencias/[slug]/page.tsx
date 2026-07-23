import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  toPublicCompetitions,
  type CompetitionSource,
} from "../../../features/competitions/model";
import { listPublicCompetitions } from "../../../server/queries/public-competitions";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

async function getCompetition(slug: string) {
  const data = await listPublicCompetitions();
  return toPublicCompetitions(data as CompetitionSource[]).find(
    (competition) => competition.slug === slug,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competition = await getCompetition(slug);
  return { title: competition?.name ?? "Competencia no encontrada" };
}

export default async function CompetitionDetailPage({ params }: Props) {
  const { slug } = await params;
  const competition = await getCompetition(slug);
  if (!competition) notFound();

  return (
    <main className="page-shell content-page">
      <Link className="back-link" href="/competencias">
        <span aria-hidden="true">←</span> Todas las competencias
      </Link>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">{competition.organization}</p>
          <h1>{competition.name}</h1>
          {competition.shortName ? <p>{competition.shortName}</p> : null}
        </div>
        <dl className="detail-stats">
          <div>
            <dt>Alcance</dt>
            <dd>{competition.scope}</dd>
          </div>
          <div>
            <dt>Eventos publicados</dt>
            <dd>{competition.eventCount}</dd>
          </div>
        </dl>
      </section>

      <section className="history-section">
        <div className="section-heading">
          <p className="eyebrow">Historial</p>
          <h2>Eventos y resultados</h2>
        </div>

        {competition.events.length === 0 ? (
          <div className="empty-state compact">
            <h3>Todavía no hay eventos publicados</h3>
            <p>Los resultados aparecerán aquí cuando sean verificados.</p>
          </div>
        ) : (
          <ol className="event-timeline">
            {competition.events.map((event) => (
              <li key={event.id}>
                <div className="timeline-marker" aria-hidden="true" />
                <article className="event-card">
                  <div className="event-meta">
                    <span>{event.dateLabel}</span>
                    <span>{event.scope}</span>
                    <span>{event.format}</span>
                  </div>
                  <h3>{event.title}</h3>
                  <p className={`resolution ${event.resolution.toLowerCase()}`}>
                    {event.resolutionLabel}
                  </p>
                  <div className="result-block">
                    <span>
                      {event.champions.length > 1 ? "Campeones" : "Campeón"}
                    </span>
                    <strong>
                      {event.champions.length > 0
                        ? event.champions.join(" · ")
                        : "Sin campeón definido"}
                    </strong>
                  </div>
                  {event.finalists.length > event.champions.length ? (
                    <p className="finalists">
                      Finalistas: {event.finalists.join(" · ")}
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
