import { t } from '@lingui/core/macro';
import type {
  LoginRepository,
  SignUpInput,
} from '@base/features/login/domain/repository/login.repository.ts';
import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset-delivery.struct.ts';
import type { SignInMethods } from '@base/features/login/domain/structs/sign-in-methods.struct.ts';
import type { IAccountServiceClient } from '@base/generated/scylla/accounts/v1/account_service.client.ts';
import type { IProfileServiceClient } from '@base/generated/scylla/accounts/v1/profile_service.client.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import { signInMethodsToDomain } from './grpc-sign-in-methods.mapper.ts';
import { openSession, rememberUser } from './session.ts';

/**
 * UNAUTHENTICATED here means wrong credentials, not an expired session: re-code it,
 * or the global handler signs out and reloads the login page. The backend message
 * is dropped: it could tell whether the account exists.
 */
const invalidCredentials = () =>
  new ScyllaError(t`Incorrect credentials`, { code: 'INVALID_CREDENTIALS' });

export class DefaultLoginRepository implements LoginRepository {
  constructor(
    private readonly accounts: IAccountServiceClient,
    private readonly profiles: IProfileServiceClient,
  ) {}

  public async login(identifier: string, password: string): Promise<void> {
    let token;
    try {
      // `cookie`: the server keeps the refresh token in an HttpOnly cookie.
      ({ token } = await this.accounts.signIn({ identifier, password, cookie: true }).response);
    } catch (error) {
      throw ScyllaError.from(error).code === 'UNAUTHENTICATED' ? invalidCredentials() : error;
    }
    // The token first: `GetMe` needs it.
    openSession(token);
    rememberUser(await this.currentUserId());
  }

  /** The id of the user of the session. */
  public async currentUserId(): Promise<string> {
    const { user } = await this.profiles.getMe({}).response;
    return idValue(user?.id);
  }

  public async listSignInMethods(): Promise<SignInMethods> {
    return signInMethodsToDomain(await this.accounts.listSignInMethods({}).response);
  }

  public async signUp({ email, password, displayName, invitationToken = '' }: SignUpInput) {
    await this.accounts.signUp({ email, password, displayName, invitationToken }).response;
  }

  public async verifyEmail(token: string): Promise<void> {
    await this.accounts.verifyEmail({ token }).response;
  }

  /** The server sends a mail; with no mail server, it writes the link in its log. */
  public async requestPasswordReset(email: string): Promise<PasswordResetDelivery> {
    await this.accounts.requestPasswordReset({ email }).response;
    return 'unknown';
  }

  public async resetPassword(token: string, password: string): Promise<void> {
    await this.accounts.resetPassword({ token, password }).response;
  }
}
