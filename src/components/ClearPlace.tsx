"use client";

import { useEffect } from "react";

/**
 * The mark on a piece opened from a "Continued on" line is only to show the
 * reader where they were. At their first click or key it is put out, and the
 * place is taken off the address, so a link copied from here opens the piece
 * plainly. Renders nothing itself.
 */
export function ClearPlace() {
  useEffect(() => {
    const events = ["pointerdown", "keydown"] as const;
    const clear = () => {
      events.forEach((event) => window.removeEventListener(event, clear));
      document.querySelectorAll("mark").forEach((mark) => mark.setAttribute("data-seen", ""));
      window.history.replaceState(null, "", window.location.pathname);
    };
    events.forEach((event) => window.addEventListener(event, clear));
    return () => events.forEach((event) => window.removeEventListener(event, clear));
  }, []);
  return null;
}
