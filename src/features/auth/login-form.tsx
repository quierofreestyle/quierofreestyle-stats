"use client";

import { type FormEvent, useState } from "react";

import { createSupabaseBrowserClient } from "./supabase-browser";

function callbackUrl(nextPath: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function loginWithGoogle() {
    setPending(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(nextPath) },
    });

    if (error) {
      setMessage("No pudimos iniciar sesión con Google.");
      setPending(false);
    }
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(nextPath) },
    });

    setMessage(
      error
        ? "No pudimos enviar el enlace. Revisá el correo e intentá nuevamente."
        : "Te enviamos un enlace de acceso. Revisá tu correo.",
    );
    setPending(false);
  }

  return (
    <div className="login-card">
      <button
        className="auth-provider-button"
        disabled={pending}
        onClick={loginWithGoogle}
        type="button"
      >
        Continuar con Google
      </button>
      <div className="login-divider">
        <span>o</span>
      </div>
      <form onSubmit={sendMagicLink}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          autoComplete="email"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@correo.com"
          required
          type="email"
          value={email}
        />
        <button className="primary-action" disabled={pending} type="submit">
          Recibir enlace de acceso
        </button>
      </form>
      {message ? <p className="login-message" role="status">{message}</p> : null}
    </div>
  );
}
