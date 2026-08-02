import Link from "next/link";
import type { Metadata } from "next";

import { archiveBadge } from "../_actions/badges";
import { adminLabel, formatAdminDate } from "../../../features/admin/format";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

type Props = { searchParams: Promise<{ q?: string; status?: string; success?: string }> };
export const metadata: Metadata = { title: "Insignias · Administración" };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  created: "La insignia se creó correctamente.",
  updated: "La insignia y su versión de regla se actualizaron.",
  archived: "La insignia fue archivada sin eliminar su historial.",
};

export default async function AdminBadgesPage({ searchParams }: Props) {
  const user = await requireAdminCapability(["BADGE_READ", "BADGE_MANAGE"], "/admin/insignias");
  const canManage = user.permissions.has("BADGE_MANAGE");
  const query = await searchParams;
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(query.status ?? "") ? query.status as "DRAFT" | "ACTIVE" | "ARCHIVED" : undefined;
  const badges = await db.badgeDefinition.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query.q ? { OR: [
        { code: { contains: query.q, mode: "insensitive" } },
        { nameTemplate: { contains: query.q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      instances: { take: 1, include: { scope: { include: { competition: { include: { subject: true } } } } } },
      ruleVersions: { orderBy: { versionNumber: "desc" }, take: 1, include: { metric: true } },
    },
  });

  return <>
    <header className="admin-header"><div><p className="eyebrow">Reconocimientos</p><h1>Insignias</h1></div>{canManage ? <Link className="admin-primary-action" href="/admin/insignias/nueva">Nueva insignia</Link> : <span className="admin-status">Solo lectura</span>}</header>
    {query.success ? <p className="admin-form-success">{messages[query.success] ?? "Operación completada."}</p> : null}
    <section className="admin-welcome badge-admin-summary"><p className="eyebrow">Alcance de este bloque</p><h2>Definiciones y reglas</h2><p>Configurá la identidad, el ámbito y la regla versionada. Los otorgamientos automáticos y editoriales se implementarán en el motor siguiente.</p></section>
    <form className="admin-filters" action="/admin/insignias">
      <label>Buscar<input name="q" defaultValue={query.q} placeholder="Nombre o código" /></label>
      <label>Estado<select name="status" defaultValue={status ?? ""}><option value="">Todos</option><option value="DRAFT">Borrador</option><option value="ACTIVE">Activa</option><option value="ARCHIVED">Archivada</option></select></label>
      <button type="submit">Filtrar</button>{query.q || status ? <Link href="/admin/insignias">Limpiar</Link> : null}
    </form>
    <section className="admin-table-wrap">
      <div className="admin-table-heading"><p>{badges.length} insignias encontradas</p></div>
      <table className="admin-table"><thead><tr><th>Insignia</th><th>Tipo</th><th>Asignación</th><th>Destinatario</th><th>Ámbito</th><th>Regla</th><th>Estado</th><th>Actualizada</th>{canManage ? <th>Acción</th> : null}</tr></thead>
        <tbody>{badges.map((badge) => {
          const instance = badge.instances[0]; const rule = badge.ruleVersions[0];
          const scope = instance?.scope?.scopeType === "COMPETITION" ? instance.scope.competition?.subject.displayName ?? "Competencia" : "Global";
          return <tr key={badge.id}>
            <td><strong>{badge.nameTemplate}</strong><small>{badge.code}</small></td><td>{adminLabel(badge.kind)}</td><td>{adminLabel(badge.assignmentMode)}</td><td>{adminLabel(badge.recipientType)}</td><td>{scope}</td><td>{rule ? `${rule.metric.name} · v${rule.versionNumber}` : "Criterio editorial"}</td><td><span className={`admin-pill ${badge.status.toLowerCase()}`}>{adminLabel(badge.status)}</span></td><td>{formatAdminDate(badge.updatedAt)}</td>
            {canManage ? <td><div className="admin-row-actions"><Link className="admin-row-action" href={`/admin/insignias/${badge.id}/editar`}>Editar</Link>{badge.status !== "ARCHIVED" ? <form action={archiveBadge.bind(null, badge.id)}><button type="submit">Archivar</button></form> : null}</div></td> : null}
          </tr>;
        })}{!badges.length ? <tr><td colSpan={canManage ? 9 : 8}>No hay insignias que coincidan con la búsqueda.</td></tr> : null}</tbody>
      </table>
    </section>
  </>;
}
