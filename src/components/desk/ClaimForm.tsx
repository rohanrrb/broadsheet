"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { claimPaper } from "./api";
import controls from "../editor/controls.module.css";
import buttons from "../editor/WritingEditor.module.css";
import styles from "./Desk.module.css";

/** A new paper's first screen: prove you run it, then choose the key that opens its desk. */
export function ClaimForm({ minKeyLength }: { minKeyLength: number }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setClaiming(true);
    const reply = await claimPaper(code, key);
    setClaiming(false);
    if (!reply.ok) return setError(reply.error);
    router.push("/desk/paper");
  }

  return (
    <form className={styles.claimForm} onSubmit={submit}>
      <label className={styles.keyLabel} htmlFor="claim-code">
        Claim code
      </label>
      <input
        id="claim-code"
        className={controls.input}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="ABCDE-FGHJK"
        required
      />
      <label className={styles.keyLabel} htmlFor="new-editor-key">
        Choose an editor key
      </label>
      <input
        id="new-editor-key"
        type="password"
        className={controls.input}
        value={key}
        minLength={minKeyLength}
        onChange={(event) => setKey(event.target.value)}
        autoComplete="new-password"
        required
      />
      <p className={styles.claimHint}>
        At least {minKeyLength} characters. You will need it every time you open the desk, so keep it somewhere safe.
      </p>
      <button type="submit" className={buttons.primary} disabled={claiming}>
        Claim this paper
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
