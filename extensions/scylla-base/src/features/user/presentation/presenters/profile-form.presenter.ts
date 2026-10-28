import type {
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';

/** What the profile form holds. */
export interface ProfileValues {
  username: string;
  displayName: string;
  email: string;
}

/**
 * The fields of the profile form that differ from the user, trimmed, or `null` when none does.
 * The email counts only when the viewer may change it.
 */
export const profileChanges = (
  user: UserEntity,
  values: ProfileValues,
  emailEditable: boolean,
): UpdateUserInput | null => {
  const username = values.username.trim();
  const displayName = values.displayName.trim();
  const email = values.email.trim();

  const changes: UpdateUserInput = {
    id: user.id,
    ...(username !== user.username && { username }),
    ...(displayName !== (user.displayName ?? '') && { displayName }),
    ...(emailEditable && email !== (user.email ?? '') && { email }),
  };

  return Object.keys(changes).length > 1 ? changes : null;
};
