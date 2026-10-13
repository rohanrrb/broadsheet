import type { TiptapDoc } from "@/core/db";
import type { Identity } from "@/editor/identity";

export type EditorTarget =
  | { kind: "new" }
  | {
      kind: "edit";
      id: number;
      author: string;
      /** The pen name that owns the piece; null if it predates pen names. */
      owner: string | null;
      /** How many times it has been edited: a draft made before another edit is not offered back. */
      editsUsed: number;
    };

export type SubmitResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Publishes or saves an edit as `identity`. The headline and body are sent
 * with the writer's pen name and key; the byline is the writer's name, and
 * dates belong to broadsheet.
 */
export async function submitWriting(
  target: EditorTarget,
  writing: { title: string; body: TiptapDoc },
  identity: Identity | null,
): Promise<SubmitResult> {
  const payload = { ...writing, name: identity?.name, key: identity?.key };
  const request =
    target.kind === "new"
      ? { url: "/api/writings", method: "POST", payload }
      : { url: `/api/writings/${target.id}`, method: "PATCH", payload };
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.payload),
    });
    const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (response.ok && data.url) return { ok: true, url: data.url };
    return { ok: false, error: data.error ?? FALLBACK_ERROR };
  } catch {
    return { ok: false, error: OFFLINE_ERROR };
  }
}

const FALLBACK_ERROR = "Something went wrong. Your draft is kept in this browser; try again.";
const OFFLINE_ERROR = "Couldn't reach the paper. Your draft is kept in this browser; try again when you're online.";
