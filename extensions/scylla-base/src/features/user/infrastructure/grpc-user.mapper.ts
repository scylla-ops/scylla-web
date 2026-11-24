import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserEntry,
} from '@base/generated/scylla/accounts/v1/user_admin_service.ts';
import type { Session, User } from '@base/generated/scylla/accounts/v1/user.ts';
import type { PaginatedList } from '@scylla/ui/structs';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import { idValue, required, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

export function toDomain(user: User): UserEntity {
  const createdAt = timestampToIso(user.createdAt);
  return {
    id: idValue(user.id),
    username: user.handle,
    ...(user.email ? { email: user.email } : {}),
    ...(user.displayName ? { displayName: user.displayName } : {}),
    isActive: user.status === 'active',
    instanceAdmin: user.instanceAdmin,
    createdAt,
    updatedAt: createdAt,
  };
}

/** A row of the console: the user, its instance roles, its workspaces and its last sign-in. */
export function entryToDomain(entry: UserEntry): UserEntity {
  const lastSignInAt = timestampToIso(entry.lastSignInAt);
  return {
    ...toDomain(required(entry.user, 'user')),
    instanceRoles: entry.instanceRoles.map(({ key, name, builtin }) => ({ key, name, builtin })),
    workspaces: entry.workspaces,
    ...(lastSignInAt ? { lastSignInAt } : {}),
  };
}

/** All the users on one page: the console shows them in one table. */
export function toDomainList(users: UserEntry[]): PaginatedList<UserEntity> {
  return {
    items: users.map(entryToDomain),
    pagination: {
      totalCount: users.length,
      page: 1,
      pageSize: users.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  };
}

export function toCreateRequest(input: CreateUserInput): CreateUserRequest {
  return {
    email: input.email,
    handle: input.username,
    password: input.password,
    displayName: input.displayName || input.username || input.email,
  };
}

/** An absent field stays absent on the wire: the server leaves it unchanged. */
export function toUpdateRequest(input: UpdateUserInput): UpdateUserRequest {
  return {
    userId: wrapId(input.id),
    ...(input.username !== undefined && { handle: input.username }),
    ...(input.displayName !== undefined && { displayName: input.displayName }),
    ...(input.email !== undefined && { email: input.email }),
  };
}

export function sessionToDomain(session: Session): UserSessionEntity {
  return {
    id: idValue(session.id),
    createdAt: timestampToIso(session.createdAt),
    lastActiveAt: timestampToIso(session.lastUsedAt) || timestampToIso(session.createdAt),
    methods: session.methods,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    current: session.current,
  };
}
