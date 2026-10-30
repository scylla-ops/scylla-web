import type { UserRepository } from '@base/features/user/domain/repository/user.repository.ts';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import type { UserAccess } from '../domain/entities/user.entity.ts';
import type { IUserServiceClient } from '@base/generated/scylla/user/v1/user.client.ts';
import type { User } from '@base/generated/scylla/user/v1/user.ts';
import type { PasswordResetDelivery } from '@base/features/login';
import type { PaginatedList } from '@scylla/ui/structs';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcUser from './grpc-user.mapper.ts';

/** The wrapped entity is optional on the wire: fail here rather than pass an empty user on. */
const requireUser = (user: User | undefined): UserEntity => {
  if (!user) throw new Error('Server returned a response without a user.');
  return grpcUser.toDomain(user);
};

export class DefaultUserRepository implements UserRepository {
  constructor(private readonly client: IUserServiceClient) {}

  public async getAll(): Promise<PaginatedList<UserEntity>> {
    const response = await this.client.listUsers({}).response;
    return grpcUser.toDomainList(response);
  }

  public async getById(userId: string): Promise<UserEntity> {
    const response = await this.client.getUser({ userId: wrapId(userId) }).response;
    return requireUser(response.user);
  }

  public async getMe(): Promise<UserEntity> {
    const response = await this.client.getMe({}).response;
    return requireUser(response.user);
  }

  public async create(input: CreateUserInput): Promise<UserEntity> {
    const response = await this.client.createUser(grpcUser.toCreateRequest(input)).response;
    return requireUser(response.user);
  }

  public async update(input: UpdateUserInput): Promise<UserEntity> {
    const response = await this.client.updateUser(grpcUser.toUpdateRequest(input)).response;
    return requireUser(response.user);
  }

  public async delete(userId: string): Promise<void> {
    await this.client.deleteUser({ userId: wrapId(userId) }).response;
  }

  public async setActive(userId: string, isActive: boolean): Promise<UserEntity> {
    const response = await this.client.setUserActive({ userId: wrapId(userId), isActive }).response;
    return requireUser(response.user);
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.changePassword({ currentPassword, newPassword }).response;
  }

  public async sendPasswordReset(userId: string): Promise<PasswordResetDelivery> {
    const response = await this.client.sendPasswordReset({ userId: wrapId(userId) }).response;
    return grpcUser.deliveryToDomain(response.delivery);
  }

  public async revokeSessions(userId: string): Promise<number> {
    const response = await this.client.revokeUserSessions({ userId: wrapId(userId) }).response;
    return response.revoked;
  }

  public async deleteAccount(password: string): Promise<void> {
    await this.client.deleteAccount({ password }).response;
  }

  public async listAccess(userId: string): Promise<UserAccess[]> {
    const response = await this.client.listUserAccess({ userId: wrapId(userId) }).response;
    return response.access.map(grpcUser.accessToDomain);
  }

  public async listSessions(userId: string): Promise<UserSessionEntity[]> {
    const response = await this.client.listUserSessions({ userId: wrapId(userId) }).response;
    return response.sessions.map(grpcUser.sessionToDomain);
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.client.revokeUserSession({
      userId: wrapId(userId),
      sessionId: wrapId(sessionId),
    }).response;
  }
}
