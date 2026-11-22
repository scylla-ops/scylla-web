/** The link of the cookie policy: the host of the overlay reads it from the legal settings. */
export interface PolicyLink {
  href: string;
  /** A document on another site: the link opens a new tab. */
  external: boolean;
}
