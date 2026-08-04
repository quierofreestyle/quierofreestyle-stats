import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { findPublicBadge } from "../../../server/queries/public-badges";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

const kindLabels: Record<string, string> = {
  ACHIEVEMENT: "De logro",
  TIERED: "Por niveles",
  UNIQUE: "Única",
  EDITORIAL: "Editorial",
};

const scopeLabels: Record<string, string> = {
  GLOBAL: "Global",
  COMPETITION: "Por competencia",
  ORGANIZATION: "Por organización",
  SEASON: "Por temporada",
  REGION: "Por región",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const badge = await findPublicBadge((await params).slug);
  if (!badge) return { title: "Insignia no encontrada" };
  return { title: badge.displayName, description: badge.description };
}

export default async function PublicBadgePage({ params }: Props) {
  const badge = await findPublicBadge((await params).slug);
  if (!badge) notFound();

  const tiers = badge.definition.ruleVersions[0]?.tiers ?? [];
  const progressByRecipient = new Map(
    badge.progress.map((progress) => [progress.recipientSubjectId, progress]),
  );
  const updatedLabel = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(badge.updatedAt);

  return (
    <main className="page-shell content-page badge-detail-page">
      <Link className="back-link" href="/competidores">
        <span aria-hidden>←</span> Volver a competidores
      </Link>

      <section className="badge-detail-hero">
        <span
          className="public-badge-art badge-detail-art"
          role="img"
          aria-label={`Insignia ${badge.displayName}`}
          style={badge.definition.imageUrl ? { backgroundImage: `url(${badge.definition.imageUrl})` } : undefined}
        >
          {!badge.definition.imageUrl ? badge.displayName.slice(0, 2).toUpperCase() : null}
        </span>
        <div>
          <p className="eyebrow">Insignia {kindLabels[badge.definition.kind] ?? badge.definition.kind}</p>
          <h1>{badge.displayName}</h1>
          <p>{badge.description}</p>
          <div className="badge-detail-tags">
            <span>{scopeLabels[badge.scope?.scopeType ?? "GLOBAL"] ?? badge.scope?.scopeType}</span>
            {badge.status === "ARCHIVED" ? <span>Discontinuada</span> : <span>Activa</span>}
          </div>
        </div>
      </section>

      <section className="badge-public-rule">
        <p className="eyebrow">Cómo se obtiene</p>
        <h2>Regla pública</h2>
        <p>{badge.definition.publicRule}</p>
      </section>

      {tiers.length ? (
        <section className="badge-levels">
          <div className="section-heading">
            <p className="eyebrow">Escala de progreso</p>
            <h2>Niveles</h2>
          </div>
          <ol className="badge-level-list">
            {tiers.map((tier) => (
              <li key={tier.id}>
                <span
                  className="public-badge-art badge-level-art"
                  role="img"
                  aria-label={`Nivel ${tier.displayName}`}
                  style={tier.imageUrl ? { backgroundImage: `url(${tier.imageUrl})` } : { color: tier.color ?? undefined }}
                >
                  {!tier.imageUrl ? tier.rank : null}
                </span>
                <div>
                  <span>Nivel {tier.rank}</span>
                  <h3 style={tier.color ? { color: tier.color } : undefined}>{tier.displayName}</h3>
                  <p>Se alcanza con {Number(tier.threshold)}.</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="badge-holders">
        <div className="section-heading">
          <p className="eyebrow">Logros vigentes</p>
          <h2>Personas que la obtuvieron</h2>
        </div>
        {badge.awards.length ? (
          <ol className="badge-holder-list">
            {badge.awards.map((award) => {
              const progress = progressByRecipient.get(award.recipient.id);
              return (
                <li key={`${award.recipient.id}-${award.awardedOn.toISOString()}`}>
                  <div>
                    <h3>
                      {award.recipient.type === "COMPETITOR" ? (
                        <Link href={`/competidores/${award.recipient.slug}`}>{award.recipient.displayName}</Link>
                      ) : award.recipient.displayName}
                    </h3>
                    <p>Obtenida el {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" }).format(award.awardedOn)}</p>
                  </div>
                  {progress?.currentTier ? (
                    <strong style={progress.currentTier.color ? { color: progress.currentTier.color } : undefined}>
                      {progress.currentTier.displayName} · {Number(progress.metricValue)}
                    </strong>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <section className="empty-state"><h3>Todavía no tiene poseedores</h3></section>
        )}
      </section>

      <p className="badge-updated-at">Última actualización: {updatedLabel}</p>
    </main>
  );
}
