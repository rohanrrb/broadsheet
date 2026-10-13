"use client";

import { useState } from "react";
import { MAX_NAME_LENGTH } from "@/core/writers/handle";
import type { Identity } from "@/editor/identity";
import { KeyCard } from "../KeyCard";
import { SignOutPrompt } from "../SignOutPrompt";
import { rememberIdentity } from "./useIdentity";
import { verifyWriter } from "./writers";
import controls from "./controls.module.css";
import styles from "./WritingEditor.module.css";

interface BylineFieldProps {
  /** Who this browser writes as, if anyone yet. */
  identity: Identity | null;
  /** The pen name a newcomer has typed; blank means "make one up for me". */
  penName: string;
  onPenNameChange: (value: string) => void;
  /** Whether a writer with no identity here has said the name they typed is one they already hold. */
  returning: boolean;
  onReturningChange: (value: boolean) => void;
  /**
   * An edit: the byline is fixed. `owner` is the pen name whose key the save
   * needs, or null for a piece from before pen names.
   */
  fixed?: { author: string; owner: string | null };
}

/**
 * The byline, which is also the whole of signing in. A newcomer types a pen
 * name or leaves it blank; a returning writer on a new browser gives their
 * name and key; a known writer just sees their name.
 */
export function BylineField(props: BylineFieldProps) {
  const { identity, penName, onPenNameChange, fixed, returning, onReturningChange: setReturning } = props;
  const [keyShown, setKeyShown] = useState(false);

  if (fixed) {
    const needsKey = fixed.owner !== null && identity?.name !== fixed.owner;
    return (
      <div className={styles.byline}>
        <p className={styles.bylineLine}>
          <span>
            <span className={styles.bylineBy}>By</span> {fixed.author}
          </span>
        </p>
        {needsKey && <KeyEntry name={fixed.owner!} prompt={`To save changes, enter ${fixed.owner}’s credential.`} />}
      </div>
    );
  }

  if (identity) {
    return (
      <div className={styles.byline}>
        <p className={styles.bylineLine}>
          <span>
            <span className={styles.bylineBy}>By</span> {identity.name}
          </span>
          <span className={styles.bylineActions}>
            <button type="button" className={controls.control} onClick={() => setKeyShown(!keyShown)}>
              {keyShown ? "Hide credential" : "Show credential"}
            </button>
            <SignOutPrompt identity={identity}>
              {(ask) => (
                <button type="button" className={controls.control} onClick={ask}>
                  Not you?
                </button>
              )}
            </SignOutPrompt>
          </span>
        </p>
        {keyShown && <KeyCard identity={identity} />}
      </div>
    );
  }

  return (
    <div className={styles.byline}>
      <p className={styles.bylineLine}>
        <label htmlFor="byline" className={styles.bylineBy}>
          By
        </label>{" "}
        <input
          id="byline"
          className={styles.bylineInput}
          value={penName}
          placeholder={returning ? "your moniker" : "a moniker, or leave blank"}
          maxLength={returning ? undefined : MAX_NAME_LENGTH}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onPenNameChange(e.target.value)}
        />
        <span className={styles.bylineActions}>
          <button type="button" className={controls.control} onClick={() => setReturning(!returning)}>
            {returning ? "I’m new here" : "I already have a moniker"}
          </button>
        </span>
      </p>
      {returning && <KeyEntry name={penName} prompt="Enter the credential you were given with that moniker." />}
    </div>
  );
}

function KeyEntry({ name, prompt }: { name: string; prompt: string }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    const reply = await verifyWriter(name, key);
    setChecking(false);
    if (!reply.ok) return setError(reply.error);
    rememberIdentity(reply.identity);
  };

  return (
    <span className={styles.keyEntry}>
      <input
        className={`${controls.input} ${styles.keyInput}`}
        value={key}
        aria-label={prompt}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && check()}
      />
      <button type="button" className={controls.control} disabled={checking || !name.trim() || !key.trim()} onClick={check}>
        Use this moniker
      </button>
      <span className={error ? styles.keyError : styles.bylineNote}>{error ?? prompt}</span>
    </span>
  );
}
