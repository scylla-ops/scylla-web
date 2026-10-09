import type { UserRemoteDataSource } from '@base/features/user/infrastructure/repository/data-sources/user-remote.data-source.ts';
import type { UserRepository } from '@base/features/user/domain/repository/user.repository.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '@base/features/login';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import type { UserAccess } from '@base/features/user/domain/structs/user-access.struct.ts';
import { GrpcUserMapper } from '@base/features/user/infrastructure/repository/mappers/grpc-user.mapper.ts';
import type { PaginatedList } from '@scylla/ui/structs';

export class DefaultUserRepository implements UserRepository {
  constructor(private readonly _remoteDataSource: UserRemoteDataSource) {}

  public async getAll(): Promise<ScyllaResult<PaginatedList<UserEntity>>> {
    return (await this._remoteDataSource.getAll()).map(list => GrpcUserMapper.toDomainList(list));
  }

  public async getById(id: string): Promise<ScyllaResult<UserEntity>> {
    return (await this._remoteDataSource.getById(id)).map(GrpcUserMapper.toDomain);
  }

  public async getMe(): Promise<ScyllaResult<UserEntity>> {
    return (await this._remoteDataSource.getMe()).map(GrpcUserMapper.toDomain);
  }

  public async create(input: CreateUserInput): Promise<ScyllaResult<UserEntity>> {
    return (await this._remoteDataSource.create(GrpcUserMapper.toCreateRequest(input))).map(
      GrpcUserMapper.toDomain,
    );
  }

  public async update(input: UpdateUserInput): Promise<ScyllaResult<UserEntity>> {
    return (await this._remoteDataSource.update(GrpcUserMapper.toUpdateRequest(input))).map(
      GrpcUserMapper.toDomain,
    );
  }

  public async delete(userId: string): Promise<ScyllaResult<void>> {
    return this._remoteDataSource.delete(userId);
  }

  public async setActive(userId: string, isActive: boolean): Promise<ScyllaResult<UserEntity>> {
    return (await this._remoteDataSource.setActive(userId, isActive)).map(GrpcUserMapper.toDomain);
  }

  public async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ScyllaResult<void>> {
    return this._remoteDataSource.changePassword(currentPassword, newPassword);
  }

  public async sendPasswordReset(userId: string): Promise<ScyllaResult<PasswordResetDelivery>> {
    return (await this._remoteDataSource.sendPasswordReset(userId)).map(
      GrpcUserMapper.deliveryToDomain,
    );
  }

  public async revokeSessions(userId: string): Promise<ScyllaResult<number>> {
    return this._remoteDataSource.revokeSessions(userId);
  }

  public async deleteAccount(password: string): Promise<ScyllaResult<void>> {
    return this._remoteDataSource.deleteAccount(password);
  }

  public async listAccess(userId: string): Promise<ScyllaResult<UserAccess[]>> {
    return (await this._remoteDataSource.listAccess(userId)).map(access =>
      access.map(GrpcUserMapper.accessToDomain),
    );
  }

  public async listSessions(userId: string): Promise<ScyllaResult<UserSessionEntity[]>> {
    return (await this._remoteDataSource.listSessions(userId)).map(sessions =>
      sessions.map(GrpcUserMapper.sessionToDomain),
    );
  }

  public async revokeSession(userId: string, sessionId: string): Promise<ScyllaResult<void>> {
    return this._remoteDataSource.revokeSession(userId, sessionId);
  }
}
