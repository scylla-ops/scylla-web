/** The methods that the short tokens of a credential can call, inside the roles of the app. */
export type TokenPreset = 'read_only' | 'deploy' | 'full' | 'custom';

/** The life of a new API token, in days. A token always expires. */
export type TokenExpiry = 7 | 30 | 90 | 365;

/** What the short tokens of a credential can do. The roles of the app still decide. */
export interface TokenLimits {
  preset: TokenPreset;
  /** With `custom` only: `<package>.<Service>/<Method>`. */
  actions: string[];
  /** Empty: each project. Set: only these projects, and no route on the workspace. */
  projectIds: string[];
}

/** An API token: a long secret that a program exchanges for short tokens. */
export interface ApiToken {
  id: string;
  name: string;
  /** The prefix and the last characters of the secret, for example `scya_...x7Q2`. */
  hint: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  /** Empty before its first use. */
  lastUsedAt: string;
  /** Empty while the token is not revoked. */
  revokedAt: string;
  limits: TokenLimits;
}

/** A new API token, with its secret: no other call gives it again. */
export interface CreatedToken {
  token: ApiToken;
  secret: string;
}

/** The state of a credential with an expiry, as the screens show it. */
export type ExpiryState = 'ok' | 'soon' | 'expired' | 'revoked';

/** The days before its end from which a token shows a warning. */
export const EXPIRY_WARNING_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns the state of a token at `now`. */
export const expiryStateOf = (
  token: Pick<ApiToken, 'expiresAt' | 'revokedAt'>,
  now: Date,
): ExpiryState => {
  if (token.revokedAt) return 'revoked';
  const left = Date.parse(token.expiresAt) - now.getTime();
  if (left <= 0) return 'expired';
  return left <= EXPIRY_WARNING_DAYS * DAY_MS ? 'soon' : 'ok';
};

/** A new API token. */
export interface CreateTokenInput {
  name: string;
  expiry: TokenExpiry;
  limits: TokenLimits;
}
