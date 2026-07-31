import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { annulEvent } from "../../../_actions/events";
import { requireAdminCapability } from "../../../../../server/auth/permissions";
import { db } from "../../../../../server/db";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = { title: "Anular evento · Administración" };
export const dynamic = "force-dynamic";

export default async function AnnulAdminEventPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireAdminCapability(["EVENT_MANAGE"], `/admin/eventos/${id}/anular`);
  const event = await db.event.findUnique({
    where: { id },
    include: { competition: { include: { subject: true } } },
  });
  if (!event) notFound();
  const canAnnul = ["PUBLISHED", "CORRECTED"].includes(event.status);

  return (
    <>
      <Link className="admin-back" href={`/admin/eventos/${id}`}>← Volver al evento</Link>
      <header className="admin-header">
        <div><p className="eyebrow">Anulación lógica</p><h1>Anular {event.title}</h1></div>
      </header>
      {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
      {!canAnnul ? (
        <p className="admin-form-error">Solo se puede anular un evento publicado o corregido.</p>
      ) : (
        <section className="admin-panel">
          <p>
            El evento dejará de verse en el sitio público. Sus resultados, fuentes y
            auditoría se conservarán, y se encolará una reconstrucción histórica.
          </p>
          <form action={annulEvent.bind(null, id)} className="admin-event-editor">
            <input type="hidden" name="expectedUpdatedAt" value={event.updatedAt.toISOString()} />
            <label>
              Motivo <span className="admin-required">*</span>
              <textarea name="reason" required minLength={10} maxLength={500} />
            </label>
            <div className="admin-form-actions">
              <Link href={`/admin/eventos/${id}`}>Cancelar</Link>
              <button type="submit">Confirmar anulación</button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
