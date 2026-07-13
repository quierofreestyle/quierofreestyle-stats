import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Quiero Freestyle Stats | Alta Gracia",
    template: "%s | Quiero Freestyle Stats",
  },
  description:
    "Rankings, campeones, competencias y estadísticas históricas del freestyle de Alta Gracia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
