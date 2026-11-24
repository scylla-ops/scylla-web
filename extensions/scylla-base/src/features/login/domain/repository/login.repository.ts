import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset-delivery.struct.ts';
import type { PendingLink } from '@base/features/login/domain/structs/pending-link.struct.ts';
import type { SignInMethods } from '@base/features/login/domain/structs/sign-in-methods.struct.ts';
import type {
  TermsAcceptance,
  TermsStatus,
} from '@base/features/login/domain/structs/terms-status.struct.ts';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  /** The token of an invitation link, or empty. */
  invitationToken?: string;
  /** The version of the terms of service that the person accepted: absent when none need it. */
  acceptedTermsVersion?: string;
}

export interface LoginRepository {
  /** `identifier` is an email when it holds '@', else a handle. */
  login(identifier: string, password: string): Promise<void>;
  /** The identity providers and the sign-up mode of the server, for the sign-in page. */
  listSignInMethods(): Promise<SignInMethods>;
  /** The link that waits in a cookie of this browser. NOT_FOUND: none. */
  pendingLink(): Promise<PendingLink>;
  /** Returns the page to go to. FAILED_PRECONDITION with WRONG_PASSWORD: the link still waits. */
  linkPendingIdentity(password: string): Promise<string>;
  /**
   * The same answer for a new and for a known email: a mail goes to the address.
   * FAILED_PRECONDITION with TERMS_NOT_ACCEPTED: the terms changed, metadata `version`.
   */
  signUp(input: SignUpInput): Promise<void>;
  /** The terms of service of the user of the session (`GetMe`). */
  termsStatus(): Promise<TermsStatus>;
  /** FAILED_PRECONDITION with TERMS_NOT_ACCEPTED: `version` is not the current version. */
  acceptTerms(version: string): Promise<TermsAcceptance>;
  /** FAILED_PRECONDITION: the link is unknown, used or expired. */
  verifyEmail(token: string): Promise<void>;
  /** The same answer whether an account uses the email or not. */
  requestPasswordReset(email: string): Promise<PasswordResetDelivery>;
  /** FAILED_PRECONDITION: the link is unknown, used or expired, or the account is inactive. */
  resetPassword(token: string, newPassword: string): Promise<void>;
}
