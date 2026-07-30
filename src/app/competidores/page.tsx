import type { Metadata } from "next";

import { CompetitorBrowser } from "../../features/competitors/competitor-browser";
import {
  toPublicCompetitors,
  type PublicCompetitorSource,
} from "../../features/competitors/public-competitor";
import { listPublicCompetitors } from "../../server/queries/public-competitors";

export const metadata: Metadata = {
  title: "Competidores",
  description:
    "Perfiles, títulos y finales de competidores de freestyle.",
};

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const data = await listPublicCompetitors();
  const competitors = toPublicCompetitors(
    data as unknown as PublicCompetitorSource[],
  );

  return (
    <main className="page-shell content-page">
      <section className="page-intro">
        <p className="eyebrow">Protagonistas del archivo</p>
        <h1>Competidores</h1>
        <p>
          Explorá perfiles, alias y resultados publicados de finalistas y
          campeones del freestyle.
        </p>
      </section>

      {competitors.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Archivo en construcción</p>
          <h2>Todavía no hay competidores publicados</h2>
          <p>Los primeros perfiles activos aparecerán en esta página.</p>
        </section>
      ) : (
        <CompetitorBrowser competitors={competitors} />
      )}
    </main>
  );
}
