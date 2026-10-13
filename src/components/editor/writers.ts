import type { Identity } from "@/editor/identity";

/** `refused` is true only when the paper answered that the name and key do not match; false when it could not be asked. */
export type WriterReply = { ok: true; identity: Identity } | { ok: false; error: string; refused: boolean };

const OFFLINE = "Couldn't reach the paper. Try again when you're online.";

/** Makes a new pen name (or has one made up, for a blank name) and returns its key, this once. */
export function createWriter(name: string): Promise<WriterReply> {
  return send("/api/writers", { name: name.trim() || undefined }, (data) => data.key ?? "");
}

/** A free pen name to offer a newcomer; blank if the paper cannot be reached. */
export async function suggestName(): Promise<string> {
  try {
    const response = await fetch("/api/writers/suggestion");
    const data = (await response.json()) as { name?: unknown };
    return response.ok && typeof data.name === "string" ? data.name : "";
  } catch {
    return "";
  }
}

/** Checks a pen name and key a returning writer typed in. */
export function verifyWriter(name: string, key: string): Promise<WriterReply> {
  return send("/api/writers/verify", { name, key }, () => key.trim());
}

async function send(
  url: string,
  payload: unknown,
  keyOf: (data: { key?: string }) => string,
): Promise<WriterReply> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { name?: string; key?: string; error?: string };
    if (response.ok && data.name) return { ok: true, identity: { name: data.name, key: keyOf(data) } };
    return { ok: false, error: data.error ?? "That did not go through. Try again.", refused: response.status === 401 };
  } catch {
    return { ok: false, error: OFFLINE, refused: false };
  }
}
