import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInstanceSettings } from "@/core/db";
import { countEdits, getWriting } from "@/core/writings";
import { isEditor } from "@/server/editorSession";
import { getInstance } from "@/server/instance";
import { WritingEditor } from "@/components/editor/WritingEditor";

export async function generateMetadata(props: PageProps<"/w/[id]/edit">): Promise<Metadata> {
  const writing = await findWriting((await props.params).id);
  return { title: writing ? `Editing “${writing.title}”` : "Not found" };
}

export default async function EditWritingPage(props: PageProps<"/w/[id]/edit">) {
  const writing = await findWriting((await props.params).id);
  if (!writing) notFound();
  const db = getInstance();

  return (
    <WritingEditor
      instanceName={getInstanceSettings(db).name}
      target={{
        kind: "edit",
        id: writing.id,
        author: writing.author,
        owner: writing.writerId ? writing.author : null,
        editsUsed: countEdits(db, writing.id),
      }}
      initialTitle={writing.title}
      initialBody={writing.body}
    />
  );
}

/** The writing, unless it does not exist or is spiked; the editor can still open spiked ones. */
async function findWriting(rawId: string) {
  const id = Number(rawId);
  const writing = Number.isSafeInteger(id) && id > 0 ? getWriting(getInstance(), id) : undefined;
  return writing?.spikedAt && !(await isEditor()) ? undefined : writing;
}
