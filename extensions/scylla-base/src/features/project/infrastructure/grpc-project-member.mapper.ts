import type { AccessEntry } from '@base/generated/scylla/access/v1/access_service.ts';
import type { UserSummary } from '@base/features/user';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';

/** One person for each user with a role on the project. Apps are not members. */
export function toDomainList(entries: AccessEntry[]): UserSummary[] {
  const users = new Map<string, UserSummary>();
  for (const entry of entries) {
    if (entry.actorKind !== 'user') continue;
    const id = idValue(entry.actorId);
    if (users.has(id)) continue;
    users.set(id, {
      id,
      username: entry.handle,
      ...(entry.displayName ? { displayName: entry.displayName } : {}),
    });
  }
  return [...users.values()];
}
