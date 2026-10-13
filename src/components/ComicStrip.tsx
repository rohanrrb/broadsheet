import styles from "./ComicStrip.module.css";

interface ComicStripProps {
  /** The strip's image. */
  image: string;
  /** Where it leads when pressed; nowhere if empty. */
  link: string;
  /** Who drew it and under what licence. */
  credit: string;
}

/**
 * The comic strip: one band across the foot of the front page, under the
 * stories. The editor chooses it; a paper with none set has no band.
 */
export function ComicStrip({ image, link, credit }: ComicStripProps) {
  // Any host's image, as with writers' photos, so a plain <img>.
  // eslint-disable-next-line @next/next/no-img-element
  const strip = <img src={image} alt="Comic strip" loading="lazy" decoding="async" />;
  return (
    <figure className={styles.comic}>
      {link ? (
        <a href={link} rel="noopener noreferrer">
          {strip}
        </a>
      ) : (
        strip
      )}
      {credit && <figcaption className={styles.credit}>{credit}</figcaption>}
    </figure>
  );
}
