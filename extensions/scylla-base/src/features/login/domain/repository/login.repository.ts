import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset.struct.ts';

export interface LoginRepository {
  /** `identifier` is an email when it holds '@', else a username. */
  login(identifier: string, password: string): Promise<ScyllaResult<void>>;
  /** The same answer whether an account uses the email or not. */
  requestPasswordReset(email: string): Promise<ScyllaResult<PasswordResetDelivery>>;
  /** FAILED_PRECONDITION: the link is unknown, used or expired, or the account is inactive. */
  resetPassword(token: string, newPassword: string): Promise<ScyllaResult<void>>;
}
