"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MAX_NOTICE_WORDS, countWords } from "@/core/notices/limits";
import { handleOf } from "@/core/writers/handle";
import type { Identity } from "@/editor/identity";
import { useIdentity } from "./editor/useIdentity";
import styles from "./BulletinBoard.module.css";

export interface BoardNotice {
  id: number;
  text: string;
  /** The day it was posted, as printed, and as a machine reads it. */
  date: string;
  dateTime: string;
}

interface BulletinBoardProps {
  notices: BoardNotice[];
  /** Whose board this is; none for the paper's own. */
  writer?: string;
  /** Whether the reader is the paper's editor. */
  editor: boolean;
}

/**
 * A bulletin: short notices, newest first, each with its date. The writer
 * whose board it is can post to it and take notices down, in their own
 * browser; the editor does the same for the paper's, and can take a notice
 * off anyone's.
 */
export function BulletinBoard({ notices, writer, editor }: BulletinBoardProps) {
  const router = useRouter();
  const identity = useIdentity();
  const own = writer && identity && handleOf(identity.name) === handleOf(writer) ? identity : null;
  const canPost = own !== null || (!writer && editor);
  const canRemove = own !== null || editor;
  const [error, setError] = useState("");

  async function change(send: () => Promise<Response>): Promise<boolean> {
    setError("");
    try {
      const response = await send();
      if (response.ok) {
        router.refresh();
        return true;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "That did not go through.");
    } catch {
      setError("Couldn't reach the paper.");
    }
    return false;
  }

  return (
    <>
      {canPost && <PostForm post={(text) => change(() => post(text, own))} />}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notices.length === 0 ? (
        <p className={styles.none}>Nothing posted.</p>
      ) : (
        <ol className={styles.notices}>
          {notices.map((notice) => (
            <li key={notice.id}>
              <p>{notice.text}</p>
              <span className={styles.meta}>
                <time dateTime={notice.dateTime}>{notice.date}</time>
                {canRemove && (
                  <button type="button" className={styles.remove} onClick={() => change(() => remove(notice.id, own))}>
                    Remove
                  </button>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function PostForm({ post }: { post: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const words = countWords(text);
  const over = words > MAX_NOTICE_WORDS;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    if (await post(text)) setText("");
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        className={styles.field}
        aria-label="New notice"
        rows={2}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className={styles.formEnd}>
        <span className={over ? styles.over : styles.count}>
          {words}/{MAX_NOTICE_WORDS}
        </span>
        <button type="submit" className={styles.post} disabled={busy || words === 0 || over}>
          Post
        </button>
      </div>
    </form>
  );
}

/** As the writer whose board it is, with their name and key; otherwise as the editor, by the desk's cookie. */
function post(text: string, own: Identity | null): Promise<Response> {
  return own ? send("/api/notices", "POST", { ...own, text }) : send("/api/desk/notices", "POST", { text });
}

function remove(id: number, own: Identity | null): Promise<Response> {
  return own ? send(`/api/notices/${id}`, "DELETE", own) : send(`/api/desk/notices/${id}`, "DELETE", {});
}

function send(url: string, method: string, payload: unknown): Promise<Response> {
  return fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}
