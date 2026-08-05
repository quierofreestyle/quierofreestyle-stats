import type { Metadata } from "next";

import { PublicBadgeBrowser } from "../../features/badges/public-badge-browser";
import {
  toPublicBadgeCatalogItem,
  type PublicBadgeCatalogSource,
} from "../../features/badges/public-badge-catalog";
import { listPublicBadges } from "../../server/queries/public-badges";

export const metadata: Metadata = {
  title: "Insignias",
  description: "Explorá las insignias y reconocimientos de Quiero Freestyle Stats.",
};

export const dynamic = "force-dynamic";

export default async function PublicBadgesPage() {
  const data = await listPublicBadges();
  const badges = (data as unknown as PublicBadgeCatalogSource[]).map(toPublicBadgeCatalogItem);

  return (
    <main className="page-shell content-page badge-catalog-page">
      <section className="page-intro">
        <p className="eyebrow">Reconocimientos del freestyle</p>
        <h1>Insignias</h1>
        <p>
          Descubrí los logros, distinciones únicas y recorridos por niveles que
          forman parte del registro de Quiero Freestyle.
        </p>
      </section>

      {badges.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Catálogo en construcción</p>
          <h2>Todavía no hay insignias publicadas</h2>
          <p>Las insignias activas y discontinuadas aparecerán en esta página.</p>
        </section>
      ) : <PublicBadgeBrowser badges={badges} />}
    </main>
  );
}
