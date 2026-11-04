import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { TokenServiceClient } from '@base/generated/scylla/auth/v1/token_service.client.ts';
import type { IssuedToken } from '@base/generated/scylla/auth/v1/token_service.ts';
import { Timestamp } from '@base/generated/google/protobuf/timestamp.ts';

/**
 * The session of the browser. The refresh token is in an HttpOnly cookie that the server sets:
 * this code never sees it. The access token is in memory only, so a reload gets a new one with
 * `TokenService.Refresh`.
 */
interface AccessToken {
  value: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
}

/** A token that ends in less than this is refreshed before the call. */
const MARGIN_MS = 30_000;

let current: AccessToken | null = null;
let refreshing: Promise<string | null> | null = null;

/** The base URL of the API. */
export const apiUrl = (): string => import.meta.env.VITE_API_URL ?? '';

/** The calls that need no token. They never start a refresh. */
const PUBLIC_METHODS = new Set([
  'scylla.auth.v1.TokenService/Refresh',
  'scylla.auth.v1.TokenService/SignOut',
  'scylla.auth.v1.TokenService/ExchangeIdToken',
  'scylla.accounts.v1.AccountService/SignIn',
  'scylla.accounts.v1.AccountService/SignUp',
  'scylla.accounts.v1.AccountService/VerifyEmail',
  'scylla.accounts.v1.AccountService/ListSignInMethods',
  'scylla.accounts.v1.AccountService/RequestPasswordReset',
  'scylla.accounts.v1.AccountService/ResetPassword',
]);

/** Whether the URL of a call is a call that needs no token. */
export const isPublicCall = (url: string): boolean => {
  const [, method = ''] = /\/([^/]+\/[^/]+)$/.exec(url) ?? [];
  return PUBLIC_METHODS.has(method);
};

/** A transport with no token and no refresh, for the token service itself. */
const tokenClient = () =>
  new TokenServiceClient(
    new GrpcWebFetchTransport({
      baseUrl: apiUrl(),
      format: 'binary',
      fetchInit: { credentials: 'include' },
    }),
  );

/** Keeps the access token of a sign-in or of a refresh. */
export const openSession = (token: IssuedToken | undefined): void => {
  if (!token?.value) return;
  const expiresAt = token.expiresAt
    ? Timestamp.toDate(token.expiresAt).getTime()
    : Date.now() + 60_000;
  current = { value: token.value, expiresAt };
};

/** Forgets the access token. The cookie stays until `signOut`. */
export const forgetSession = (): void => {
  current = null;
};

/**
 * Gets a new access token with the cookie. One refresh at a time: the calls that wait for it get
 * the same answer. `null` when the cookie is missing, ended or refused.
 */
export const refreshSession = (): Promise<string | null> => {
  refreshing ??= tokenClient()
    .refresh({ refreshToken: '' })
    .response.then(({ token }) => {
      openSession(token);
      return current?.value ?? null;
    })
    .catch(() => {
      current = null;
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

/** The access token to send: the one in memory, or a refreshed one when it ends soon. */
export const accessToken = async (): Promise<string | null> => {
  if (current && current.expiresAt - MARGIN_MS > Date.now()) return current.value;
  return refreshSession();
};

/** Whether the browser has a session: a valid access token, or a cookie that gives one. */
export const restoreSession = async (): Promise<boolean> => (await accessToken()) !== null;

/** Closes the session on the server, which clears the cookie. A failure still forgets the token. */
export const closeSession = async (): Promise<void> => {
  current = null;
  try {
    await tokenClient().signOut({ refreshToken: '' }).response;
  } catch {
    // The session ends on the server at its expiry.
  }
};
