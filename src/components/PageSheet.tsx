import type { CSSProperties, ReactNode } from "react";
import type { Rect } from "@/core/layout";
import type { FeedModuleView, FeedView } from "@/feed/feed";
import { CoverModule } from "./CoverModule";
import { InsideBox } from "./InsideBox";
import { StoryModule } from "./StoryModule";
import styles from "./PageSheet.module.css";

/**
 * One feed page as a newspaper sheet: a fixed grid of narrow columns and
 * line-high rows, with every module placed on its rectangle from the layout.
 * Rules come from each module's top and left borders, so they line up exactly.
 */
export function PageSheet({ page }: { page: FeedView }) {
  const style = { "--cols": page.columns, "--rows": page.rows } as CSSProperties;
  const [first, ...rest] = page.modules;
  const opening = page.index === 0;
  const cell = (rect: Rect, kind: string, key: string, children: ReactNode) => (
    <Cell key={key} rect={rect} kind={kind} columns={page.columns}>
      {children}
    </Cell>
  );
  return (
    <div className={styles.sheet} style={style} data-recipe={page.recipeId}>
      {first && cell(first.rect, first.kind, first.article.id, <ModuleBody module={first} opening={opening} />)}
      {page.inside && page.teasers.length > 0 &&
        cell(page.inside, "inside", "inside", <InsideBox teasers={page.teasers} />)}
      {rest.map((m) => cell(m.rect, m.kind, m.article.id, <ModuleBody module={m} opening={opening} />))}
    </div>
  );
}

/** `opening` is true for the page a reader lands on, whose photos are loaded with it. */
function ModuleBody({ module, opening }: { module: FeedModuleView; opening: boolean }) {
  return module.kind === "cover" ? <CoverModule module={module} /> : <StoryModule module={module} eager={opening} />;
}

interface CellProps {
  rect: Rect;
  kind: string;
  columns: number;
  children: ReactNode;
}

/** One leaf of the page grid, placed on its rectangle and ruled by position. */
function Cell({ rect, kind, columns, children }: CellProps) {
  const style = {
    "--col": rect.col + 1,
    "--row": rect.row + 1,
    "--span-cols": rect.cols,
    "--span-rows": rect.rows,
  } as CSSProperties;
  return (
    <article
      className={styles.module}
      style={style}
      data-kind={kind}
      data-left={rect.col === 0 || undefined}
      data-top={rect.row === 0 || undefined}
      data-right={rect.col + rect.cols === columns || undefined}
    >
      {children}
    </article>
  );
}
