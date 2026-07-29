import type { Metadata } from "next";
import Link from "next/link";

import { adminLabel, formatAdminDate } from "../../../features/admin/format";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

type Props = {
  searchParams: Promise<{ q?: string; status?: string; competition?: string }>;
};

export const metadata: Metadata = { title: "Eventos · Administración" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage({ searchParams }: Props) {
  await requireAdminCapability(
    ["EVENT_READ", "EVENT_MANAGE", "EVENT_PUBLISH"],
    "/admin/eventos",
  );
  const { q = "", status = "", competition = "" } = await searchParams;
  const query = q.trim();
  const validStatus = ["DRAFT", "PUBLISHED", "CORRECTED", "ANNULLED"].includes(status)
    ? (status as "DRAFT" | "PUBLISHED" | "CORRECTED" | "ANNULLED")
    : undefined;
  const [events, competitions] = await Promise.all([
    db.event.findMany({
      where: {
        ...(validStatus ? { status: validStatus } : {}),
        ...(competition ? { competitionId: competition } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" as const } },
                { slug: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: {
        competition: { include: { subject: true } },
        placements: {
          where: { status: "ACTIVE" },
          include: { members: true },
        },
      },
      orderBy: [{ occurredOn: "desc" }, { title: "asc" }],
    }),
    db.competition.findMany({
      include: { subject: true },
      orderBy: { subject: { displayName: "asc" } },
    }),
  ]);

  return (
    <>
      <header className="admin-header">
        <div><p className="eyebrow">Datos</p><h1>Eventos</h1></div>
        <span className="admin-status">Solo lectura</span>
      </header>
      <form className="admin-filters admin-filters-wide" action="/admin/eventos">
        <label>Buscar<input name="q" defaultValue={query} placeholder="Título o identificador" /></label>
        <label>Estado<select name="status" defaultValue={validStatus ?? ""}><option value="">Todos</option><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option><option value="CORRECTED">Corregido</option><option value="ANNULLED">Anulado</option></select></label>
        <label>Competencia<select name="competition" defaultValue={competition}><option value="">Todas</option>{competitions.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subject.displayName}</option>)}</select></label>
        <button type="submit">Filtrar</button>
        {query || validStatus || competition ? <Link href="/admin/eventos">Limpiar</Link> : null}
      </form>
      <section className="admin-table-wrap">
        <div className="admin-table-heading"><p>{events.length} eventos encontrados</p></div>
        <table className="admin-table">
          <thead><tr><th>Evento</th><th>Competencia</th><th>Fecha</th><th>Estado</th><th>Finalistas</th><th aria-label="Detalle" /></tr></thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td><strong>{event.title}</strong><small>{event.slug}</small></td>
                <td>{event.competition.subject.displayName}</td>
                <td>{formatAdminDate(event.occurredOn)}</td>
                <td><span className={`admin-pill ${event.status.toLowerCase()}`}>{adminLabel(event.status)}</span></td>
                <td>{event.placements.reduce((total, placement) => total + placement.members.length, 0)}</td>
                <td><Link className="admin-row-link" href={`/admin/eventos/${event.id}`}>Ver detalle</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 ? <p className="admin-empty">No hay eventos que coincidan con los filtros.</p> : null}
      </section>
    </>
  );
}
