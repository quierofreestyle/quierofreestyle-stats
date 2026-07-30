import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  toPublicEventDetail,
  type PublicEventDetailSource,
} from "../../../../../features/events/public-event";
import { findPublicEvent } from "../../../../../server/queries/public-events";

type Props = {
  params: Promise<{ slug: string; eventSlug: string }>;
};

export const dynamic = "force-dynamic";

async function getEvent(competitionSlug: string, eventSlug: string) {
  const event = await findPublicEvent(competitionSlug, eventSlug);
  return event
    ? toPublicEventDetail(event as PublicEventDetailSource)
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, eventSlug } = await params;
  const event = await getEvent(slug, eventSlug);

  if (!event) return { title: "Evento no encontrado" };

  const championText = event.champions.length
    ? ` Campeón: ${event.champions.join(", ")}.`
    : "";

  return {
    title: `${event.title} · ${event.competition}`,
    description: `${event.dateLabel}. ${event.resolutionLabel}.${championText}`,
  };
}

export default async function PublicEventPage({ params }: Props) {
  const { slug, eventSlug } = await params;
  const event = await getEvent(slug, eventSlug);
  if (!event) notFound();

  return (
    <main className="page-shell content-page">
      <Link className="back-link" href={`/competencias/${event.competitionSlug}`}>
        <span aria-hidden>←</span> Volver a {event.competition}
      </Link>

      <section className="detail-hero event-detail-hero">
        <div>
          <p className="eyebrow">{event.competition}</p>
          <h1>{event.title}</h1>
          <p>{event.organization}</p>
        </div>
        <dl className="detail-stats event-detail-stats">
          <div><dt>Fecha</dt><dd>{event.dateLabel}</dd></div>
          <div><dt>Alcance</dt><dd>{event.scope}</dd></div>
          <div><dt>Formato</dt><dd>{event.format}</dd></div>
          <div><dt>Resolución</dt><dd>{event.resolutionLabel}</dd></div>
        </dl>
      </section>

      <section className="event-detail-layout">
        <div>
          <div className="section-heading">
            <p className="eyebrow">Resultado oficial</p>
            <h2>Finalistas</h2>
          </div>
          <ol className="placement-list">
            {event.placements.map((placement) => (
              <li key={placement.key}>
                <span className="placement-position">{placement.position}º</span>
                <div>
                  <small>{placement.typeLabel}</small>
                  <h3>{placement.label}</h3>
                  <p>
                    {placement.members.map((member, index) => (
                      <span key={member.href}>
                        {index ? " · " : ""}
                        <Link href={member.href}>{member.name}</Link>
                      </span>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="event-facts">
          <h2>Datos del evento</h2>
          <dl>
            {event.season ? <div><dt>Temporada</dt><dd>{event.season}</dd></div> : null}
            {event.location ? <div><dt>Lugar</dt><dd>{event.location}</dd></div> : null}
            {event.address ? <div><dt>Dirección</dt><dd>{event.address}</dd></div> : null}
            {event.scopeNotes ? <div><dt>Alcance</dt><dd>{event.scopeNotes}</dd></div> : null}
          </dl>
        </aside>
      </section>

      {event.sources.length ? (
        <section className="event-sources">
          <div className="section-heading">
            <p className="eyebrow">Trazabilidad</p>
            <h2>Fuentes</h2>
          </div>
          <ul>
            {event.sources.map((source) => (
              <li key={`${source.url}-${source.purpose}`}>
                <a href={source.url} rel="noreferrer" target="_blank">
                  <span>{source.label}</span>
                  {source.publisher ? <small>{source.publisher}</small> : null}
                  <strong aria-hidden>↗</strong>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
