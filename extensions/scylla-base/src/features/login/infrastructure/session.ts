import { browserSession, type IssuedToken } from '@platform/grpc';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

/**
 * The only writers of the session. The access token is in memory in `platform/grpc` and the
 * refresh token is in an HttpOnly cookie. `userId` stays in `localStorage`: the pages read it to
 * know which member is the current user. A sign-up in another extension opens a session the same
 * way: it never writes to `localStorage` itself.
 */
const USER_ID = 'userId';

/** Gives the id of the user of the session. `login.module.ts` sets it with `ProfileService.GetMe`. */
let whoAmI: (() => Promise<string>) | null = null;

export const resolveUserWith = (resolve: () => Promise<string>): void => {
  whoAmI = resolve;
};

/** Keeps the access token of a sign-in, and the id of its user once it is known. */
export const openSession = (token: IssuedToken | undefined, userId?: string): void => {
  browserSession.open(token);
  if (userId) localStorage.setItem(USER_ID, userId);
};

/** The id of the user of this browser, also when no query asked for the profile yet. */
export const sessionUserId = (): string | null => localStorage.getItem(USER_ID);

export const rememberUser = (userId: string): void => {
  localStorage.setItem(USER_ID, userId);
};

/**
 * Whether the browser has a valid session. After a reload, or after the redirect of an identity
 * provider, the cookie gives a new access token, and `GetMe` gives the id of the user. It rejects
 * when the server gives no answer about the session: the session can still be valid.
 */
export const hasSession = async (): Promise<boolean> => {
  if (!(await browserSession.restore())) {
    localStorage.removeItem(USER_ID);
    return false;
  }
  if (!localStorage.getItem(USER_ID) && whoAmI) {
    try {
      rememberUser(await whoAmI());
    } catch (error) {
      if (ScyllaError.from(error).code === 'UNAUTHENTICATED') return false;
      throw error;
    }
  }
  return true;
};

/** Forgets the session in this tab at once, and closes it on the server. */
export const closeSession = (): Promise<void> => {
  localStorage.removeItem(USER_ID);
  return browserSession.close();
};
