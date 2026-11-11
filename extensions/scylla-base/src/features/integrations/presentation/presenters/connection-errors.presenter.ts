import { t } from '@scylla/ui/i18n';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { connectGitHubMessages } from '../messages/connect-github.messages.ts';
import { connectGitLabMessages } from '../messages/connect-gitlab.messages.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from now to the time, at least 0. */
export const daysUntil = (iso: string, now: number): number =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - now) / DAY_MS));

/** The text of a refusal of the GitHub install, in the words of the flow. */
export const installErrorText = (error: unknown): string => {
  const refusal = ScyllaError.from(error);
  switch (refusal.reason) {
    case 'STATE_EXPIRED':
      return t(connectGitHubMessages.stateExpired);
    case 'INSTALLATION_NOT_VISIBLE':
      return t(connectGitHubMessages.installationNotVisible);
    case 'INSTALL_CANCELLED':
      return t(connectGitHubMessages.installCancelled);
    case 'INSTALL_PENDING_APPROVAL':
      return t(connectGitHubMessages.pendingApproval);
    default:
      return refusal.userMessage();
  }
};

/** The text of a refusal of a GitLab token, shown under the field. */
export const gitLabErrorText = (error: unknown): string => {
  const refusal = ScyllaError.from(error);
  switch (refusal.reason) {
    case 'TOKEN_INVALID':
    case 'PROVIDER_REFUSED':
      return t(connectGitLabMessages.tokenInvalid);
    case 'TOKEN_SCOPE_MISSING':
      return t(connectGitLabMessages.tokenScopeMissing);
    case 'SECRET_KEY_MISSING':
      return t(connectGitLabMessages.secretKeyMissing);
    case 'CONNECTION_EXISTS':
      return t(connectGitLabMessages.connectionExists);
    case 'ACCOUNT_CHANGED':
      return t(connectGitLabMessages.accountChanged);
    case 'PROVIDER_UNAVAILABLE':
      return t(connectGitLabMessages.providerUnavailable);
    default:
      return refusal.userMessage();
  }
};

/** The warnings of a GitLab check, in words. A code that this build does not know is not shown. */
export const gitLabWarningTexts = (
  warnings: readonly string[],
  tokenExpiresAt: string | undefined,
  now: number,
): string[] =>
  warnings.flatMap(code => {
    if (code === 'NOT_A_SERVICE_ACCOUNT') return [t(connectGitLabMessages.notAServiceAccount)];
    if (code === 'ROLE_DEVELOPER') return [t(connectGitLabMessages.roleDeveloper)];
    if (code === 'TOKEN_EXPIRES_SOON' && tokenExpiresAt) {
      return [t(connectGitLabMessages.expiresSoon(daysUntil(tokenExpiresAt, now)))];
    }
    return [];
  });
