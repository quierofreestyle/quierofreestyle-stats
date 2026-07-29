import type { Metadata } from "next";

import { db } from "../../server/db";
import { requireAdminUser } from "../../server/auth/permissions";

export const metadata: Metadata = { title: "Panel administrativo" };

export default async function AdminPage() {
  const user = await requireAdminUser();
  const canReadAudit = user.permissions.has("AUDIT_READ");
  const [competitions, events, competitors, organizations, draftEvents, openIssues] = await Promise.all([
    db.competition.count(),
    db.event.count(),
    db.competitor.count(),
    db.organization.count(),
    db.event.count({ where: { status: "DRAFT" } }),
    db.migrationIssue.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Resumen</h1>
        </div>
        <span className="admin-status">Sesión protegida</span>
      </header>
      <section className="admin-metrics" aria-label="Resumen de datos">
        <article><strong>{competitions}</strong><span>Competencias</span></article>
        <article><strong>{events}</strong><span>Eventos totales</span></article>
        <article><strong>{competitors}</strong><span>Competidores</span></article>
        <article><strong>{organizations}</strong><span>Organizaciones</span></article>
        <article><strong>{draftEvents}</strong><span>Eventos en borrador</span></article>
        <article><strong>{openIssues}</strong><span>Incidencias abiertas</span></article>
      </section>
      <section className="admin-welcome">
        <p className="eyebrow">Datos históricos</p>
        <h2>Consulta y conciliación</h2>
        <p>
          Revisá competencias, eventos, competidores, organizaciones y las
          incidencias detectadas durante la importación. Este corte es de solo
          lectura: no modifica ni publica información.
        </p>
        <dl>
          <div><dt>Autorización</dt><dd>Permisos por capacidad</dd></div>
          <div><dt>Auditoría</dt><dd>{canReadAudit ? "Consulta habilitada" : "Sin permiso de consulta"}</dd></div>
        </dl>
      </section>
    </>
  );
}
