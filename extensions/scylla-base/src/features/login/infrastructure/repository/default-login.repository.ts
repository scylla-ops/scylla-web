import type { LoginRepository } from '@base/features/login/domain/repository/login.repository.ts';
import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset.struct.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { LoginRemoteDataSource } from '@base/features/login/infrastructure/repository/data-sources/login-remote.data-source.ts';
import { GrpcPasswordResetMapper } from '@base/features/login/infrastructure/repository/mappers/grpc-password-reset.mapper.ts';

export class DefaultLoginRepository implements LoginRepository {
  constructor(private readonly loginRemoteStore: LoginRemoteDataSource) {}

  login(identifier: string, password: string): Promise<ScyllaResult<void>> {
    return this.loginRemoteStore.login(identifier, password);
  }

  async requestPasswordReset(email: string): Promise<ScyllaResult<PasswordResetDelivery>> {
    return (await this.loginRemoteStore.requestPasswordReset(email)).map(
      GrpcPasswordResetMapper.deliveryToDomain,
    );
  }

  resetPassword(token: string, newPassword: string): Promise<ScyllaResult<void>> {
    return this.loginRemoteStore.resetPassword(token, newPassword);
  }
}
