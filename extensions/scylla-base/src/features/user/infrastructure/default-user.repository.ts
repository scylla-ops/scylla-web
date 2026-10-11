import type { UserRepository } from '@base/features/user/domain/repository/user.repository.ts';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import type { UserAccess } from '@base/features/user/domain/structs/user-access.struct.ts';
import type { IUserServiceClient } from '@base/generated/scylla/user/v1/user.client.ts';
import type { User } from '@base/generated/scylla/user/v1/user.ts';
import type { PasswordResetDelivery } from '@base/features/login';
import type { PaginatedList } from '@scylla/ui/structs';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import { GrpcUserMapper } from './grpc-user.mapper.ts';

/** The wrapped entity is optional on the wire: fail here rather than pass an empty user on. */
const requireUser = (user: User | undefined): UserEntity => {
  if (!user) throw new Error('Server returned a response without a user.');
  return GrpcUserMapper.toDomain(user);
};

export class DefaultUserRepository implements UserRepository {
  constructor(private readonly client: IUserServiceClient) {}

  public getAll(): Promise<ScyllaResult<PaginatedList<UserEntity>>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listUsers({}).response;
      return GrpcUserMapper.toDomainList(response);
    }, 'Failed to fetch users.');
  }

  public getById(userId: string): Promise<ScyllaResult<UserEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.getUser({ userId: wrapId(userId) }).response;
      return requireUser(response.user);
    }, 'Error fetching user');
  }

  public getMe(): Promise<ScyllaResult<UserEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.getMe({}).response;
      return requireUser(response.user);
    }, 'Failed to fetch your account.');
  }

  public create(input: CreateUserInput): Promise<ScyllaResult<UserEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.createUser(GrpcUserMapper.toCreateRequest(input)).response;
      return requireUser(response.user);
    }, 'Failed to create user.');
  }

  public update(input: UpdateUserInput): Promise<ScyllaResult<UserEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.updateUser(GrpcUserMapper.toUpdateRequest(input)).response;
      return requireUser(response.user);
    }, 'Failed to update user.');
  }

  public delete(userId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteUser({ userId: wrapId(userId) }).response;
    }, 'Failed to delete user.');
  }

  public setActive(userId: string, isActive: boolean): Promise<ScyllaResult<UserEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.setUserActive({ userId: wrapId(userId), isActive })
        .response;
      return requireUser(response.user);
    }, 'Failed to change the status of the user.');
  }

  public changePassword(currentPassword: string, newPassword: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.changePassword({ currentPassword, newPassword }).response;
    }, 'Failed to change the password.');
  }

  public sendPasswordReset(userId: string): Promise<ScyllaResult<PasswordResetDelivery>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.sendPasswordReset({ userId: wrapId(userId) }).response;
      return GrpcUserMapper.deliveryToDomain(response.delivery);
    }, 'Failed to send a reset link.');
  }

  public revokeSessions(userId: string): Promise<ScyllaResult<number>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.revokeUserSessions({ userId: wrapId(userId) }).response;
      return response.revoked;
    }, 'Failed to sign out the sessions.');
  }

  public deleteAccount(password: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteAccount({ password }).response;
    }, 'Failed to delete the account.');
  }

  public listAccess(userId: string): Promise<ScyllaResult<UserAccess[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listUserAccess({ userId: wrapId(userId) }).response;
      return response.access.map(GrpcUserMapper.accessToDomain);
    }, 'Failed to fetch the organizations and roles of the user.');
  }

  public listSessions(userId: string): Promise<ScyllaResult<UserSessionEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listUserSessions({ userId: wrapId(userId) }).response;
      return response.sessions.map(GrpcUserMapper.sessionToDomain);
    }, 'Failed to fetch the sessions of the user.');
  }

  public revokeSession(userId: string, sessionId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.revokeUserSession({
        userId: wrapId(userId),
        sessionId: wrapId(sessionId),
      }).response;
    }, 'Failed to sign out the session.');
  }
}
