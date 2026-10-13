import type { MouseEvent, ReactNode } from "react";
import styles from "./controls.module.css";

interface ControlProps {
  children: ReactNode;
  onPress: () => void;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
}

/** A small-caps text button. It never steals the editor's selection. */
export function Control({ children, onPress, hint, active = false, disabled = false }: ControlProps) {
  const keepSelection = (event: MouseEvent) => event.preventDefault();
  return (
    <button
      type="button"
      className={styles.control}
      data-active={active || undefined}
      aria-pressed={active}
      title={hint}
      disabled={disabled}
      onMouseDown={keepSelection}
      onClick={onPress}
    >
      {children}
    </button>
  );
}
