import type { Placement } from "@/desk/folders";

export type DeskReply = { ok: true } | { ok: false; error: string };

const OFFLINE = "Could not reach the paper. Check your connection and try again.";

export function signIn(key: string): Promise<DeskReply> {
  return send("/api/desk/session", "POST", { key });
}

export function claimPaper(code: string, key: string): Promise<DeskReply> {
  return send("/api/desk/claim", "POST", { code, key });
}

export function signOut({ everywhere = false } = {}): Promise<DeskReply> {
  return send(everywhere ? "/api/desk/session?everywhere" : "/api/desk/session", "DELETE");
}

/** The paper's name and own words; only the fields given are changed. */
export interface PaperCopy {
  name: string;
  earLeft: string;
  earRight: string;
  about: string;
  agents: string;
  comicImage: string;
  comicLink: string;
  comicCredit: string;
}

export function savePaper(changes: Partial<PaperCopy>): Promise<DeskReply> {
  return send("/api/desk/instance", "PATCH", changes);
}

export function moveInFeed(id: number, placement: Placement): Promise<DeskReply> {
  return send(`/api/desk/writings/${id}/move`, "POST", placement);
}

export function setSpiked(id: number, spiked: boolean): Promise<DeskReply> {
  return send(`/api/desk/writings/${id}`, "PATCH", { spiked });
}

/** Puts a writing on the cover, or takes it off and leaves the cover to the layout. */
export function setCover(id: number, cover: boolean): Promise<DeskReply> {
  return send(`/api/desk/writings/${id}`, "PATCH", { cover });
}

async function send(url: string, method: string, payload?: unknown): Promise<DeskReply> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    if (response.ok) return { ok: true };
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? "That did not go through. Try again." };
  } catch {
    return { ok: false, error: OFFLINE };
  }
}
