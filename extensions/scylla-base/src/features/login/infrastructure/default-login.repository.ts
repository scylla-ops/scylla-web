import { t } from '@lingui/core/macro';
import type { LoginRepository } from '@base/features/login/domain/repository/login.repository.ts';
import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset.struct.ts';
import type { IAuthServiceClient } from '@base/generated/scylla/auth/v1/auth.client.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcPasswordReset from './grpc-password-reset.mapper.ts';
import { openSession } from './session.ts';

/**
 * UNAUTHENTICATED here means wrong credentials, not an expired session: re-code it,
 * or the global handler signs out and reloads the login page. The backend message
 * is dropped: it could tell whether the account exists.
 */
const invalidCredentials = () =>
  new ScyllaError(t`Incorrect credentials`, {
    cause: { code: 'INVALID_CREDENTIALS' },
  });

export class DefaultLoginRepository implements LoginRepository {
  constructor(private readonly client: IAuthServiceClient) {}

  public async login(identifier: string, password: string): Promise<ScyllaResult<void>> {
    const result = await ScyllaResult.tryAsync<void>(async () => {
      const response = await this.client.login({ identifier, password }).response;
      openSession(response.token, idValue(response.userId));
    }, 'Failed to login.');

    return result.mapError(error =>
      error.getCode() === 'UNAUTHENTICATED' ? invalidCredentials() : error,
    );
  }

  public requestPasswordReset(email: string): Promise<ScyllaResult<PasswordResetDelivery>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.requestPasswordReset({ email: { value: email } }).response;
      return grpcPasswordReset.deliveryToDomain(response.delivery);
    }, 'Failed to request a password reset.');
  }

  public resetPassword(token: string, newPassword: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.resetPassword({ token, newPassword }).response;
    }, 'Failed to reset the password.');
  }
}
