"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import styles from "./controls.module.css";

interface InlineFieldProps {
  label: string;
  placeholder: string;
  initialValue?: string;
  submitLabel: string;
  onSubmit: (value: string) => string | null;
  onCancel: () => void;
  /** A secondary action, such as removing the link. */
  extra?: { label: string; run: () => void };
}

/**
 * A one-line form for the menus (link address, photo caption). `onSubmit`
 * returns an error message to show, or null when the value was accepted.
 */
export function InlineField({ label, placeholder, initialValue = "", submitLabel, onSubmit, onCancel, extra }: InlineFieldProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(onSubmit(value));
  };
  const cancelOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") onCancel();
  };

  return (
    <form className={styles.field} onSubmit={submit} onKeyDown={cancelOnEscape}>
      <label className={styles.fieldLabel}>
        <span className={styles.srOnly}>{label}</span>
        <input
          autoFocus
          className={styles.input}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button type="submit" className={styles.control}>
        {submitLabel}
      </button>
      {extra && (
        <button type="button" className={styles.control} onClick={extra.run}>
          {extra.label}
        </button>
      )}
      <button type="button" className={styles.control} onClick={onCancel} aria-label="Close">
        ×
      </button>
      {error && <p className={styles.fieldError}>{error}</p>}
    </form>
  );
}
