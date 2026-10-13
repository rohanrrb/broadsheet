"use client";

import { useEffect, useRef, useState } from "react";
import type { TiptapDoc } from "@/core/db";
import { browserStorage, clearDraft, loadDraft, saveDraft, type Draft } from "@/editor/draft";
import { trimTrailingEmptyParagraphs } from "@/editor/schema";

const SAVE_DELAY_MS = 500;

export type DraftState =
  | { kind: "idle" }
  | { kind: "saved"; at: number }
  | { kind: "restored"; at: number };

interface DraftOptions {
  storageKey: string;
  /** For edits: the edit count this draft is written against. A draft from before another edit is stale. */
  baseEdits?: number;
  title: string;
  author: string;
  body: TiptapDoc | null;
  /** Fingerprint of "no unsaved changes": the published text, or an empty page. Null until the editor exists. */
  baseline: string | null;
  /** Puts a saved draft back into the editor. */
  restore: (draft: Draft) => void;
}

/** What a draft is compared on: the headline and the body, less the caret's trailing empty lines. */
export function draftFingerprint(title: string, body: TiptapDoc | null): string {
  return JSON.stringify({ title: title.trim(), body: body && trimTrailingEmptyParagraphs(body) });
}

/**
 * Keeps unsaved work in localStorage: restores it once the editor exists,
 * saves shortly after each change, and forgets it when the text is back to
 * its baseline.
 */
export function useDraft(options: DraftOptions) {
  const { storageKey, baseEdits, title, author, body, baseline } = options;
  const [state, setState] = useState<DraftState>({ kind: "idle" });
  const [ready, setReady] = useState(false);
  const callbacks = useRef(options);
  const lastWritten = useRef<string | null>(null);
  /** The save that is waiting out its delay, so that forgetting the draft can call it off. */
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    callbacks.current = options;
  });

  useEffect(() => {
    if (ready || baseline === null) return;
    const storage = browserStorage();
    const draft = loadDraft(storage, storageKey);
    const usable = draft && draft.baseEdits === baseEdits && draftFingerprint(draft.title, draft.body) !== baseline;
    if (usable) {
      callbacks.current.restore(draft);
      lastWritten.current = writtenKey(draft.title, draft.author, draft.body);
      // Syncing from localStorage, which only exists after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ kind: "restored", at: draft.savedAt });
    }
    setReady(true);
  }, [ready, baseline, storageKey, baseEdits]);

  useEffect(() => {
    if (!ready || !body) return;
    const timer = setTimeout(() => {
      const key = writtenKey(title, author, body);
      if (key === lastWritten.current) return;
      lastWritten.current = key;
      const storage = browserStorage();
      if (draftFingerprint(title, body) === baseline) {
        clearDraft(storage, storageKey);
        setState({ kind: "idle" });
        return;
      }
      const savedAt = Date.now();
      saveDraft(storage, storageKey, { title, author, body, savedAt, baseEdits });
      setState({ kind: "saved", at: savedAt });
    }, SAVE_DELAY_MS);
    pending.current = timer;
    return () => clearTimeout(timer);
  }, [ready, title, author, body, baseline, storageKey, baseEdits]);

  const forget = () => {
    // A save still waiting would put back the piece that has just been published.
    clearTimeout(pending.current);
    clearDraft(browserStorage(), storageKey);
    lastWritten.current = null;
    setState({ kind: "idle" });
  };

  return { state, forget };
}

function writtenKey(title: string, author: string, body: TiptapDoc | null): string {
  return JSON.stringify({ fingerprint: draftFingerprint(title, body), author: author.trim() });
}
