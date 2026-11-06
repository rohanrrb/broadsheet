"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { MAX_COMMENT_WORDS, countCommentWords } from "@/core/comments/limits";
import type { CommentOrder } from "@/core/comments/comments";
import { handleOf } from "@/core/writers/handle";
import type { Identity } from "@/editor/identity";
import type { CommentPageView, CommentView } from "@/server/comments";
import { useIdentity } from "./editor/useIdentity";
import styles from "./CommentColumn.module.css";

interface CommentColumnProps {
  writingId: number;
  /** The first page, newest first, as the server read it. */
  first: CommentPageView;
  count: number;
  /** Whether the reader is the paper's editor, who can take any comment down. */
  editor: boolean;
  /** The piece's own address, to come back to after signing in. */
  here: string;
}

const ORDERS: readonly [CommentOrder, string][] = [
  ["newest", "Newest"],
  ["oldest", "Oldest"],
];

/**
 * What readers say about a piece, set as a column beside it: newest first or
 * oldest first, the next page fetched as the reader nears the foot. A writer
 * signed in in this browser can add to it and take their own down; the editor
 * can take any down.
 */
export function CommentColumn({ writingId, first, count, editor, here }: CommentColumnProps) {
  const identity = useIdentity();
  const awake = useSyncExternalStore(never, () => true, () => false);
  const [order, setOrder] = useState<CommentOrder>("newest");
  const [comments, setComments] = useState(first.comments);
  const [next, setNext] = useState(first.next);
  const [total, setTotal] = useState(count);
  const [error, setError] = useState("");
  const loading = useRef(false);
  /** Bumped when the order changes, so a page fetched for the old order is dropped. */
  const run = useRef(0);
  const foot = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (wanted: CommentOrder, after: number | null) => {
      const mine = ++run.current;
      loading.current = true;
      const query = new URLSearchParams({ order: wanted, ...(after === null ? {} : { after: String(after) }) });
      try {
        const response = await fetch(`/api/writings/${writingId}/comments?${query}`);
        if (!response.ok) throw new Error();
        const page = (await response.json()) as CommentPageView;
        if (mine !== run.current) return;
        setComments((shown) => (after === null ? page.comments : [...shown, ...page.comments]));
        setNext(page.next);
      } catch {
        if (mine === run.current) setError("Couldn't reach the paper.");
      } finally {
        if (mine === run.current) loading.current = false;
      }
    },
    [writingId],
  );

  // The next page is fetched as the foot of the column comes near, whether the column or the page is scrolling.
  useEffect(() => {
    const target = foot.current;
    if (!target || next === null) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading.current) load(order, next);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [load, next, order]);

  function reorder(wanted: CommentOrder) {
    if (wanted === order) return;
    setOrder(wanted);
    setComments([]);
    setNext(null);
    setError("");
    load(wanted, null);
  }

  function posted(comment: CommentView) {
    setTotal((n) => n + 1);
    if (order === "newest") setComments((shown) => [comment, ...shown]);
    else if (next === null) setComments((shown) => [...shown, comment]);
  }

  async function remove(comment: CommentView, own: Identity | null) {
    setError("");
    try {
      const response = own
        ? await send(`/api/comments/${comment.id}`, "DELETE", own)
        : await send(`/api/desk/comments/${comment.id}`, "DELETE", {});
      if (!response.ok && response.status !== 404) {
        setError(await errorOf(response));
        return;
      }
      setComments((shown) => shown.filter((c) => c.id !== comment.id));
      setTotal((n) => Math.max(0, n - 1));
    } catch {
      setError("Couldn't reach the paper.");
    }
  }

  const ownerOf = (comment: CommentView) =>
    identity && handleOf(identity.name) === handleOf(comment.author) ? identity : null;

  return (
    <section className={styles.column} aria-label="Comments">
      <h2 className={styles.title}>Comments</h2>
      <p className={styles.folio}>
        <span className={styles.count}>{total > 0 && total}</span>
        {total > 1 && (
          <span className={styles.orders}>
            {ORDERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={styles.order}
                aria-pressed={order === value}
                onClick={() => reorder(value)}
              >
                {label}
              </button>
            ))}
          </span>
        )}
      </p>
      <div className={styles.compose} style={awake ? undefined : { visibility: "hidden" }}>
        {identity ? (
          <CommentForm writingId={writingId} identity={identity} onPosted={posted} />
        ) : (
          <Link href={`/me?then=${encodeURIComponent(here)}`} className={styles.signIn}>
            Sign in to comment
          </Link>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ol className={styles.comments}>
        {comments.map((comment) => {
          const own = ownerOf(comment);
          return (
            <li key={comment.id} className={styles.comment}>
              <div className={styles.text}>
                {comment.text.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{i === 0 ? <Lede paragraph={paragraph} /> : paragraph}</p>
                ))}
              </div>
              <p className={styles.signoff}>
                <Link href={comment.href} className={styles.author}>
                  {comment.author}
                </Link>
                <time dateTime={comment.dateTime}>{comment.date}</time>
                {(own || editor) && (
                  <button type="button" className={styles.remove} onClick={() => remove(comment, own)}>
                    Remove
                  </button>
                )}
              </p>
            </li>
          );
        })}
      </ol>
      <div ref={foot} className={styles.foot} />
    </section>
  );
}

/** A comment's opening words set in small caps, run into the rest, as a newspaper opens a story. */
function Lede({ paragraph }: { paragraph: string }) {
  const [, lede, rest] = /^(\S+(?:\s+\S+){0,2})([\s\S]*)$/.exec(paragraph) ?? [, paragraph, ""];
  return (
    <>
      <span className={styles.lede}>{lede}</span>
      {rest}
    </>
  );
}

function CommentForm(props: { writingId: number; identity: Identity; onPosted: (comment: CommentView) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const words = countCommentWords(text);
  const over = words > MAX_COMMENT_WORDS;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await send(`/api/writings/${props.writingId}/comments`, "POST", { ...props.identity, text });
      if (response.ok) {
        const { comment } = (await response.json()) as { comment: CommentView };
        props.onPosted(comment);
        setText("");
      } else {
        setError(await errorOf(response));
      }
    } catch {
      setError("Couldn't reach the paper.");
    }
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        className={styles.field}
        aria-label="Comment"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className={styles.formEnd}>
        <span className={over ? styles.over : styles.words}>{words > 0 && `${words}/${MAX_COMMENT_WORDS}`}</span>
        <button type="submit" className={styles.post} disabled={busy || words === 0 || over}>
          Post
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

const never = () => () => {};

function send(url: string, method: string, payload: unknown): Promise<Response> {
  return fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}

async function errorOf(response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? "That did not go through.";
}
