"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditorState } from "@tiptap/react";
import type { TiptapDoc } from "@/core/db";
import { browserStorage, draftKey, type Draft } from "@/editor/draft";
import { IDENTITY_KEY, parseIdentity, type Identity } from "@/editor/identity";
import { acceptAttribute } from "@/editor/import/registry";
import { emptyDoc, isBlankDoc, normalizeDoc } from "@/editor/schema";
import { countWords } from "@/feed/tiptap";
import { NEW_WRITER_FLAG } from "../NewWriterNote";
import { BylineField } from "./BylineField";
import { DropOverlay } from "./DropOverlay";
import { EditorFooter } from "./EditorFooter";
import { EditorHeader } from "./EditorHeader";
import { EditorToolbar } from "./EditorToolbar";
import { HeadlineField } from "./HeadlineField";
import { PublishControls } from "./PublishControls";
import { SelectionMenu } from "./SelectionMenu";
import { DraftStatus } from "./DraftStatus";
import { submitWriting, type EditorTarget } from "./submit";
import { draftFingerprint, useDraft } from "./useDraft";
import { useFileDrop } from "./useFileDrop";
import { rememberIdentity, useIdentity } from "./useIdentity";
import { useImportExport } from "./useImportExport";
import { toContent, useWritingEditor } from "./useWritingEditor";
import { createWriter } from "./writers";
import styles from "./WritingEditor.module.css";

interface WritingEditorProps {
  instanceName: string;
  target: EditorTarget;
  initialTitle?: string;
  initialBody?: TiptapDoc;
}

/** How long a passing note ("Imported essay.md") stays in the footer. */
const NOTE_MS = 5000;

type Notice = { tone: "error" | "note"; text: string } | null;

