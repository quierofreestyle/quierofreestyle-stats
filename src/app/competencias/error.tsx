"use client";

export default function CompetitionsError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="page-shell content-page">
      <section className="empty-state error-state">
        <p className="eyebrow">Error de conexión</p>
        <h1>No pudimos cargar las competencias</h1>
        <p>
          La información sigue segura. Podés volver a intentar la consulta.
        </p>
        <button type="button" onClick={reset}>
          Reintentar
        </button>
      </section>
    </main>
  );
}
