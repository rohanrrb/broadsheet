import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DeskFile } from "@/desk/files";
import { moveFile, type Placement } from "@/desk/folders";
import { moveInFeed, setCover, setSpiked, type DeskReply } from "./api";

/**
 * The desk's files, with the editor's changes shown at once and then
 * confirmed by the server: every change ends by re-reading the instance, so
 * pages and the cover (which the layout decides when the editor has not) catch
 * up, and a refused change is undone. One change runs at a time; `busy` covers
 * it.
 */
export function useDeskFiles(serverFiles: DeskFile[]) {
  const router = useRouter();
  const [files, setFiles] = useState(serverFiles);
  const [confirmed, setConfirmed] = useState(serverFiles);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  if (confirmed !== serverFiles) {
    setConfirmed(serverFiles);
    setFiles(serverFiles);
  }

  async function change(optimistic: DeskFile[], request: () => Promise<DeskReply>) {
    setError(null);
    setFiles(optimistic);
    setSending(true);
    const reply = await request();
    setSending(false);
    if (!reply.ok) setError(reply.error);
    startRefresh(() => router.refresh());
  }

  return {
    files,
    error,
    busy: sending || refreshing,
    move: (id: number, placement: Placement) =>
      change(moveFile(files, id, placement), () => moveInFeed(id, placement)),
    spike: (id: number, spiked: boolean) =>
      change(
        files.map((f) => (f.id === id ? { ...f, spiked, rank: null, page: null, cover: false } : f)),
        () => setSpiked(id, spiked),
      ),
    cover: (id: number, cover: boolean) =>
      change(
        files.map((f) => (f.id === id ? { ...f, cover, pinned: cover } : { ...f, cover: cover ? false : f.cover, pinned: false })),
        () => setCover(id, cover),
      ),
  };
}
