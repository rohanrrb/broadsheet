"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { MAX_COMMENT_WORDS, countCommentWords } from "@/core/comments/limits";
import type { CommentOrder } from "@/core/comments/comments";
import { ThreadTree } from "@/core/comments/tree";
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

/** Past this depth replies are set no further in: the column is narrow. */
const MAX_INDENT = 4;

const OFFLINE = "Couldn't reach the paper.";

/** What every comment in the column shares: who is reading, and what they may do. */
interface Reader {
  writingId: number;
  identity: Identity | null;
  editor: boolean;
  /** Counts a comment or reply posted (+1) or taken down (-1). */
  counted: (change: number) => void;
}

/**
 * What readers say about a piece, set as a column beside it: newest first or
 * oldest first, the next page fetched as the reader nears the foot. Each
 * comment can be answered, and its replies wait folded under it until opened.
 * A writer signed in in this browser can comment, reply and take their own
 * down; the editor can take any down.
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
        if (mine === run.current) setError(OFFLINE);
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
    const fresh = { ...comment, replies: 0, writerReplied: false };
    if (order === "newest") setComments((shown) => [fresh, ...shown]);
    else if (next === null) setComments((shown) => [...shown, fresh]);
  }

  const reader: Reader = { writingId, identity, editor, counted: (change) => setTotal((n) => Math.max(0, n + change)) };

  return (
    <section className={styles.column} aria-label="Comments">
      <h2 className={styles.title}>
        Comments
        {total > 0 && <span className={styles.count}>{total}</span>}
      </h2>
      <div className={styles.compose} style={awake ? undefined : { visibility: "hidden" }}>
        {identity ? (
          <CommentForm writingId={writingId} identity={identity} onPosted={posted} />
        ) : (
          <Link href={`/me?then=${encodeURIComponent(here)}`} className={styles.signIn}>
            Sign in to comment
          </Link>
        )}
      </div>
      {comments.length > 1 && (
        <p className={styles.orders}>
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
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ol className={styles.comments}>
        {comments.map((comment) => (
          <Thread
            key={comment.id}
            root={comment}
            reader={reader}
            onGone={() => setComments((shown) => shown.filter((c) => c.id !== comment.id))}
          />
        ))}
      </ol>
      <div ref={foot} className={styles.foot} />
    </section>
  );
}

/**
 * A comment on the piece and the replies beneath it, fetched the first time
 * any are opened. Every comment's replies start folded.
 */
