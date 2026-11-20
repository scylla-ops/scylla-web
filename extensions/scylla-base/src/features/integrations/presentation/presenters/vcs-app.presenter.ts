import { t } from '@scylla/ui/i18n';
import { getRelativeTime } from '@shared/utils/date-utils.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { VcsAppEntity } from '@base/features/integrations/domain/entities/vcs-app.entity.ts';
import type { GitHubOrganizationIssue } from '@base/features/integrations/domain/structs/github-organization.struct.ts';
import { gitProvidersMessages as messages } from '../messages/git-providers.messages.ts';

/** The line under the name of an App: its page with no scheme, its id, and its owner. */
export const appSubtitle = (app: VcsAppEntity): string => {
  const page = app.webUrl.replace(/^https?:\/\//, '');
  const line = t(messages.appSubtitle(page, app.appId));
  return app.owner ? `${line} · ${t(messages.ownedBy(app.owner))}` : line;
};

/** The status and the age of the last webhook, or that none came yet. */
export const deliveryText = (app: VcsAppEntity): string =>
  app.lastDeliveryAt
    ? t(messages.delivery(app.lastDeliveryStatus, getRelativeTime(app.lastDeliveryAt)))
    : t(messages.noDelivery);

/** A status of 2xx: the server took the webhook. */
export const deliveryPassed = (app: VcsAppEntity): boolean =>
  app.lastDeliveryStatus >= 200 && app.lastDeliveryStatus < 300;

/** The text of a refusal of the manifest flow, in the words of the page. */
export const manifestErrorText = (error: unknown): string => {
  const refusal = ScyllaError.from(error);
  switch (refusal.reason) {
    case 'STATE_EXPIRED':
      return t(messages.stateExpired);
    case 'APP_EXISTS':
      return t(messages.appExists);
    case 'SECRET_KEY_MISSING':
      return t(messages.secretKeyMissing);
    case 'APP_MANAGED_BY_SETTINGS':
      return t(messages.managedBySettings);
    case 'PROVIDER_UNAVAILABLE':
      return t(messages.githubUnavailable);
    default:
      return refusal.userMessage();
  }
};

/** Why the organization cannot be sent, under its field. */
export const organizationIssueText = (issue: GitHubOrganizationIssue | null): string => {
  if (issue === 'required') return t(messages.organizationRequired);
  if (issue === 'invalid') return t(messages.organizationInvalid);
  return '';
};
