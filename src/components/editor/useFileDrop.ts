"use client";

import { useEffect, useState } from "react";

/** Tracks files dragged over the window and hands a dropped file to `onFile`. */
export function useFileDrop(onFile: (file: File) => void, enabled: boolean): boolean {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) onFile(file);
    };
    const events = { dragenter: onEnter, dragleave: onLeave, dragover: onOver, drop: onDrop } as const;
    for (const [name, handler] of Object.entries(events)) window.addEventListener(name, handler as EventListener);
    return () => {
      for (const [name, handler] of Object.entries(events)) window.removeEventListener(name, handler as EventListener);
    };
  }, [onFile, enabled]);

  return dragging && enabled;
}
