/**
 * The address that starts a sign-in with an identity provider. The server sends the browser to
 * the provider, then back to `returnPath` of this app with the session in its cookie.
 */
export const providerStartUrl = (
  apiUrl: string,
  slug: string,
  origin: string,
  returnPath: string,
): string => {
  const query = new URLSearchParams({ return_to: origin + returnPath });
  return `${apiUrl}/auth/${encodeURIComponent(slug)}/start?${query.toString()}`;
};
