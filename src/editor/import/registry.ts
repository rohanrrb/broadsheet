import { docxImporter } from "./docx";
import { htmlImporter } from "./html";
import { markdownImporter } from "./markdown";
import { textImporter } from "./text";
import type { ImportedWriting, Importer, ImportSource } from "./types";

/** Every format the editor can import. New formats slot in here. */
export const IMPORTERS: readonly Importer[] = [markdownImporter, textImporter, docxImporter, htmlImporter];

export class UnsupportedFileError extends Error {
  constructor(readonly fileName: string) {
    super(`“${fileName}” can't be imported. Try ${describeFormats()}.`);
    this.name = "UnsupportedFileError";
  }
}

export function findImporter(fileName: string, importers: readonly Importer[] = IMPORTERS): Importer | null {
  const name = fileName.toLowerCase();
  return importers.find((imp) => imp.extensions.some((ext) => name.endsWith(ext))) ?? null;
}

export async function importFile(source: ImportSource, importers: readonly Importer[] = IMPORTERS): Promise<ImportedWriting> {
  const importer = findImporter(source.name, importers);
  if (!importer) throw new UnsupportedFileError(source.name);
  return importer.read(source);
}

/** For `<input type="file" accept=…>`. */
export function acceptAttribute(importers: readonly Importer[] = IMPORTERS): string {
  return importers.flatMap((imp) => imp.extensions).join(",");
}

/** ".md, .txt, .docx or .html" */
export function describeFormats(importers: readonly Importer[] = IMPORTERS): string {
  const names = importers.map((imp) => imp.extensions[0]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}` : names.join("");
}
