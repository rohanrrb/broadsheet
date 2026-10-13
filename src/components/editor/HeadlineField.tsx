"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import styles from "./WritingEditor.module.css";

interface HeadlineFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter moves on to the body rather than breaking the headline. */
  onEnter: () => void;
}

/** A large, borderless headline that grows with its text. */
export function HeadlineField({ value, onChange, onEnter }: HeadlineFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => fitHeight(ref.current), [value]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onEnter();
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      className={styles.headline}
      value={value}
      placeholder="Headline"
      aria-label="Headline"
      maxLength={200}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={onKeyDown}
    />
  );
}

function fitHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
