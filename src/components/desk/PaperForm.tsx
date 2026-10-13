"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { IMAGE_ACCEPT, uploadImage } from "../uploadImage";
import { savePaper, type PaperCopy } from "./api";
import buttons from "../editor/WritingEditor.module.css";
import styles from "./Desk.module.css";

interface PaperFormProps {
  paper: PaperCopy;
  /** The most characters each field may hold. */
  limits: Record<keyof PaperCopy, number>;
}

interface Field {
  key: keyof PaperCopy;
  label: string;
  rows: number;
  /** Whether the field is a photo's address, which an upload can fill. */
  photo?: boolean;
}

const FIELDS: Field[] = [
  { key: "name", label: "Name", rows: 1 },
  { key: "earLeft", label: "Left ear", rows: 2 },
  { key: "earRight", label: "Right ear", rows: 4 },
  { key: "about", label: "About page", rows: 9 },
  { key: "agents", label: "Agents page", rows: 9 },
  { key: "comicImage", label: "Comic image", rows: 1, photo: true },
  { key: "comicLink", label: "Comic link", rows: 1 },
  { key: "comicCredit", label: "Comic credit", rows: 1 },
];

/** Every word the paper says about itself, in one form with one Save. */
export function PaperForm({ paper, limits }: PaperFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(paper);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" } | { kind: "error"; text: string }>({ kind: "idle" });

  const picker = useRef<HTMLInputElement>(null);
  const [uploadingTo, setUploadingTo] = useState<keyof PaperCopy | null>(null);

  /** Uploads the picked photo and puts its address in the field that asked; Save still has to be pressed. */
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const key = uploadingTo;
    if (!file || !key) return setUploadingTo(null);
    setStatus({ kind: "saving" });
    const reply = await uploadImage(file, "editor");
    setUploadingTo(null);
    setStatus(reply.ok ? { kind: "idle" } : { kind: "error", text: reply.error });
    if (reply.ok) setDraft((current) => ({ ...current, [key]: reply.url }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "saving" });
    const reply = await savePaper(draft);
    setStatus(reply.ok ? { kind: "saved" } : { kind: "error", text: reply.error });
    if (reply.ok) router.refresh();
  }

  return (
    <form className={styles.copyForm} onSubmit={submit}>
      <input ref={picker} type="file" accept={IMAGE_ACCEPT} hidden onChange={upload} />
      {FIELDS.map(({ key, label, rows, photo }) => (
        <label key={key} className={styles.copyField}>
          <span className={styles.copyLabel}>
            {label}
            {photo && (
              <button
                type="button"
                className={styles.copyUpload}
                disabled={status.kind === "saving"}
                onClick={() => {
                  setUploadingTo(key);
                  picker.current?.click();
                }}
              >
                Upload
              </button>
            )}
          </span>
          <textarea
            className={styles.copyInput}
            rows={rows}
            maxLength={limits[key]}
            value={draft[key]}
            onChange={(event) => {
              setDraft({ ...draft, [key]: event.target.value });
              setStatus({ kind: "idle" });
            }}
          />
        </label>
      ))}
      <div className={styles.copyActions}>
        <button type="submit" className={buttons.primary} disabled={status.kind === "saving" || draft.name.trim() === ""}>
          Save
        </button>
        {status.kind === "saved" && <span className={styles.saved}>Saved.</span>}
        {status.kind === "error" && (
          <span className={styles.error} role="alert">
            {status.text}
          </span>
        )}
      </div>
    </form>
  );
}
