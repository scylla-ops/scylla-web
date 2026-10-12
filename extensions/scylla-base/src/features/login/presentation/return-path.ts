const ORIGIN = 'http://scylla.invalid';
const LOGIN = '/login';

const isUnsafeCharacter = (character: string): boolean => {
  const code = character.charCodeAt(0);
  return code < 0x20 || code === 0x7f || character === '\\';
};

/**
 * A path of this app, with its query and its fragment, or `null`. Refuses each value that can
 * leave the origin: `//host`, `/\host`, a scheme (`https:`, `javascript:`), a control character.
 */
export const safeReturnPath = (raw: string | null | undefined): string | null => {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  if ([...raw].some(isUnsafeCharacter)) return null;

  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;

  const path = url.pathname + url.search + url.hash;
  return path.startsWith('//') ? null : path;
};

/**
 * The sign-in page, which goes to `returnTo` after the sign-in. The return path is in the
 * fragment: it can hold a token, and a fragment never goes to the server or into a `Referer`.
 */
export const loginPath = (returnTo: string): string =>
  `${LOGIN}#${new URLSearchParams({ next: returnTo }).toString()}`;

/** The sign-in page, then back to `current` with its fragment. On the sign-in page: `/login`. */
export const loginPathBackTo = (current: {
  pathname: string;
  search: string;
  hash: string;
}): string => {
  if (current.pathname.replace(/\/+$/, '') === LOGIN) return LOGIN;
  const back = safeReturnPath(current.pathname + current.search + current.hash);
  return back ? loginPath(back) : LOGIN;
};

/** The return path of a `loginPath` fragment, when it is safe. */
export const returnPathOf = (hash: string): string | null =>
  safeReturnPath(new URLSearchParams(hash.replace(/^#/, '')).get('next'));
