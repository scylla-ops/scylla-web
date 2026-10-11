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
import type {
  UserAccess,
  UserAccessScope,
} from '@base/features/user/domain/structs/user-access.struct.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

const accessScopeOf = (access: GrpcUserAccess): { scope: UserAccessScope; projectId?: string } => {
  const ref = access.scope?.scope;
  switch (ref?.oneofKind) {
    case 'organization':
      return { scope: 'organization' };
    case 'project':
      return { scope: 'project', projectId: idValue(ref.project.projectId) };
    default:
      return { scope: 'system' };
  }
};

export class GrpcUserMapper {
  static toDomain(user: User): UserEntity {
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

  static toDomainList(list: ListUsersResponse): PaginatedList<UserEntity> {
    return {
      items: list.users.map(GrpcUserMapper.toDomain),
      pagination: list.pagination as PaginationInfo,
    };
  }

  static toCreateRequest(input: CreateUserInput): CreateUserRequest {
    return {
      username: input.username,
      password: input.password,
      email: { value: input.email },
      ...(input.displayName ? { displayName: input.displayName } : {}),
    };
  }

  /** An absent field stays absent on the wire: the server leaves it unchanged. */
  static toUpdateRequest(input: UpdateUserInput): UpdateUserRequest {
    return {
      userId: wrapId(input.userId),
      ...(input.username !== undefined && { username: input.username }),
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.email !== undefined && { email: { value: input.email } }),
    };
  }

  static accessToDomain(access: GrpcUserAccess): UserAccess {
    const { scope, projectId } = accessScopeOf(access);
    return {
      grantId: idValue(access.grantId),
      scope,
      ...(access.organizationId ? { organizationId: idValue(access.organizationId) } : {}),
      organizationName: access.organizationName,
      ...(projectId ? { projectId } : {}),
      projectName: access.projectName,
      roleId: idValue(access.roleId),
      roleName: access.roleName,
    };
  }

  static sessionToDomain(session: GrpcUserSession): UserSessionEntity {
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

  static deliveryToDomain(delivery: GrpcPasswordResetDelivery): PasswordResetDelivery {
    switch (delivery) {
      case GrpcPasswordResetDelivery.MAIL:
        return 'mail';
      case GrpcPasswordResetDelivery.SERVER_LOG:
        return 'server-log';
      default:
        return 'unknown';
    }
  }
}
