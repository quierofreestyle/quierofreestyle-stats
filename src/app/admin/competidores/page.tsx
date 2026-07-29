import type { Metadata } from "next";
import Link from "next/link";

import { adminLabel } from "../../../features/admin/format";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

export const metadata: Metadata = { title: "Competidores · Administración" };
export const dynamic = "force-dynamic";

export default async function AdminCompetitorsPage({ searchParams }: Props) {
  await requireAdminCapability(
    ["SUBJECT_READ", "SUBJECT_MANAGE"],
    "/admin/competidores",
  );
  const { q = "", status = "" } = await searchParams;
  const query = q.trim();
  const validStatus = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)
    ? (status as "DRAFT" | "ACTIVE" | "ARCHIVED")
    : undefined;
  const competitors = await db.competitor.findMany({
    where: {
      subject: {
        ...(validStatus ? { status: validStatus } : {}),
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: "insensitive" as const } },
                { slug: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    },
    include: {
      subject: true,
      homeRegion: true,
      _count: { select: { placements: true } },
    },
    orderBy: { subject: { displayName: "asc" } },
  });

  return (
    <>
      <header className="admin-header">
        <div><p className="eyebrow">Datos</p><h1>Competidores</h1></div>
        <span className="admin-status">Solo lectura</span>
      </header>
      <form className="admin-filters" action="/admin/competidores">
        <label>Buscar<input name="q" defaultValue={query} placeholder="Nombre o slug" /></label>
        <label>Estado<select name="status" defaultValue={validStatus ?? ""}><option value="">Todos</option><option value="ACTIVE">Activo</option><option value="DRAFT">Borrador</option><option value="ARCHIVED">Archivado</option></select></label>
        <button type="submit">Filtrar</button>
        {query || validStatus ? <Link href="/admin/competidores">Limpiar</Link> : null}
      </form>
      <section className="admin-table-wrap">
        <div className="admin-table-heading"><p>{competitors.length} competidores encontrados</p></div>
        <table className="admin-table">
          <thead><tr><th>Competidor</th><th>Región</th><th>Estado</th><th>Participaciones</th></tr></thead>
          <tbody>
            {competitors.map((competitor) => (
              <tr key={competitor.subjectId}>
                <td><strong>{competitor.subject.displayName}</strong><small>{competitor.subject.slug}</small></td>
                <td>{competitor.homeRegion?.name ?? "Sin región"}</td>
                <td><span className={`admin-pill ${competitor.subject.status.toLowerCase()}`}>{adminLabel(competitor.subject.status)}</span></td>
                <td>{competitor._count.placements}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitors.length === 0 ? <p className="admin-empty">No hay competidores que coincidan con los filtros.</p> : null}
      </section>
    </>
  );
}
