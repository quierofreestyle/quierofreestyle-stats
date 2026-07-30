import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateEvent } from "../../../_actions/events";
import { AdminEventForm } from "../../../../../features/admin/admin-event-form";
import { argentinaToday } from "../../../../../features/admin/event-form";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Editar evento · Administración" };
export const dynamic = "force-dynamic";

export default async function EditAdminEventPage({ params }: Props) {
  const { id } = await params;
  await requireAdminCapability(["EVENT_MANAGE"], `/admin/eventos/${id}/editar`);
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
  if (event.status !== "DRAFT") {
    return (
      <>
        <Link className="admin-back" href={`/admin/eventos/${id}`}>← Volver al evento</Link>
        <header className="admin-header"><div><p className="eyebrow">Edición protegida</p><h1>{event.title}</h1></div></header>
        <p className="admin-form-error">Solo se pueden editar eventos en borrador. Los publicados, corregidos o anulados requieren sus flujos específicos.</p>
      </>
    );
  }

  return (
    <>
      <Link className="admin-back" href={`/admin/eventos/${id}`}>← Volver al evento</Link>
      <header className="admin-header">
        <div><p className="eyebrow">Borrador</p><h1>Editar evento</h1></div>
        <span className="admin-status">Sin publicar</span>
      </header>
      <AdminEventForm
        action={updateEvent.bind(null, id)}
        cancelHref={`/admin/eventos/${id}`}
        submitLabel="Guardar cambios"
        today={argentinaToday()}
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
