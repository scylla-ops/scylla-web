import type { LoginRemoteDataSource } from '@base/features/login/infrastructure/repository/data-sources/login-remote.data-source.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import { AuthServiceClient } from '@base/generated/scylla/auth/v1/auth.client.ts';
import type { ScyllaGrpcTransport } from '@platform/grpc';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import { openSession } from '@base/features/login/infrastructure/session/session.ts';
import { t } from '@lingui/core/macro';

/**
 * UNAUTHENTICATED here means wrong credentials, not an expired session: re-code it,
 * or the global handler signs out and reloads the login page. The backend message
 * is dropped: it could tell whether the account exists.
 */
const invalidCredentials = () =>
  new ScyllaError(t`Incorrect credentials`, {
    cause: { code: 'INVALID_CREDENTIALS' },
  });

export class GrpcLoginRemoteDataSource implements LoginRemoteDataSource {
  private readonly _authClient: AuthServiceClient;

  constructor(transport: ScyllaGrpcTransport) {
    this._authClient = new AuthServiceClient(transport.getTransport());
  }

  public async login(identifier: string, password: string): Promise<ScyllaResult<void>> {
    const result = await ScyllaResult.tryAsync<void>(async () => {
      const { response } = await this._authClient.login({ identifier, password });

      openSession(response.token, idValue(response.userId));
    }, 'Failed to login.');

    return result.mapError(error =>
      error.getCode() === 'UNAUTHENTICATED' ? invalidCredentials() : error,
    );
  }

  public async requestPasswordReset(email: string): Promise<ScyllaResult<PasswordResetDelivery>> {
    return ScyllaResult.tryAsync(
      async () =>
        (await this._authClient.requestPasswordReset({ email: { value: email } }).response)
          .delivery,
      'Failed to request a password reset.',
    );
  }

  public async resetPassword(token: string, newPassword: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this._authClient.resetPassword({ token, newPassword }).response;
    }, 'Failed to reset the password.');
  }
}
