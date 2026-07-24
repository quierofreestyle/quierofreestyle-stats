import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdminUser } from "../../server/auth/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">QF</span>
          <span>Quiero Freestyle<small>Admin</small></span>
        </Link>
        <nav aria-label="Administración">
          <Link href="/admin">Resumen</Link>
          <span aria-disabled="true">Competencias <small>Próximamente</small></span>
          <span aria-disabled="true">Eventos <small>Próximamente</small></span>
          <span aria-disabled="true">Incidencias <small>Próximamente</small></span>
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
