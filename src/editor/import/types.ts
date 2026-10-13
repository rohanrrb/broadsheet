import type { TiptapDoc } from "@/core/db";

/** What an importer hands the editor: a body, and a title if the file had one. */
export interface ImportedWriting {
  title: string | null;
  body: TiptapDoc;
}

/** The parts of a browser `File` importers read. Easy to fake in tests. */
export interface ImportSource {
  name: string;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** One file format. Add a new one by writing an Importer and listing it in the registry. */
export interface Importer {
  /** Shown to writers, e.g. "Markdown". */
  label: string;
  /** Lower-case, with the dot: [".md", ".markdown"]. */
  extensions: readonly string[];
  read(source: ImportSource): Promise<ImportedWriting>;
}
