import type { AccessEntry } from '@base/generated/scylla/access/v1/access_service.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type { UserSummary } from '@base/features/user';

export function toDomain(entry: AccessEntry): UserSummary {
  return {
    id: idValue(entry.actorId),
    username: entry.handle,
    ...(entry.displayName ? { displayName: entry.displayName } : {}),
  };
}

/** One person for each actor: an actor can hold more than one role. Apps are not members. */
export function uniqueUsers(entries: AccessEntry[]): UserSummary[] {
  const users = new Map<string, UserSummary>();
  for (const entry of entries) {
    if (entry.actorKind !== 'user') continue;
    const user = toDomain(entry);
    if (!users.has(user.id)) users.set(user.id, user);
  }
  return [...users.values()];
}
