import type { Metadata } from "next";
import Link from "next/link";

import { adminLabel } from "../../../features/admin/format";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata: Metadata = { title: "Competencias · Administración" };
export const dynamic = "force-dynamic";

export default async function AdminCompetitionsPage({ searchParams }: Props) {
  await requireAdminCapability(
    ["SUBJECT_READ", "SUBJECT_MANAGE"],
    "/admin/competencias",
  );
  const { q = "" } = await searchParams;
  const query = q.trim();
  const competitions = await db.competition.findMany({
    where: query
      ? {
          OR: [
            { subject: { displayName: { contains: query, mode: "insensitive" } } },
            { shortName: { contains: query, mode: "insensitive" } },
            {
              organization: {
                subject: {
                  displayName: { contains: query, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      subject: true,
      organization: { include: { subject: true } },
      _count: { select: { events: true } },
    },
    orderBy: { subject: { displayName: "asc" } },
  });

  return (
    <>
      <header className="admin-header">
        <div><p className="eyebrow">Datos</p><h1>Competencias</h1></div>
        <span className="admin-status">Solo lectura</span>
      </header>
      <form className="admin-filters" action="/admin/competencias">
        <label>Buscar<input name="q" defaultValue={query} placeholder="Nombre u organización" /></label>
        <button type="submit">Filtrar</button>
        {query ? <Link href="/admin/competencias">Limpiar</Link> : null}
      </form>
      <section className="admin-table-wrap">
        <div className="admin-table-heading">
          <p>{competitions.length} competencias encontradas</p>
        </div>
        <table className="admin-table">
          <thead><tr><th>Competencia</th><th>Organización</th><th>Alcance</th><th>Estado</th><th>Eventos</th></tr></thead>
          <tbody>
            {competitions.map((competition) => (
              <tr key={competition.subjectId}>
                <td><strong>{competition.subject.displayName}</strong><small>{competition.shortName ?? competition.subject.slug}</small></td>
                <td>{competition.organization.subject.displayName}</td>
                <td>{adminLabel(competition.defaultScope)}</td>
                <td><span className={`admin-pill ${competition.subject.status.toLowerCase()}`}>{adminLabel(competition.subject.status)}</span></td>
                <td>{competition._count.events}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitions.length === 0 ? <p className="admin-empty">No hay competencias que coincidan con la búsqueda.</p> : null}
      </section>
    </>
  );
}
