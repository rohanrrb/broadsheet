interface ArticleImageProps {
  src: string;
  /** Empty (the default) marks the photo decorative, as it is beside a headline. */
  alt?: string;
  className?: string;
  /**
   * For a photo that is on the page as it opens: fetched at once and drawn
   * with the text around it, so a reload does not show its box empty first.
   * Others wait until the reader nears them.
   */
  eager?: boolean;
}

/**
 * Writers may link images from any host, so this is a plain <img> rather than
 * next/image, which would need every host allow-listed up front. Images here
 * are decorative: the headline beside them carries the meaning.
 */
export function ArticleImage({ src, alt = "", className, eager = false }: ArticleImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding={eager ? "sync" : "async"}
    />
  );
}
