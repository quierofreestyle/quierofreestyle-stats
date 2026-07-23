import type { Metadata } from "next";

import { CompetitionBrowser } from "../../features/competitions/competition-browser";
import {
  toPublicCompetitions,
  type CompetitionSource,
} from "../../features/competitions/model";
import { listPublicCompetitions } from "../../server/queries/public-competitions";

export const metadata: Metadata = {
  title: "Competencias",
  description:
    "Explorá competencias de freestyle, sus eventos y campeones históricos.",
};

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const data = await listPublicCompetitions();
  const competitions = toPublicCompetitions(data as CompetitionSource[]);

  return (
    <main className="page-shell content-page">
      <section className="page-intro">
        <p className="eyebrow">Archivo competitivo</p>
        <h1>Competencias</h1>
        <p>
          Consultá el historial publicado de cada competencia, desde las
          primeras ediciones hasta sus campeones más recientes.
        </p>
      </section>

      {competitions.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Archivo en construcción</p>
          <h2>Todavía no hay competencias publicadas</h2>
          <p>
            Cuando se publique la primera competencia, su historial aparecerá
            en esta página.
          </p>
        </section>
      ) : (
        <CompetitionBrowser competitions={competitions} />
      )}
    </main>
  );
}
