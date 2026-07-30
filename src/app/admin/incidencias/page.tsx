import type { Metadata } from "next";
import Link from "next/link";

import { adminLabel, formatAdminDate, issueDetail } from "../../../features/admin/format";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";

type Props = { searchParams: Promise<{ status?: string; type?: string }> };

export const metadata: Metadata = { title: "Incidencias · Administración" };
export const dynamic = "force-dynamic";

export default async function AdminIssuesPage({ searchParams }: Props) {
  await requireAdminCapability(
    ["EVENT_MANAGE", "SUBMISSION_REVIEW", "AUDIT_READ"],
    "/admin/incidencias",
  );
  const { status = "", type = "" } = await searchParams;
  const validStatus = ["OPEN", "RESOLVED", "IGNORED"].includes(status)
    ? (status as "OPEN" | "RESOLVED" | "IGNORED")
    : undefined;
  const issues = await db.migrationIssue.findMany({
    where: {
      ...(validStatus ? { status: validStatus } : {}),
      ...(type ? { issueType: type } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  const eventMaps = await db.legacyRecordMap.findMany({
    where: {
      entityKind: "event",
      legacyId: { in: issues.map(({ legacyKey }) => legacyKey) },
    },
    select: { legacyId: true, targetId: true },
  });
  const eventIdByLegacyKey = new Map(
    eventMaps.map(({ legacyId, targetId }) => [legacyId, targetId]),
  );

  return (
    <>
      <header className="admin-header">
        <div><p className="eyebrow">Importación histórica</p><h1>Incidencias</h1></div>
        <span className="admin-status">Conciliación</span>
      </header>
      <div className="admin-notice">
        Esta bandeja muestra ambigüedades detectadas durante la migración. En
        este corte pueden consultarse, pero no resolverse ni descartarse.
      </div>
      <form className="admin-filters" action="/admin/incidencias">
        <label>Estado<select name="status" defaultValue={validStatus ?? ""}><option value="">Todos</option><option value="OPEN">Abierta</option><option value="RESOLVED">Resuelta</option><option value="IGNORED">Descartada</option></select></label>
        <label>Tipo<select name="type" defaultValue={type}><option value="">Todos</option><option value="INVALID_FINALIST_ID">Finalista inválido</option><option value="MISSING_RUNNER_UP">Subcampeón faltante</option></select></label>
        <button type="submit">Filtrar</button>
        {validStatus || type ? <Link href="/admin/incidencias">Limpiar</Link> : null}
      </form>
      <section className="admin-issue-list">
        {issues.map((issue) => {
          const eventId = eventIdByLegacyKey.get(issue.legacyKey);
          return (
            <article key={issue.id}>
              <div className="admin-issue-meta">
                <span className={`admin-pill ${issue.status.toLowerCase()}`}>{adminLabel(issue.status)}</span>
                <span>{adminLabel(issue.issueType)}</span>
                <span>{formatAdminDate(issue.createdAt)}</span>
              </div>
              <h2>{issue.legacyKey}</h2>
              <p>{issueDetail(issue.payload)}</p>
              <dl><div><dt>Entidad</dt><dd>{adminLabel(issue.entityKind)}</dd></div><div><dt>Lote</dt><dd>{issue.batchId}</dd></div></dl>
              {eventId ? <Link className="admin-row-link" href={`/admin/eventos/${eventId}`}>Ver evento relacionado →</Link> : null}
            </article>
          );
        })}
        {issues.length === 0 ? <p className="admin-empty">No hay incidencias que coincidan con los filtros.</p> : null}
      </section>
    </>
  );
}
