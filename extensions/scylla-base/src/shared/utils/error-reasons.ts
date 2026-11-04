import { t } from '@lingui/core/macro';

/**
 * The text of each refusal code that the server sends in `google.rpc.ErrorInfo.reason`. The code
 * is stable; the English message of the server is not shown for a code that is here.
 */
const MESSAGES: Record<string, (metadata: Readonly<Record<string, string>>) => string> = {
  // Accounts.
  EMAIL_IN_USE: () => t`An account already uses this email`,
  HANDLE_IN_USE: () => t`Another account already uses this handle`,
  EMAIL_NOT_VERIFIED: () => t`Verify your email address first`,
  EMAIL_REQUIRED: () => t`The identity provider gives no email address`,
  IDENTITY_IN_USE: () => t`This identity is already linked to another account`,
  INVITATION_FOR_ANOTHER_EMAIL: () => t`This invitation is for another email address`,
  INVITATION_REQUIRED: () => t`An invitation is required to sign up`,
  SIGN_UP_CLOSED: () => t`Sign-up is closed on this server`,
  NO_ACCOUNT: () => t`No account is linked to this identity`,
  LAST_ADMIN: () => t`The server needs at least one other administrator`,
  LAST_SIGN_IN_METHOD: () => t`Add another sign-in method before you remove this one`,
  SELF_NOT_ALLOWED: () => t`You cannot do this on your own account`,
  RESEND_TOO_SOON: ({ retry_after_seconds: seconds }) =>
    seconds ? t`Wait ${seconds} seconds before you send it again` : t`Wait before you send it again`,
  // Workspaces and members.
  SLUG_IN_USE: () => t`Another workspace already uses this slug`,
  WORKSPACE_NOT_EMPTY: () => t`Delete the projects and the agents of the workspace first`,
  LAST_OWNER: () => t`The workspace needs at least one other owner`,
  INVITATION_PENDING: () => t`An invitation is already pending for this email`,
  ACTOR_OUTSIDE_WORKSPACE: () => t`An app gets roles only in its own workspace`,
  QUOTA_EXCEEDED: ({ used, limit }) =>
    used && limit ? t`The limit is reached (${used} of ${limit})` : t`The limit is reached`,
  // Projects.
  SECRET_NAME_IN_USE: () => t`Another secret of the project already uses this name`,
  SECRET_KEY_MISSING: () => t`The server has no key to encrypt secrets`,
  TRIGGER_NAME_IN_USE: () => t`Another trigger of the pipeline already uses this name`,
  JOB_NOT_ENDED: () => t`The job has not ended yet`,
  NOT_A_RUNNER: () => t`This app is not a runner`,
};

/** The translated text of a refusal code, or `undefined` for a code that this app does not know. */
export const reasonMessage = (
  reason: string,
  metadata: Readonly<Record<string, string>>,
): string | undefined => MESSAGES[reason]?.(metadata);
