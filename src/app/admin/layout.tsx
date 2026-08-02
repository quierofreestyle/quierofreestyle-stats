import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdminUser } from "../../server/auth/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();
  const canReadSubjects =
    user.permissions.has("SUBJECT_READ") ||
    user.permissions.has("SUBJECT_MANAGE");
  const canReadEvents =
    user.permissions.has("EVENT_READ") ||
    user.permissions.has("EVENT_MANAGE") ||
    user.permissions.has("EVENT_PUBLISH");
  const canReadIssues =
    user.permissions.has("EVENT_MANAGE") ||
    user.permissions.has("SUBMISSION_REVIEW") ||
    user.permissions.has("AUDIT_READ");
  const canReadStatistics =
    user.permissions.has("BADGE_RECALCULATE") ||
    user.permissions.has("AUDIT_READ");
  const canReadBadges =
    user.permissions.has("BADGE_READ") ||
    user.permissions.has("BADGE_MANAGE");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">QF</span>
          <span>Quiero Freestyle<small>Admin</small></span>
        </Link>
        <nav aria-label="Administración">
          <Link href="/admin">Resumen</Link>
          {canReadSubjects ? <Link href="/admin/competencias">Competencias</Link> : null}
          {canReadEvents ? <Link href="/admin/eventos">Eventos</Link> : null}
          {canReadStatistics ? <Link href="/admin/estadisticas">Estadísticas</Link> : null}
          {canReadBadges ? <Link href="/admin/insignias">Insignias</Link> : null}
          {canReadSubjects ? <Link href="/admin/competidores">Competidores</Link> : null}
          {canReadSubjects ? <Link href="/admin/organizaciones">Organizaciones</Link> : null}
          {canReadIssues ? <Link href="/admin/incidencias">Incidencias</Link> : null}
        </nav>
        <div className="admin-account">
          <span>{user.email ?? "Cuenta administrativa"}</span>
          <form action="/auth/logout" method="post">
            <button type="submit">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
