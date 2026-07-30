import type { Metadata } from "next";
import Link from "next/link";

import { createEvent } from "../../_actions/events";
import { AdminEventForm } from "../../../../features/admin/admin-event-form";
import { argentinaToday } from "../../../../features/admin/event-form";
import { requireAdminCapability } from "../../../../server/auth/permissions";
import { db } from "../../../../server/db";

export const metadata: Metadata = { title: "Nuevo evento · Administración" };
export const dynamic = "force-dynamic";

export default async function NewAdminEventPage() {
  await requireAdminCapability(["EVENT_MANAGE"], "/admin/eventos/nuevo");
  const [competitions, competitors, regions, declarants] = await Promise.all([
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

  return (
    <>
      <Link className="admin-back" href="/admin/eventos">← Volver a eventos</Link>
      <header className="admin-header">
        <div><p className="eyebrow">Datos</p><h1>Nuevo evento</h1></div>
        <span className="admin-status">Borrador</span>
      </header>
      <AdminEventForm
        action={createEvent}
        cancelHref="/admin/eventos"
        submitLabel="Crear borrador"
        today={argentinaToday()}
        competitions={competitions.map((item) => ({
          id: item.subjectId,
          label: item.subject.displayName,
          seasons: item.seasons.map((season) => ({ id: season.id, label: season.name })),
        }))}
        competitors={competitors.map((item) => ({ id: item.subjectId, label: item.subject.displayName }))}
        regions={regions.map((item) => ({ id: item.id, label: `${item.name} · ${item.type.toLowerCase()}` }))}
        declarants={declarants.map((item) => ({ id: item.id, label: item.displayName }))}
      />
    </>
  );
}
