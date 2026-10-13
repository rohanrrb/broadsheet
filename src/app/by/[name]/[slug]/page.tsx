import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findWriter } from "@/core/writers";
import { getWritingBySlug, type Writing } from "@/core/writings";
import { getInstance } from "@/server/instance";
import { placeIn } from "@/feed/place";
import { PiecePage, inPrint } from "@/components/PiecePage";

export async function generateMetadata(props: PageProps<"/by/[name]/[slug]">): Promise<Metadata> {
  const writing = await findWriting(props.params);
  return { title: writing?.title ?? "Not found" };
}

/** A writer's piece, at the address it was given when published: their name, then its headline. */
export default async function WriterPiecePage(props: PageProps<"/by/[name]/[slug]">) {
  const writing = await findWriting(props.params);
  if (!writing) notFound();
  return <PiecePage writing={writing} place={placeIn((await props.searchParams).at)} />;
}

async function findWriting(params: Promise<{ name: string; slug: string }>): Promise<Writing | undefined> {
  const { name, slug } = await params;
  const db = getInstance();
  const writer = findWriter(db, decodeURIComponent(name));
  return inPrint(writer && getWritingBySlug(db, writer.id, decodeURIComponent(slug)));
}
