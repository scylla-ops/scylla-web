import { t } from '@scylla/ui/i18n';
import { userIdentityMessages } from './user-identity.messages.ts';

/** What it takes to show a person. A `UserEntity` of `features/user` is one. */
export interface UserIdentityProfile {
  username: string;
  displayName?: string;
  email?: string;
}

/**
 * Why a user can be missing. `deleted`: the account does not exist any more. `unknown`: the page
 * cannot read who it is (a grant list without the directory); a grant never outlives its user.
 */
export type MissingUser = 'deleted' | 'unknown';

/** The display name, else the username. A missing user is never shown by its id. */
export const userName = (
  user: UserIdentityProfile | undefined,
  missing: MissingUser = 'deleted',
): string => {
  if (user) return user.displayName || user.username;
  return t(
    missing === 'unknown' ? userIdentityMessages.unknownUser : userIdentityMessages.deletedUser,
  );
};

/** The email when it is known, else the handle. */
export const userSecondaryLine = (user: UserIdentityProfile): string =>
  user.email || `@${user.username}`;

/** The first letters of the first two words of the name. */
export const userInitials = (user: UserIdentityProfile): string =>
  (user.displayName || user.username)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => [...word][0])
    .join('')
    .toUpperCase();
