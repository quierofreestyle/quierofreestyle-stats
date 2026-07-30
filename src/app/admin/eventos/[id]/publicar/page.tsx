import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { publishEvent } from "../../../_actions/events";
import { adminLabel, formatAdminDate } from "../../../../../features/admin/format";
import { validateEventPublication } from "../../../../../features/admin/event-publication";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
  title: "Publicar evento · Administración",
};
export const dynamic = "force-dynamic";

export default async function PublishAdminEventPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireAdminCapability(["EVENT_PUBLISH"], `/admin/eventos/${id}/publicar`);
  const event = await db.event.findUnique({
    where: { id },
    include: {
      competition: { include: { subject: true } },
      placements: {
        where: { status: "ACTIVE" },
        include: {
          members: {
            include: { competitor: { include: { subject: true } } },
            orderBy: { memberOrder: "asc" },
          },
        },
        orderBy: [{ position: "asc" }, { slot: "asc" }],
      },
    },
  });
  if (!event) notFound();

  const validation = validateEventPublication({
    competitionExists: Boolean(event.competition),
    datePrecision: event.datePrecision,
    format: event.format,
    placements: event.placements.map((placement) => ({
      competitorIds: placement.members.map(({ competitorId }) => competitorId),
      position: placement.position,
      type: placement.type,
    })),
    resolution: event.resolution,
    status: event.status,
  });
  const canPublish = validation.errors.length === 0;

  return (
    <>
      <Link className="admin-back" href={`/admin/eventos/${id}`}>
        ← Volver al evento
      </Link>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Vista previa</p>
          <h1>Publicar {event.title}</h1>
        </div>
        <span className={`admin-pill ${canPublish ? "published" : "draft"}`}>
          {canPublish ? "Listo para publicar" : "Requiere correcciones"}
        </span>
      </header>

      {error ? (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="admin-publication-grid">
        <article className="admin-panel">
          <div className="admin-table-heading">
            <div>
              <p>Validación previa</p>
              <h2>{canPublish ? "Controles aprobados" : "Bloqueos detectados"}</h2>
            </div>
          </div>
          {canPublish ? (
            <ul className="admin-publication-checks">
              <li>La competencia y la fecha están definidas.</li>
              <li>La resolución coincide con los resultados cargados.</li>
              <li>Los integrantes son únicos y respetan el formato.</li>
            </ul>
          ) : (
            <ul className="admin-publication-errors">
              {validation.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-table-heading">
            <div>
              <p>Impacto inmediato</p>
              <h2>Cambios previstos</h2>
            </div>
          </div>
          <dl className="admin-publication-impact">
            <div><dt>Estado</dt><dd>Borrador → Publicado</dd></div>
            <div><dt>Fecha</dt><dd>{formatAdminDate(event.occurredOn)}</dd></div>
            <div><dt>Resultados oficiales</dt><dd>{validation.resultCount}</dd></div>
            <div><dt>Competidores afectados</dt><dd>{validation.participantCount}</dd></div>
            <div><dt>Estadísticas e insignias</dt><dd>Recálculo encolado</dd></div>
            <div><dt>Páginas públicas</dt><dd>Disponibles para actualización</dd></div>
          </dl>
        </article>
      </section>

      <section className="admin-panel admin-publication-preview">
        <div className="admin-table-heading">
          <div>
            <p>Resultado público</p>
            <h2>{adminLabel(event.resolution)}</h2>
          </div>
          <span>{adminLabel(event.format)}</span>
        </div>
        <ol className="admin-placements">
          {event.placements.map((placement) => (
            <li key={placement.id}>
              <span>{placement.position}º · {adminLabel(placement.type)}</span>
              <strong>
                {placement.members
                  .map(
                    (member) =>
                      member.displayNameAtEvent ??
                      member.competitor.subject.displayName,
                  )
                  .join(" · ")}
              </strong>
            </li>
          ))}
        </ol>
      </section>

      <div className="admin-publication-actions">
        {!canPublish && event.status === "DRAFT" ? (
          <Link href={`/admin/eventos/${id}/editar`}>Corregir borrador</Link>
        ) : null}
        <form action={publishEvent.bind(null, id)}>
          <button type="submit" disabled={!canPublish}>
            Confirmar publicación
          </button>
        </form>
      </div>
      <p className="admin-notice">
        La confirmación registra quién publicó y cuándo, y crea la ejecución de
        recálculo dentro de la misma transacción. Las fuentes son opcionales y
        pueden agregarse al borrador cuando exista una URL estable.
      </p>
    </>
  );
}
