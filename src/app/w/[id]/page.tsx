import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getWriting, pieceHref, type Writing } from "@/core/writings";
import { getInstance } from "@/server/instance";
import { placeIn } from "@/feed/place";
import { PiecePage, inPrint } from "@/components/PiecePage";

export async function generateMetadata(props: PageProps<"/w/[id]">): Promise<Metadata> {
  const writing = await findWriting(props.params);
  return { title: writing?.title ?? "Not found" };
}

/**
 * A piece by its number. A writer's piece is read under their page, and this
 * address leads there; only a piece from before pen names is read here.
 */
export default async function WritingPage(props: PageProps<"/w/[id]">) {
  const writing = await findWriting(props.params);
  if (!writing) notFound();
  const href = pieceHref(writing);
  if (href !== `/w/${writing.id}`) permanentRedirect(href);
  return <PiecePage writing={writing} place={placeIn((await props.searchParams).at)} />;
}

function findWriting(params: Promise<{ id: string }>): Promise<Writing | undefined> {
  return params.then(({ id }) => {
    const n = Number(id);
    return inPrint(Number.isSafeInteger(n) && n > 0 ? getWriting(getInstance(), n) : undefined);
  });
}
