import type { Metadata } from "next";
import Link from "next/link";

import { setBadgeVisibility } from "../_actions/badge-visibility";
import { requireAuthenticatedUser } from "../../../server/auth/permissions";
import { findManagedBadgeProfiles } from "../../../server/queries/profile-badge-settings";

export const metadata: Metadata = { title: "Mis insignias" };
export const dynamic = "force-dynamic";

export default async function BadgeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireAuthenticatedUser("/mi-perfil/insignias");
  const profiles = await findManagedBadgeProfiles(user.id);
  const params = await searchParams;

  return (
    <main className="page-shell content-page badge-settings-page">
      <header className="badge-settings-header">
        <div>
          <p className="eyebrow">Mi perfil</p>
          <h1>Mis insignias</h1>
          <p>Elegí cuáles de tus logros querés destacar en tu perfil público.</p>
        </div>
        <form action="/auth/logout" method="post">
          <button className="secondary-action" type="submit">Cerrar sesión</button>
        </form>
      </header>

      {params.success ? (
        <p className="profile-settings-message" role="status">
          La visibilidad se actualizó correctamente.
        </p>
      ) : null}
      {params.error ? (
        <p className="auth-error" role="alert">
          Esa insignia ya no está vigente o no pertenece a tu perfil.
        </p>
      ) : null}

      {!profiles.length ? (
        <section className="empty-state">
          <h2>Todavía no administrás un perfil</h2>
          <p>Tu cuenta debe estar vinculada a un competidor para configurar sus insignias.</p>
        </section>
      ) : profiles.map((profile) => (
        <section className="managed-badge-profile" key={profile.id}>
          <div className="section-heading badge-settings-profile-heading">
            <div><p className="eyebrow">Competidor</p><h2>{profile.name}</h2></div>
            <Link href={`/competidores/${profile.slug}`}>Ver perfil público →</Link>
          </div>

          {profile.badges.length ? (
            <div className="badge-visibility-list">
              {profile.badges.map((badge) => (
                <article className="badge-visibility-item" key={badge.id}>
                  <span
                    className="public-badge-art badge-visibility-art"
                    role="img"
                    aria-label={`Insignia ${badge.name}`}
                    style={badge.imageUrl ? { backgroundImage: `url(${badge.imageUrl})` } : undefined}
                  >{!badge.imageUrl ? badge.name.slice(0, 2).toUpperCase() : null}</span>
                  <div>
                    <p className="public-badge-tier">
                      {badge.tierName ? `Nivel ${badge.tierName}` : "Insignia obtenida"}
                    </p>
                    <h3><Link href={badge.href}>{badge.name}</Link></h3>
                    <p>{badge.description}</p>
                    {badge.isArchived ? <span className="archived-label">Discontinuada</span> : null}
                  </div>
                  <form action={setBadgeVisibility.bind(null, profile.id, badge.id, !badge.isVisible)}>
                    <button
                      aria-checked={badge.isVisible}
                      className="visibility-switch"
                      role="switch"
                      type="submit"
                    >
                      <span aria-hidden />
                      {badge.isVisible ? "Visible" : "Oculta"}
                    </button>
                    <small>{badge.isVisible ? "Se muestra en tu perfil" : "Solo permanece en el registro público"}</small>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <section className="empty-state badge-empty-state">
              <h3>Todavía no obtuviste insignias</h3>
              <p>Cuando alcances una regla activa, podrás decidir si mostrarla aquí.</p>
            </section>
          )}
        </section>
      ))}
    </main>
  );
}
