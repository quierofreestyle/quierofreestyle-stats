import type { Metadata } from "next";
import Link from "next/link";

import {
  toPublicEventCard,
  type PublicEventListSource,
} from "../../features/events/public-event";
import { listPublicEvents } from "../../server/queries/public-events";

export const metadata: Metadata = {
  title: "Eventos",
  description:
    "Resultados publicados, campeones y finalistas de eventos de freestyle.",
};

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const data = await listPublicEvents();
  const events = data.map((event) =>
    toPublicEventCard(event as PublicEventListSource),
  );

  return (
    <main className="page-shell content-page">
      <section className="page-intro">
        <p className="eyebrow">Resultados verificados</p>
        <h1>Eventos</h1>
        <p>
          Recorré las ediciones publicadas, sus finalistas y campeones. Los
          borradores nunca aparecen en este archivo público.
        </p>
      </section>

      {events.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Archivo en construcción</p>
          <h2>Todavía no hay eventos publicados</h2>
          <p>El primer resultado verificado aparecerá en esta página.</p>
        </section>
      ) : (
        <section className="public-event-grid" aria-label="Eventos publicados">
          {events.map((event) => (
            <article className="public-event-card" key={event.id}>
              <div className="event-meta">
                <span>{event.dateLabel}</span>
                <span>{event.scope}</span>
                <span>{event.format}</span>
              </div>
              <p className="event-competition">{event.competition}</p>
              <h2>{event.title}</h2>
              <p className={`resolution ${event.resolution.toLowerCase()}`}>
                {event.resolutionLabel}
              </p>
              <div className="result-block">
                <span>
                  {event.champions.length > 1 ? "Campeones" : "Campeón"}
                </span>
                <strong>
                  {event.champions.length
                    ? event.champions.join(" · ")
                    : "Sin campeón definido"}
                </strong>
              </div>
              <Link href={event.href}>Ver evento <span aria-hidden>→</span></Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