/** The whole writing surface: headline, byline, body, and the publish flow. */
export function WritingEditor({ instanceName, target, initialTitle = "", initialBody }: WritingEditorProps) {
  const router = useRouter();
  const editing = target.kind === "edit";

  const [title, setTitle] = useState(initialTitle);
  const remembered = useIdentity();
  /** A writer made on this page whom the browser could not be made to remember: known only while the page is open. */
  const [held, setHeld] = useState<Identity | null>(null);
  const identity = remembered ?? held;
  /** The pen name a newcomer is typing; a known writer's name comes from `identity`. */
  const [penName, setPenName] = useState("");
  const [returning, setReturning] = useState(false);
  /** A writer made by this page, who has not yet been shown their key. */
  const [newWriter, setNewWriter] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (notice?.tone !== "note") return;
    const timer = setTimeout(() => setNotice(null), NOTE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const editor = useWritingEditor({ initialBody, onLinkShortcut: () => setLinkOpen(true) });
  const body = useEditorState({ editor, selector: ({ editor: e }) => (e ? (e.getJSON() as TiptapDoc) : null) });
  const baseline = useMemo(() => draftFingerprint(initialTitle, normalizeDoc(initialBody ?? emptyDoc())), [initialTitle, initialBody]);
  const dirty = draftFingerprint(title, body) !== baseline;

  const restore = (draft: Draft) => {
    setTitle(draft.title);
    if (!editing) setPenName(draft.author);
    editor?.commands.setContent(toContent(draft.body), { emitUpdate: true });
  };
  const draft = useDraft({
    storageKey: draftKey(editing ? target.id : null),
    baseEdits: editing ? target.editsUsed : undefined,
    title,
    author: penName,
    body,
    baseline: editor ? baseline : null,
    restore,
  });

  const discardDraft = () => {
    setTitle(initialTitle);
    editor?.commands.setContent(toContent(initialBody ?? emptyDoc()), { emitUpdate: true });
    draft.forget();
  };

  const showMessage = useCallback((tone: "error" | "note", text: string) => setNotice({ tone, text }), []);
  const files = useImportExport({ editor, title, setTitle, onMessage: showMessage });
  const dragging = useFileDrop(files.importSource, editor !== null);

  const publish = async () => {
    if (!editor) return;
    const problem = missingPiece(title, editor.getJSON() as TiptapDoc);
    if (problem) return setNotice({ tone: "error", text: problem });
    // They have said the name is theirs already: publishing must not take it, or a mistyping of it, as a new one.
    if (!editing && !identity && returning) {
      return setNotice({ tone: "error", text: "Enter your credential and press “Use this moniker” first." });
    }

    setSaving(true);
    setNotice(null);
    const writer = !editing && !identity ? await becomeWriter() : { identity, isNew: newWriter };
    if (!writer) return setSaving(false);
    const result = await submitWriting(target, { title, body: editor.getJSON() as TiptapDoc }, writer.identity);
    if (result.ok) {
      draft.forget();
      // The piece's own page greets a new writer and hands over their key.
      if (writer.isNew) flagNewWriter();
      router.push(result.url);
      return;
    }
    setSaving(false);
    setNotice({ tone: "error", text: result.error });
  };

  /** A newcomer's first Publish makes their pen name on the way to publishing the piece. */
  const becomeWriter = async (): Promise<{ identity: Identity; isNew: true } | null> => {
    const made = await createWriter(penName);
    if (!made.ok) {
      setNotice({ tone: "error", text: made.error });
      return null;
    }
    rememberIdentity(made.identity);
    setNewWriter(true);
    if (!isRemembered(made.identity)) {
      // With storage blocked, this page is the only place the credential will ever be shown: stop here for it.
      setHeld(made.identity);
      setNotice({ tone: "note", text: "This browser cannot keep your credential. Copy it from “Show credential”, then publish." });
      return null;
    }
    return { identity: made.identity, isNew: true };
  };

  const label = editing ? `Editing W${target.id}` : "New writing";
  const wordCount = body ? countWords(body) : 0;

  return (
    <div className={styles.page}>
      <EditorHeader instanceName={instanceName} label={label}>
        <PublishControls editing={editing} saving={saving} disabled={!editor || (editing && !dirty)} onPublish={publish} />
      </EditorHeader>
      {notice?.tone === "error" && (
        <p className={styles.alert} role="alert">
          {notice.text}
        </p>
      )}
      {editor && (
        <EditorToolbar editor={editor} identity={identity} onImport={() => fileInput.current?.click()} onExport={files.exportMarkdown} />
      )}

      <main className={styles.sheet}>
        <HeadlineField value={title} onChange={setTitle} onEnter={() => editor?.commands.focus("start")} />
        <BylineField
          identity={identity}
          penName={penName}
          onPenNameChange={setPenName}
          returning={returning}
          onReturningChange={setReturning}
          fixed={editing ? { author: target.author, owner: target.owner } : undefined}
        />
        {editor && <SelectionMenu editor={editor} linkOpen={linkOpen} onLinkOpenChange={setLinkOpen} />}
        <EditorContent editor={editor} className={styles.body} />
      </main>

      <EditorFooter
        wordCount={wordCount}
        status={
          notice?.tone === "note" ? notice.text : <DraftStatus state={draft.state} onDiscard={discardDraft} />
        }
      />
      {dragging && <DropOverlay />}
      <input ref={fileInput} type="file" hidden accept={acceptAttribute()} onChange={files.onFilePicked} />
    </div>
  );
}

/** Whether the browser really kept the writer: storage can be blocked, and saving to it then fails silently. */
function isRemembered(identity: Identity): boolean {
  try {
    return parseIdentity(browserStorage()?.getItem(IDENTITY_KEY) ?? null)?.key === identity.key;
  } catch {
    return false;
  }
}

function flagNewWriter(): void {
  try {
    window.sessionStorage.setItem(NEW_WRITER_FLAG, "1");
  } catch {
    // Without storage the greeting is skipped; the credential is still under "Show credential" on the Write page.
  }
}

/** Client-side check before a round trip; the server checks the same things. */
function missingPiece(title: string, body: TiptapDoc): string | null {
  if (!title.trim()) return "Add a headline first.";
  if (isBlankDoc(body)) return "Write something before publishing.";
  return null;
}