function Thread({ root, reader, onGone }: { root: CommentView; reader: Reader; onGone: () => void }) {
  const [head, setHead] = useState(root);
  const [replies, setReplies] = useState<CommentView[] | null>(null);
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const [answering, setAnswering] = useState<number | null>(null);
  const [error, setError] = useState("");
  const tree = useMemo(() => new ThreadTree(replies ?? []), [replies]);

  async function fetchReplies(): Promise<boolean> {
    if (replies) return true;
    try {
      const response = await fetch(`/api/writings/${reader.writingId}/comments?thread=${head.id}`);
      if (!response.ok) throw new Error();
      const { comments } = (await response.json()) as { comments: CommentView[] };
      setReplies(comments);
      return true;
    } catch {
      setError(OFFLINE);
      return false;
    }
  }

  async function toggle(id: number) {
    setError("");
    if (!open.has(id) && !(await fetchReplies())) return;
    setOpen((was) => {
      const now = new Set(was);
      if (!now.delete(id)) now.add(id);
      return now;
    });
  }

  function answer(id: number) {
    setError("");
    setAnswering((was) => (was === id ? null : id));
    // A reply joins the thread's other replies, so they are on hand before it is sent.
    void fetchReplies();
  }

  function answered(reply: CommentView) {
    reader.counted(+1);
    setReplies((was) => [...(was ?? []), reply]);
    setOpen((was) => new Set(was).add(reply.parentId!));
    setAnswering(null);
  }

  /** How much sits beneath a comment: the server's count for the thread until it is fetched. */
  const beneath = (comment: CommentView) =>
    replies === null && comment.id === head.id
      ? { replies: head.replies ?? 0, writerReplied: head.writerReplied ?? false }
      : tree.beneath(comment.id);

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
    } catch {
      setError(OFFLINE);
      return;
    }
    reader.counted(-1);
    // One with replies keeps its place, emptied, as the paper keeps it.
    const kept = beneath(comment).replies > 0;
    const emptied = { ...comment, text: "", author: "", href: "", byWriter: false };
    if (comment.id === head.id) {
      if (kept) setHead({ ...head, ...emptied });
      else onGone();
    } else {
      setReplies((was) =>
        (was ?? []).flatMap((reply) => (reply.id !== comment.id ? [reply] : kept ? [{ ...reply, ...emptied }] : [])),
      );
    }
  }

  /** One comment in the thread, its actions, and its replies if they are open. */
  function entry(comment: CommentView, depth: number) {
    const { identity, editor } = reader;
    const own = identity && comment.author && handleOf(identity.name) === handleOf(comment.author) ? identity : null;
    const under = beneath(comment);
    const isOpen = open.has(comment.id);
    const removed = comment.text === "";
    return (
      <li key={comment.id} className={depth === 0 ? styles.comment : styles.reply}>
        {removed ? (
          <p className={styles.removed}>Removed</p>
        ) : (
          <>
            <p className={styles.byline}>
              <span className={styles.who}>
                <Link href={comment.href} className={styles.author}>
                  {comment.author}
                </Link>
                {comment.byWriter && <span className={styles.writer}>Writer</span>}
              </span>
              <time dateTime={comment.dateTime}>{comment.date}</time>
            </p>
            <div className={styles.text}>
              {comment.text.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </>
        )}
        <p className={styles.actions}>
          {under.replies > 0 && (
            <button type="button" className={styles.toggle} aria-expanded={isOpen} onClick={() => toggle(comment.id)}>
              <span className={styles.caret} aria-hidden>
                {isOpen ? "▾" : "▸"}
              </span>
              {under.replies} {under.replies === 1 ? "reply" : "replies"}
              {under.writerReplied && !isOpen && <span className={styles.writerReplied}>Writer replied</span>}
            </button>
          )}
          {identity && !removed && (
            <button type="button" className={styles.action} onClick={() => answer(comment.id)}>
              Reply
            </button>
          )}
          {!removed && (own || editor) && (
            <button type="button" className={styles.action} onClick={() => remove(comment, own)}>
              Remove
            </button>
          )}
        </p>
        {answering === comment.id && identity && (
          <div className={styles.answer}>
            <CommentForm writingId={reader.writingId} identity={identity} parentId={comment.id} onPosted={answered} />
          </div>
        )}
        {isOpen && tree.repliesTo(comment.id).length > 0 && (
          <ol className={depth < MAX_INDENT ? styles.replies : `${styles.replies} ${styles.flat}`}>
            {tree.repliesTo(comment.id).map((reply) => entry(reply, depth + 1))}
          </ol>
        )}
      </li>
    );
  }

  return (
    <>
      {entry(head, 0)}
      {error && (
        <li className={styles.error} role="alert">
          {error}
        </li>
      )}
    </>
  );
}

function CommentForm(props: {
  writingId: number;
  identity: Identity;
  /** The comment this answers, for a reply. */
  parentId?: number;
  onPosted: (comment: CommentView) => void;
}) {
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
      const payload = { ...props.identity, text, parent: props.parentId };
      const response = await send(`/api/writings/${props.writingId}/comments`, "POST", payload);
      if (response.ok) {
        const { comment } = (await response.json()) as { comment: CommentView };
        props.onPosted(comment);
        setText("");
      } else {
        setError(await errorOf(response));
      }
    } catch {
      setError(OFFLINE);
    }
    setBusy(false);
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        className={styles.field}
        aria-label={props.parentId === undefined ? "Comment" : "Reply"}
        rows={props.parentId === undefined ? 3 : 2}
        value={text}
        autoFocus={props.parentId !== undefined}
        onChange={(event) => setText(event.target.value)}
      />
      <div className={styles.formEnd}>
        <span className={over ? styles.over : styles.words}>{words > 0 && `${words}/${MAX_COMMENT_WORDS}`}</span>
        <button type="submit" className={styles.post} disabled={busy || words === 0 || over}>
          {props.parentId === undefined ? "Post" : "Reply"}
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
