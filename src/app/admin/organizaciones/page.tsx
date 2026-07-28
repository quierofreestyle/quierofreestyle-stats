import type { Metadata } from "next";
import Link from "next/link";

import { adminLabel } from "../../../features/admin/format";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

type Props = { searchParams: Promise<{ q?: string; success?: string }> };

export const metadata: Metadata = { title: "Organizaciones · Administración" };
export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage({ searchParams }: Props) {
  const user = await requireAdminCapability(
    ["SUBJECT_READ", "SUBJECT_MANAGE"],
    "/admin/organizaciones",
  );
  const { q = "", success } = await searchParams;
  const canManage = user.permissions.has("SUBJECT_MANAGE");
  const query = q.trim();
  const organizations = await db.organization.findMany({
    where: query
      ? {
          subject: {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      subject: true,
      _count: { select: { competitions: true } },
    },
    orderBy: { subject: { displayName: "asc" } },
  });

  return (
    <>
      <header className="admin-header">
        <div><p className="eyebrow">Datos</p><h1>Organizaciones</h1></div>
        {canManage ? <Link className="admin-primary-action" href="/admin/organizaciones/nueva">Nueva organización</Link> : <span className="admin-status">Solo lectura</span>}
      </header>
      {success ? <p className="admin-form-success">La organización se guardó correctamente.</p> : null}
      <form className="admin-filters" action="/admin/organizaciones">
        <label>Buscar<input name="q" defaultValue={query} placeholder="Nombre o slug" /></label>
        <button type="submit">Filtrar</button>
        {query ? <Link href="/admin/organizaciones">Limpiar</Link> : null}
      </form>
      <section className="admin-table-wrap">
        <div className="admin-table-heading"><p>{organizations.length} organizaciones encontradas</p></div>
        <table className="admin-table">
          <thead><tr><th>Organización</th><th>Tipo</th><th>Estado</th><th>Competencias</th>{canManage ? <th>Acciones</th> : null}</tr></thead>
          <tbody>
            {organizations.map((organization) => (
              <tr key={organization.subjectId}>
                <td><strong>{organization.subject.displayName}</strong><small>{organization.subject.slug}</small></td>
                <td>{adminLabel(organization.organizationType)}</td>
                <td><span className={`admin-pill ${organization.subject.status.toLowerCase()}`}>{adminLabel(organization.subject.status)}</span></td>
                <td>{organization._count.competitions}</td>
                {canManage ? <td><Link className="admin-row-action" href={`/admin/organizaciones/${organization.subjectId}/editar`}>Editar</Link></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
        {organizations.length === 0 ? <p className="admin-empty">No hay organizaciones que coincidan con la búsqueda.</p> : null}
      </section>
    </>
  );
}
