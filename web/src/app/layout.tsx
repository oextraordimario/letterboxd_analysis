import type { Metadata } from "next";
import { Big_Shoulders, DM_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({ subsets: ["latin"], weight: ["500", "800", "900"], variable: "--font-display", adjustFontFallback: false });
const body = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-body" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "FFF — Família Fã de Filmes",
  description: "Retrospectiva do nosso clube do filme: o que vimos, quem mais apareceu e onde a gente discorda do resto do mundo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
