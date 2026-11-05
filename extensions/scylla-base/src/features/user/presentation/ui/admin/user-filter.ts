import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';

export type UserFilter = 'all' | 'roles';

export const holdsInstanceRole = (user: UserEntity): boolean =>
  (user.instanceRoles?.length ?? 0) > 0;

const matches = (user: UserEntity, text: string): boolean =>
  [user.displayName, user.username, user.email].some(value => value?.toLowerCase().includes(text));

export const filterUsers = (
  users: readonly UserEntity[],
  filter: UserFilter,
  search: string,
): UserEntity[] => {
  const text = search.trim().toLowerCase();
  return users
    .filter(user => filter === 'all' || holdsInstanceRole(user))
    .filter(user => !text || matches(user, text));
};
