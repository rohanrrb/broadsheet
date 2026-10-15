"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** A story's box on a page of the paper carries where it leads in this attribute. */
const TILE_HREF = "data-tile-href";

/**
 * Opens a story from a click anywhere on its box, while leaving its text
 * free to select: a click that ends a selection, or lands on something that
 * leads elsewhere (the byline, a "Continued on" line, a field), is let be.
 * With a modifier key or the middle button the story opens in a new tab, as
 * a link would. One listener serves every box on the page. Renders nothing.
 */
export function TileClicks() {
  const router = useRouter();
  useEffect(() => {
    const open = (event: MouseEvent) => {
      if (event.defaultPrevented || (event.button !== 0 && event.button !== 1)) return;
      const target = event.target instanceof Element ? event.target : null;
      const tile = target?.closest(`[${TILE_HREF}]`);
      const href = tile?.getAttribute(TILE_HREF);
      if (!href || target!.closest("a, button, input, textarea, select, label")) return;
      if (window.getSelection()?.toString()) return;
      if (event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey) window.open(href, "_blank", "noopener");
      else router.push(href);
    };
    document.addEventListener("click", open);
    document.addEventListener("auxclick", open);
    return () => {
      document.removeEventListener("click", open);
      document.removeEventListener("auxclick", open);
    };
  }, [router]);
  return null;
}
