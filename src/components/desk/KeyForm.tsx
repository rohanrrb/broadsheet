"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "./api";
import controls from "../editor/controls.module.css";
import buttons from "../editor/WritingEditor.module.css";
import styles from "./Desk.module.css";

/** The desk's door: the editor's key, and nothing else, opens it. */
export function KeyForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    const reply = await signIn(key);
    setChecking(false);
    if (!reply.ok) return setError(reply.error);
    router.refresh();
  }

  return (
    <form className={styles.keyForm} onSubmit={submit}>
      <label className={styles.keyLabel} htmlFor="editor-key">
        Editor key
      </label>
      <input
        id="editor-key"
        type="password"
        className={controls.input}
        value={key}
        onChange={(event) => setKey(event.target.value)}
        autoComplete="current-password"
        autoFocus
        required
      />
      <button type="submit" className={buttons.primary} disabled={checking || key.trim() === ""}>
        Open the desk
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
