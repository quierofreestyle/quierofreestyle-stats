import Link from "next/link";

export default function NoAccessPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Permisos insuficientes</p>
        <h1>Sin acceso</h1>
        <p>
          Tu cuenta está autenticada, pero todavía no tiene capacidades
          administrativas asignadas.
        </p>
        <div className="auth-actions">
          <Link className="primary-action" href="/">Volver al sitio</Link>
          <form action="/auth/logout" method="post">
            <button className="secondary-action" type="submit">Cerrar sesión</button>
          </form>
        </div>
      </section>
    </main>
  );
}
