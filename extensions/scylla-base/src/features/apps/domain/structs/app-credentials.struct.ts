import {
  expiryStateOf,
  type ApiToken,
  type ExpiryState,
} from '@shared/domain/structs/api-token.struct.ts';
import type { AppKeyEntity } from '../entities/app.entity.ts';
import type { CiIdentityEntity } from '../entities/ci-identity.entity.ts';

/** One line of the credentials of an app, whatever its kind. */
export type CredentialRow =
  | { kind: 'token'; id: string; lastUsedAt: string; token: ApiToken; state: ExpiryState }
  | { kind: 'ci'; id: string; lastUsedAt: string; identity: CiIdentityEntity }
  | { kind: 'key'; id: string; lastUsedAt: string; key: AppKeyEntity };

/** The tokens, then the CI identities, then the keys: each list newest first. */
export const credentialRows = (
  tokens: readonly ApiToken[],
  identities: readonly CiIdentityEntity[],
  keys: readonly AppKeyEntity[],
  now: Date,
): CredentialRow[] => {
  const newest = <T extends { createdAt: string }>(items: readonly T[]) =>
    [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [
    ...newest(tokens).map(token => ({
      kind: 'token' as const,
      id: token.id,
      lastUsedAt: token.lastUsedAt,
      token,
      state: expiryStateOf(token, now),
    })),
    ...newest(identities).map(identity => ({
      kind: 'ci' as const,
      id: identity.id,
      lastUsedAt: identity.lastUsedAt,
      identity,
    })),
    ...newest(keys).map(key => ({
      kind: 'key' as const,
      id: key.id,
      lastUsedAt: key.lastUsedAt,
      key,
    })),
  ];
};

/** The credential of the latest sign-in, or `null` before the first one. */
export const lastUsedOf = (rows: readonly CredentialRow[]): CredentialRow | null =>
  rows
    .filter(row => !!row.lastUsedAt)
    .reduce<CredentialRow | null>(
      (latest, row) => (!latest || row.lastUsedAt > latest.lastUsedAt ? row : latest),
      null,
    );

/** The days before `at`, rounded to the nearest day; negative after it. */
export const daysUntil = (at: string, now: Date): number =>
  Math.round((Date.parse(at) - now.getTime()) / (24 * 60 * 60 * 1000));
