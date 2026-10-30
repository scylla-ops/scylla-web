import type {
  CreateUserRequest,
  ListUsersResponse,
  UpdateUserRequest,
  User,
  UserAccess as GrpcUserAccess,
  UserSession as GrpcUserSession,
} from '@base/generated/scylla/user/v1/user.ts';
import { PasswordResetDelivery as GrpcPasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import type { PaginationInfo, PaginatedList } from '@scylla/ui/structs';
import type { PasswordResetDelivery } from '@base/features/login';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import type { UserAccess } from '../domain/entities/user.entity.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

export function toDomain(user: User): UserEntity {
  return {
    userId: idValue(user.userId),
    username: user.username,
    ...(user.email?.value ? { email: user.email.value } : {}),
    ...(user.displayName ? { displayName: user.displayName } : {}),
    isActive: user.isActive,
    createdAt: timestampToIso(user.createdAt),
    updatedAt: timestampToIso(user.updatedAt),
  };
}

export function toDomainList(list: ListUsersResponse): PaginatedList<UserEntity> {
  return {
    items: list.users.map(toDomain),
    pagination: list.pagination as PaginationInfo,
  };
}

export function toCreateRequest(input: CreateUserInput): CreateUserRequest {
  return {
    username: input.username,
    password: input.password,
    email: { value: input.email },
    ...(input.displayName ? { displayName: input.displayName } : {}),
  };
}

/** An absent field stays absent on the wire: the server leaves it unchanged. */
export function toUpdateRequest(input: UpdateUserInput): UpdateUserRequest {
  return {
    userId: wrapId(input.userId),
    ...(input.username !== undefined && { username: input.username }),
    ...(input.displayName !== undefined && { displayName: input.displayName }),
    ...(input.email !== undefined && { email: { value: input.email } }),
  };
}

/** A grant with no organization is shown as a system grant, whatever its scope says. */
export function accessToDomain(access: GrpcUserAccess): UserAccess {
  const grant = {
    grantId: idValue(access.grantId),
    roleId: idValue(access.roleId),
    roleName: access.roleName,
  };
  const ref = access.scope?.scope;
  if (
    !access.organizationId ||
    (ref?.oneofKind !== 'organization' && ref?.oneofKind !== 'project')
  ) {
    return { ...grant, scope: 'system' };
  }

  const organization = {
    organizationId: idValue(access.organizationId),
    organizationName: access.organizationName,
  };
  return ref.oneofKind === 'organization'
    ? { ...grant, scope: 'organization', ...organization }
    : {
        ...grant,
        scope: 'project',
        ...organization,
        projectId: idValue(ref.project.projectId),
        projectName: access.projectName,
      };
}

export function sessionToDomain(session: GrpcUserSession): UserSessionEntity {
  return {
    sessionId: idValue(session.sessionId),
    createdAt: timestampToIso(session.createdAt),
    lastActiveAt: timestampToIso(session.lastActiveAt),
    expiresAt: timestampToIso(session.expiresAt),
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    current: session.current,
  };
}

export function deliveryToDomain(delivery: GrpcPasswordResetDelivery): PasswordResetDelivery {
  switch (delivery) {
    case GrpcPasswordResetDelivery.MAIL:
      return 'mail';
    case GrpcPasswordResetDelivery.SERVER_LOG:
      return 'server-log';
    default:
      return 'unknown';
  }
}
