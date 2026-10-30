import { t } from '@lingui/core/macro';
import type { LoginRepository } from '@base/features/login/domain/repository/login.repository.ts';
import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset-delivery.struct.ts';
import type { IAuthServiceClient } from '@base/generated/scylla/auth/v1/auth.client.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcPasswordReset from './grpc-password-reset.mapper.ts';
import { openSession } from './session.ts';

/**
 * UNAUTHENTICATED here means wrong credentials, not an expired session: re-code it,
 * or the global handler signs out and reloads the login page. The backend message
 * is dropped: it could tell whether the account exists.
 */
const invalidCredentials = () =>
  new ScyllaError(t`Incorrect credentials`, { code: 'INVALID_CREDENTIALS' });

export class DefaultLoginRepository implements LoginRepository {
  constructor(private readonly client: IAuthServiceClient) {}

  public async login(identifier: string, password: string): Promise<void> {
    try {
      const response = await this.client.login({ identifier, password }).response;
      openSession(response.token, idValue(response.userId));
    } catch (error) {
      throw ScyllaError.from(error).code === 'UNAUTHENTICATED' ? invalidCredentials() : error;
    }
  }

  public async requestPasswordReset(email: string): Promise<PasswordResetDelivery> {
    const response = await this.client.requestPasswordReset({ email: { value: email } }).response;
    return grpcPasswordReset.deliveryToDomain(response.delivery);
  }

  public async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.client.resetPassword({ token, newPassword }).response;
  }
}
