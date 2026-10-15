import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, UnifrakturMaguntia } from "next/font/google";
import { connection } from "next/server";
import { getInstanceSettings } from "@/core/db";
import { getInstance } from "@/server/instance";
import { TileClicks } from "@/components/TileClicks";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const body = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

/** Blackletter for the nameplate only, as newspapers have long set theirs. */
const nameplate = UnifrakturMaguntia({
  variable: "--font-nameplate",
  subsets: ["latin"],
  weight: "400",
});

/** Every page is titled after the paper it belongs to, whatever its editor has named it. */
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { name } = getInstanceSettings(getInstance());
  return {
    title: { default: name, template: `%s · ${name}` },
    description: "A newspaper anyone can write for, set fresh on every page.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${nameplate.variable}`}>
      <body>
        {children}
        <TileClicks />
      </body>
    </html>
  );
}
