import type { Metadata } from "next";

import { LoginForm } from "../../features/auth/login-form";

export const metadata: Metadata = { title: "Acceso administrativo" };

function safeNextPath(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Panel administrativo</p>
        <h1>Acceso</h1>
        <p>
          Iniciá sesión con una cuenta autorizada. El registro no concede
          permisos administrativos automáticamente.
        </p>
        {params.error ? (
          <p className="auth-error">El enlace no pudo validarse. Intentá nuevamente.</p>
        ) : null}
        <LoginForm nextPath={safeNextPath(params.next)} />
      </section>
    </main>
  );
}
