/**
 * A token of a mail link, from the URL fragment (`#token=…`), which the server never receives.
 * The fragment leaves the address bar at once, so the token is not left in the history or on
 * the screen. `undefined` when the URL has no fragment; `null` for a fragment with no such key.
 */
export const takeFromFragment = (key = 'token'): string | null | undefined => {
  const { hash, pathname, search } = window.location;
  if (!hash) return undefined;

  history.replaceState(history.state, '', pathname + search);
  return new URLSearchParams(hash.slice(1)).get(key) || null;
};
