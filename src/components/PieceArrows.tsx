import Link from "next/link";
import styles from "./PieceArrows.module.css";

interface Piece {
  id: number;
  title: string;
}

interface PieceArrowsProps {
  /** The piece above this one in the feed, if any. */
  previous?: Piece;
  /** The piece below this one in the feed, if any. */
  next?: Piece;
}

/**
 * Two arrows at the sides of the screen that turn to the neighbouring pieces.
 * No labels; at either end of the feed that side has no arrow.
 */
export function PieceArrows({ previous, next }: PieceArrowsProps) {
  return (
    <nav aria-label="Other pieces">
      <Arrow piece={previous} glyph="←" label="Previous piece" side={styles.left} />
      <Arrow piece={next} glyph="→" label="Next piece" side={styles.right} />
    </nav>
  );
}

function Arrow({ piece, glyph, label, side }: { piece?: Piece; glyph: string; label: string; side: string }) {
  if (!piece) return null;
  return (
    <Link
      href={`/w/${piece.id}`}
      className={`${styles.arrow} ${side}`}
      aria-label={`${label}: ${piece.title}`}
      title={piece.title}
    >
      {glyph}
    </Link>
  );
}
