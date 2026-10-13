import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { getInstanceSettings } from "@/core/db";
import { getInstance } from "@/server/instance";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The nameplate's blackletter, as a file: an image cannot use the page's web font. */
const NAMEPLATE_FONT = path.join(process.cwd(), "src/app/fonts/UnifrakturMaguntia.ttf");
/** The paper and ink of `globals.css`. */
const PAPER = "#f3efe6";
const INK = "#141311";

/**
 * The paper's icon in a browser tab: the first letter of its name, set in the
 * nameplate's type. It follows the name, so a paper renamed at the desk has
 * its new letter on the next request.
 */
export default async function Icon() {
  await connection();
  const letter = Array.from(getInstanceSettings(getInstance()).name.trim())[0] ?? "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PAPER,
          color: INK,
          fontFamily: "Nameplate",
          fontSize: 58,
          lineHeight: 1,
          // The line leaves room under the letter for descenders it does not have; this centers the letter itself.
          paddingTop: 5,
        }}
      >
        {letter}
      </div>
    ),
    { ...size, fonts: [{ name: "Nameplate", data: await readFile(NAMEPLATE_FONT), weight: 400, style: "normal" }] },
  );
}
