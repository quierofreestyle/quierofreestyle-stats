import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { correctEvent } from "../../../_actions/events";
import { AdminEventForm } from "../../../../../features/admin/admin-event-form";
import { argentinaToday } from "../../../../../features/admin/event-form";
import { adminLabel, formatAdminDate } from "../../../../../features/admin/format";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Corregir evento · Administración" };
export const dynamic = "force-dynamic";

export default async function CorrectAdminEventPage({ params }: Props) {
  const { id } = await params;
  await requireAdminCapability(["EVENT_MANAGE"], `/admin/eventos/${id}/corregir`);
  const [event, competitions, competitors, regions, declarants] = await Promise.all([
    db.event.findUnique({
      where: { id },
      include: {
        placements: {
          where: { status: "ACTIVE" },
          include: { members: { orderBy: { memberOrder: "asc" } } },
          orderBy: [{ position: "asc" }, { slot: "asc" }],
        },
        sources: { include: { source: true } },
      },
    }),
    db.competition.findMany({
      include: { subject: true, seasons: { orderBy: { name: "desc" } } },
      orderBy: { subject: { displayName: "asc" } },
    }),
    db.competitor.findMany({
      include: { subject: true },
      orderBy: { subject: { displayName: "asc" } },
    }),
    db.region.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    db.subject.findMany({
      where: { type: { in: ["COMPETITION", "ORGANIZATION"] } },
      orderBy: { displayName: "asc" },
    }),
  ]);
  if (!event) notFound();
  if (!["PUBLISHED", "CORRECTED"].includes(event.status)) {
    return (
      <>
        <Link className="admin-back" href={`/admin/eventos/${id}`}>← Volver al evento</Link>
        <p className="admin-form-error">Solo se puede corregir un evento publicado o corregido.</p>
      </>
    );
  }
  return (
    <>
      <Link className="admin-back" href={`/admin/eventos/${id}`}>← Volver al evento</Link>
      <header className="admin-header">
        <div><p className="eyebrow">Corrección publicada</p><h1>{event.title}</h1></div>
        <span className="admin-status">Se registrará antes y después</span>
      </header>
      <p className="admin-notice">
        Revisá todos los datos antes de confirmar. La corrección conservará la URL,
        registrará las diferencias y encolará el recálculo histórico.
      </p>
      <details className="admin-panel" open>
        <summary>Valores publicados actuales</summary>
        <dl className="admin-publication-impact">
          <div><dt>Estado</dt><dd>{adminLabel(event.status)}</dd></div>
          <div><dt>Fecha</dt><dd>{formatAdminDate(event.occurredOn)}</dd></div>
          <div><dt>Formato</dt><dd>{adminLabel(event.format)}</dd></div>
          <div><dt>Resolución</dt><dd>{adminLabel(event.resolution)}</dd></div>
          <div>
            <dt>Resultados</dt>
            <dd>
              {event.placements
                .map((placement) =>
                  placement.members
                    .map((member) => {
                      const option = competitors.find(
                        ({ subjectId }) => subjectId === member.competitorId,
                      );
                      return option?.subject.displayName ?? member.competitorId;
                    })
                    .join(" · "),
                )
                .join(" / ")}
            </dd>
          </div>
          <div><dt>Fuentes</dt><dd>{event.sources.length}</dd></div>
        </dl>
      </details>
      <AdminEventForm
        action={correctEvent.bind(null, id)}
        cancelHref={`/admin/eventos/${id}`}
        submitLabel="Confirmar corrección"
        today={argentinaToday()}
        expectedUpdatedAt={event.updatedAt.toISOString()}
        reasonRequired
        confirmationText="Revisé los valores publicados de arriba y confirmo que el formulario contiene la corrección que debe quedar visible."
        competitions={competitions.map((item) => ({
          id: item.subjectId,
          label: item.subject.displayName,
          seasons: item.seasons.map((season) => ({ id: season.id, label: season.name })),
        }))}
        competitors={competitors.map((item) => ({ id: item.subjectId, label: item.subject.displayName }))}
        regions={regions.map((item) => ({ id: item.id, label: `${item.name} · ${item.type.toLowerCase()}` }))}
        declarants={declarants.map((item) => ({ id: item.id, label: item.displayName }))}
        initial={{
          title: event.title,
          slug: event.slug,
          competitionId: event.competitionId,
          seasonId: event.seasonId ?? "",
          editionNumber: event.editionNumber,
          eventYear: event.eventYear,
          eventMonth: event.eventMonth,
          eventDay: event.eventDay,
          datePrecision: event.datePrecision,
          officialScope: event.officialScope,
          locationRegionId: event.locationRegionId ?? "",
          scopeRegionId: event.scopeRegionId ?? "",
          scopeDeclaredById: event.scopeDeclaredById ?? "",
          scopeSourceUrl: event.scopeSourceUrl ?? "",
          scopeNotes: event.scopeNotes ?? "",
          format: event.format,
          resolution: event.resolution,
          placements: event.placements.map((placement) => ({
            position: placement.position,
            type: placement.type,
            groupLabel: placement.groupLabel ?? "",
            competitorIds: placement.members.map((member) => member.competitorId),
          })),
          sources: event.sources.map(({ source, purpose }) => ({
            url: source.url,
            title: source.title ?? "",
            publisher: source.publisher ?? "",
            type: source.type,
            purpose,
          })),
        }}
      />
    </>
  );
}
