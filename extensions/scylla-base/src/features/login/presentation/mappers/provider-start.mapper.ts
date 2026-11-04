/**
 * The address that starts a sign-in with an identity provider. The server sends the browser to
 * the provider, then back to `returnPath` of this app with the session in its cookie.
 */
export const providerStartUrl = (
  apiUrl: string,
  slug: string,
  origin: string,
  returnPath: string,
  /** Links the provider to the user of the session, instead of a sign-in. */
  { link = false }: { link?: boolean } = {},
): string => {
  const query = new URLSearchParams({ return_to: origin + returnPath });
  if (link) query.set('link', 'true');
  return `${apiUrl}/auth/${encodeURIComponent(slug)}/start?${query.toString()}`;
};
