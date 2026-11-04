import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset-delivery.struct.ts';
import type { SignInMethods } from '@base/features/login/domain/structs/sign-in-methods.struct.ts';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  /** The token of an invitation link, or empty. */
  invitationToken?: string;
}

export interface LoginRepository {
  /** `identifier` is an email when it holds '@', else a handle. */
  login(identifier: string, password: string): Promise<void>;
  /** The identity providers and the sign-up mode of the server, for the sign-in page. */
  listSignInMethods(): Promise<SignInMethods>;
  /** The same answer for a new and for a known email: a mail goes to the address. */
  signUp(input: SignUpInput): Promise<void>;
  /** FAILED_PRECONDITION: the link is unknown, used or expired. */
  verifyEmail(token: string): Promise<void>;
  /** The same answer whether an account uses the email or not. */
  requestPasswordReset(email: string): Promise<PasswordResetDelivery>;
  /** FAILED_PRECONDITION: the link is unknown, used or expired, or the account is inactive. */
  resetPassword(token: string, newPassword: string): Promise<void>;
}
