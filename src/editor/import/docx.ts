import { htmlToWriting } from "./html";
import type { ImportedWriting, Importer } from "./types";

/** Word styles that should become headings the title logic understands. */
const STYLE_MAP = ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh"];

/**
 * Word (.docx) to a broadsheet document: mammoth renders semantic HTML, which the
 * HTML importer reads. Embedded pictures are dropped: an import keeps only
 * photos that have a web address. mammoth is loaded on first use; it is large.
 */
export async function docxToWriting(data: ArrayBuffer): Promise<ImportedWriting> {
  const { default: mammoth } = await import("mammoth");
  const result = await mammoth.convertToHtml(mammothInput(data), {
    styleMap: STYLE_MAP,
    convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
  });
  return htmlToWriting(result.value);
}

export const docxImporter: Importer = {
  label: "Word",
  extensions: [".docx"],
  read: async (source) => docxToWriting(await source.arrayBuffer()),
};

/**
 * mammoth's browser build reads `arrayBuffer`, its Node build (tests, server)
 * reads `buffer`; both accept the same bytes, so give it both.
 */
function mammothInput(data: ArrayBuffer): { arrayBuffer: ArrayBuffer } {
  return { arrayBuffer: data, buffer: data } as { arrayBuffer: ArrayBuffer };
}
