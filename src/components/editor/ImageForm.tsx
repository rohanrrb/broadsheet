"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import type { Identity } from "@/editor/identity";
import { IMAGE_ACCEPT, uploadImage } from "../uploadImage";
import styles from "./controls.module.css";

interface ImageFormProps {
  /** Who is writing; only a known writer can upload. */
  identity: Identity | null;
  /** Returns an error to show, or null once the photo is in. */
  onInsert: (src: string, caption: string) => string | null;
  onCancel: () => void;
}

/** A photo, uploaded or by its address, with an optional caption (stored as its alt text). */
export function ImageForm({ identity, onInsert, onCancel }: ImageFormProps) {
  const [src, setSrc] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(onInsert(src, caption));
  };
  const cancelOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") onCancel();
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !identity) return;
    setUploading(true);
    const reply = await uploadImage(file, identity);
    setUploading(false);
    setError(reply.ok ? null : reply.error);
    if (reply.ok) setSrc(reply.url);
  };

  return (
    <form className={styles.imageForm} onSubmit={submit} onKeyDown={cancelOnEscape}>
      <input
        autoFocus
        className={styles.input}
        value={src}
        placeholder="Photo address (https://…)"
        aria-label="Photo address"
        aria-invalid={error ? true : undefined}
        onChange={(e) => setSrc(e.target.value)}
      />
      <input
        className={styles.input}
        value={caption}
        placeholder="Caption (optional)"
        aria-label="Caption"
        onChange={(e) => setCaption(e.target.value)}
      />
      <div className={styles.group}>
        {identity && (
          <>
            <input ref={picker} type="file" accept={IMAGE_ACCEPT} hidden onChange={upload} />
            <button type="button" className={styles.control} disabled={uploading} onClick={() => picker.current?.click()}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </>
        )}
        <button type="submit" className={styles.control} disabled={uploading}>
          Insert
        </button>
        <button type="button" className={styles.control} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {error && <p className={styles.fieldError}>{error}</p>}
    </form>
  );
}
