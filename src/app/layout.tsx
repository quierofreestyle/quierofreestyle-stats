import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Quiero Freestyle Stats | Alta Gracia",
    template: "%s | Quiero Freestyle Stats",
  },
  description:
    "Rankings, campeones, competencias y estadísticas históricas del freestyle.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            <span className="brand-mark">QF</span>
            <span>
              Quiero Freestyle
              <small>Stats</small>
            </span>
          </Link>
          <nav aria-label="Navegación principal">
            <Link href="/competencias">Competencias</Link>
            <Link href="/eventos">Eventos</Link>
            <Link href="/competidores">Competidores</Link>
            <Link href="/ranking">Ranking</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <span>Quiero Freestyle Stats</span>
          <span>Historia, resultados y cultura freestyle.</span>
        </footer>
      </body>
    </html>
  );
}
