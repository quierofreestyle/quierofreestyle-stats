import type { Metadata } from "next";

import {
  processNextStatisticsRun,
  processStatisticsRun,
  queueStatisticsRebuild,
  retryStatisticsRun,
} from "../_actions/statistics";
import { adminLabel, formatAdminDate } from "../../../features/admin/format";
import { requireAdminCapability } from "../../../server/auth/permissions";
import { db } from "../../../server/db";
import { inspectStatisticsDataHealth } from "../../../server/statistics/recalculation";

type Props = {
  searchParams: Promise<{ success?: string; error?: string; run?: string }>;
};

export const metadata: Metadata = { title: "Estadísticas · Administración" };
export const dynamic = "force-dynamic";

const successMessages: Record<string, string> = {
  queued: "La reconstrucción quedó encolada.",
  processed: "La ejecución terminó correctamente.",
  retried: "La ejecución fallida volvió a la cola.",
  empty: "No hay ejecuciones pendientes.",
};

function summaryValue(summary: unknown, key: string) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" || typeof value === "string" ? String(value) : null;
}

export default async function AdminStatisticsPage({ searchParams }: Props) {
  const user = await requireAdminCapability(
    ["BADGE_RECALCULATE", "AUDIT_READ"],
    "/admin/estadisticas",
  );
  const canRun = user.permissions.has("BADGE_RECALCULATE");
  const query = await searchParams;
  const [runs, statistics, findings] = await Promise.all([
    db.recalculationRun.findMany({
      orderBy: [{ queuedAt: "desc" }],
      take: 50,
      include: { initiatedBy: { select: { email: true } } },
    }),
    db.competitorStatistic.findMany({
      orderBy: [
        { championships: "desc" },
        { championshipsReachedAt: "asc" },
        { competitor: { subject: { displayName: "asc" } } },
      ],
      take: 20,
      include: {
        competitor: { select: { subject: { select: { displayName: true } } } },
      },
    }),
    inspectStatisticsDataHealth(),
  ]);

  const errors = findings.filter(({ severity }) => severity === "ERROR");
  const warnings = findings.filter(({ severity }) => severity === "WARNING");

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Datos derivados</p>
          <h1>Estadísticas y recálculos</h1>
        </div>
        <span className="admin-status">Reconstrucción histórica</span>
      </header>

      {query.success ? (
        <div className="admin-notice">{successMessages[query.success] ?? "Operación completada."}</div>
      ) : null}
      {query.error ? <div className="admin-form-error">{query.error}</div> : null}

      <section className="admin-welcome">
        <p className="eyebrow">Salud de datos publicados</p>
        <h2>{errors.length ? "Hay bloqueos para aplicar" : "Datos listos para recalcular"}</h2>
        <p>
          Los borradores y anulados no participan. Los errores detienen la
          aplicación sin reemplazar estadísticas válidas; las advertencias no
          bloquean.
        </p>
        <dl>
          <div><dt>Errores</dt><dd>{errors.length}</dd></div>
          <div><dt>Advertencias</dt><dd>{warnings.length}</dd></div>
        </dl>
        {findings.length ? (
          <ul className="admin-health-list">
            {findings.map((finding, index) => (
              <li key={`${finding.code}-${finding.entityId ?? index}`} data-severity={finding.severity}>
                <strong>{finding.severity === "ERROR" ? "Bloqueo" : "Advertencia"}</strong>
                <span>{finding.message}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {canRun ? (
        <section className="admin-recalculation-actions">
          <form action={queueStatisticsRebuild}>
            <input type="hidden" name="mode" value="DRY_RUN" />
            <button type="submit">Simular reconstrucción total</button>
          </form>
          <form action={queueStatisticsRebuild}>
            <input type="hidden" name="mode" value="APPLY" />
            <button type="submit" disabled={errors.length > 0}>Encolar reconstrucción total</button>
          </form>
          <form action={processNextStatisticsRun}>
            <button type="submit">Procesar siguiente pendiente</button>
          </form>
        </section>
      ) : null}

      <section className="admin-table-section">
        <div className="admin-section-heading">
          <div><p className="eyebrow">Cola</p><h2>Últimas ejecuciones</h2></div>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Estado</th><th>Disparador</th><th>Modo</th><th>Encolado</th><th>Resultado</th><th>Acción</th></tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td><span className={`admin-pill ${run.status.toLowerCase()}`}>{adminLabel(run.status)}</span></td>
                  <td>{adminLabel(run.triggerType)}<small>{run.initiatedBy?.email ?? "Sistema"}</small></td>
                  <td>{run.mode === "DRY_RUN" ? "Simulación" : "Aplicar"}</td>
                  <td>{formatAdminDate(run.queuedAt)}</td>
                  <td>
                    {summaryValue(run.summary, "competitorCount")
                      ? `${summaryValue(run.summary, "competitorCount")} competidores`
                      : "—"}
                  </td>
                  <td>
                    {canRun && run.status === "QUEUED" ? (
                      <form action={processStatisticsRun.bind(null, run.id)}><button type="submit">Procesar</button></form>
                    ) : null}
                    {canRun && run.status === "FAILED" ? (
                      <form action={retryStatisticsRun.bind(null, run.id)}><button type="submit">Reintentar</button></form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!runs.length ? <tr><td colSpan={6}>Todavía no hay ejecuciones.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-table-section">
        <div className="admin-section-heading">
          <div><p className="eyebrow">Estado derivado</p><h2>Ranking por títulos</h2></div>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Competidor</th><th>Títulos</th><th>Subcampeonatos</th><th>Finales</th><th>Individuales</th><th>Grupales</th></tr></thead>
            <tbody>
              {statistics.map((item) => (
                <tr key={item.competitorId}>
                  <td>{item.competitor.subject.displayName}</td>
                  <td>{item.championships}</td>
                  <td>{item.runnerUps}</td>
                  <td>{item.finals}</td>
                  <td>{item.individualTitles}</td>
                  <td>{item.groupTitles}</td>
                </tr>
              ))}
              {!statistics.length ? <tr><td colSpan={6}>Ejecutá una reconstrucción para generar estadísticas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
