import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';

export interface LoginRemoteDataSource {
  login(identifier: string, password: string): Promise<ScyllaResult<void>>;
  requestPasswordReset(email: string): Promise<ScyllaResult<PasswordResetDelivery>>;
  resetPassword(token: string, newPassword: string): Promise<ScyllaResult<void>>;
}
