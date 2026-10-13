import type { Metadata } from "next";
import { connection } from "next/server";
import { getInstanceSettings } from "@/core/db";
import { getInstance } from "@/server/instance";
import { sourceUrl } from "@/server/source";
import { PaperNote } from "@/components/PaperNote";

export const metadata: Metadata = { title: "About" };

/**
 * The editor's own account of the paper, then the one line every instance
 * carries: what software it is, and that anyone can run it.
 */
export default async function AboutPage() {
  // The paper's words live in SQLite: read them per request, not at build time.
  await connection();
  const { name, about } = getInstanceSettings(getInstance());

  return (
    <PaperNote name={name} title="About" markdown={about}>
      <p>
        {name} is a <a href={sourceUrl()}>broadsheet</a> instance. You can have your own too!
      </p>
    </PaperNote>
  );
}
