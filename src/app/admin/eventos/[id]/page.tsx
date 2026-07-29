import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { adminLabel, formatAdminDate } from "../../../../features/admin/format";
import { requireAdminCapability } from "../../../../server/auth/permissions";
import { db } from "../../../../server/db";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Detalle de evento · Administración" };
export const dynamic = "force-dynamic";

export default async function AdminEventDetailPage({ params }: Props) {
  const { id } = await params;
  await requireAdminCapability(
    ["EVENT_READ", "EVENT_MANAGE", "EVENT_PUBLISH"],
    `/admin/eventos/${id}`,
  );
  const event = await db.event.findUnique({
    where: { id },
    include: {
      competition: {
        include: {
          subject: true,
          organization: { include: { subject: true } },
        },
      },
      season: true,
      locationRegion: true,
      scopeRegion: true,
      placements: {
        where: { status: "ACTIVE" },
        include: {
          members: {
            include: { competitor: { include: { subject: true } } },
            orderBy: { memberOrder: "asc" },
          },
        },
        orderBy: [{ position: "asc" }, { slot: "asc" }],
      },
      sources: { include: { source: true } },
    },
  });
  if (!event) notFound();

  return (
    <>
      <Link className="admin-back" href="/admin/eventos">← Volver a eventos</Link>
      <header className="admin-header">
        <div><p className="eyebrow">{event.competition.subject.displayName}</p><h1>{event.title}</h1></div>
        <span className={`admin-pill ${event.status.toLowerCase()}`}>{adminLabel(event.status)}</span>
      </header>
      <section className="admin-detail-grid">
        <article>
          <p className="eyebrow">Identificación</p>
          <dl>
            <div><dt>Fecha</dt><dd>{formatAdminDate(event.occurredOn)}</dd></div>
            <div><dt>Temporada</dt><dd>{event.season?.name ?? "Sin temporada"}</dd></div>
            <div><dt>Formato</dt><dd>{adminLabel(event.format)}</dd></div>
            <div><dt>Resolución</dt><dd>{adminLabel(event.resolution)}</dd></div>
            <div><dt>Organización</dt><dd>{event.competition.organization.subject.displayName}</dd></div>
            <div><dt>Identificador</dt><dd>{event.slug}</dd></div>
          </dl>
        </article>
        <article>
          <p className="eyebrow">Territorio</p>
          <dl>
            <div><dt>Alcance oficial</dt><dd>{adminLabel(event.officialScope)}</dd></div>
            <div><dt>Región de alcance</dt><dd>{event.scopeRegion?.name ?? "Sin región"}</dd></div>
            <div><dt>Ubicación</dt><dd>{event.locationRegion?.name ?? "Sin ubicación"}</dd></div>
            <div><dt>Nota de origen</dt><dd>{event.scopeNotes ?? "Sin observaciones"}</dd></div>
          </dl>
        </article>
      </section>
      <section className="admin-panel">
        <div className="admin-table-heading"><div><p className="eyebrow">Resultado</p><h2>Finalistas registrados</h2></div></div>
        {event.placements.length ? (
          <ol className="admin-placements">
            {event.placements.map((placement) => (
              <li key={placement.id}>
                <span>{placement.position}º · {adminLabel(placement.type)}</span>
                <strong>{placement.members.map((member) => member.displayNameAtEvent ?? member.competitor.subject.displayName).join(" · ")}</strong>
              </li>
            ))}
          </ol>
        ) : <p className="admin-empty">Este evento todavía no tiene finalistas válidos registrados.</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-table-heading"><div><p className="eyebrow">Trazabilidad</p><h2>Fuentes</h2></div></div>
        {event.sources.length ? (
          <ul className="admin-source-list">
            {event.sources.map(({ source, purpose }) => (
              <li key={`${source.id}-${purpose}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title ?? source.url}</a><span>{adminLabel(purpose)}</span></li>
            ))}
          </ul>
        ) : <p className="admin-empty">No hay fuentes asociadas a este evento.</p>}
      </section>
    </>
  );
}
