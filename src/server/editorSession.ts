import { cookies } from "next/headers";
import { getInstanceSettings } from "@/core/db";
import { editorAccess, type EditorAccess } from "./editorKey";
import { SESSION_DAYS, closeAllSessions, closeSession, isOpenSession, openSession } from "./editorSessions";
import { getInstance } from "./instance";

const COOKIE = "broadsheet_editor";

/** How this instance's desk is opened: by the host's key, a claimed key, or not yet at all. */
export function currentAccess(): EditorAccess {
  return editorAccess(getInstanceSettings(getInstance()).editorKeyHash);
}

/** Whether this request comes from the instance's signed-in editor. */
export async function isEditor(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  return isOpenSession(getInstance(), token, currentAccess());
}

/** Call only after the key has been checked. Route handlers only: it sets a cookie. */
export async function startEditorSession(): Promise<void> {
  const token = openSession(getInstance(), currentAccess());
  if (!token) return;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

/**
 * Ends this browser's session, in the paper as well as in the browser. The
 * signed-in editor can end all of them at once, which is how a browser that
 * has fallen into other hands is shut out.
 */
export async function endEditorSession({ everywhere = false } = {}): Promise<void> {
  const jar = await cookies();
  if (everywhere && (await isEditor())) closeAllSessions(getInstance());
  else closeSession(getInstance(), jar.get(COOKIE)?.value, currentAccess());
  jar.delete(COOKIE);
}
