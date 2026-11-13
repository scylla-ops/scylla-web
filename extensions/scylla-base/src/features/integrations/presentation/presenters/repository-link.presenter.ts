import { t } from '@scylla/ui/i18n';
import { getRelativeTime } from '@shared/utils/date-utils.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { MergeBlock } from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import type {
  DeliveryTest,
  RepositoryLink,
} from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type {
  ProviderRepository,
  VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import type { VcsProvider } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
import { integrationsMessages } from '../messages/integrations.messages.ts';
import { repositoryMessages as messages } from '../messages/repository.messages.ts';
import { stateReasonText } from './connection.presenter.ts';

const DEFAULT_HOSTS = { github: 'github.com', gitlab: 'gitlab.com' } as const;

export const providerName = (provider: VcsProvider): string =>
  t(provider === 'github' ? integrationsMessages.github : integrationsMessages.gitlab);

/** The host of an address of the provider, for example github.com. */
export const hostOf = (url: string, provider: VcsProvider): string => {
  try {
    return new URL(url).host || DEFAULT_HOSTS[provider];
  } catch {
    return DEFAULT_HOSTS[provider];
  }
};

const visibility = (isPrivate: boolean): string =>
  t(isPrivate ? messages.private : messages.public);

/** "Private · connection acme · github.com". */
export const linkSubtitle = (link: RepositoryLink): string =>
  t(messages.viaConnection(visibility(link.private), link.account, hostOf(link.webUrl, link.provider)));

/** "acme · github.com": a connection in the picker. */
export const connectionOptionLabel = (connection: VcsConnectionEntity): string =>
  t(messages.connectionOption(connection.account, hostOf(connection.settingsUrl, connection.provider)));

/** How Scylla learns about the new commits, and what the person can do about it. */
export interface EventsLine {
  mode: RepositoryLink['deliveryMode'];
  text: string;
  /** Why the link polls. Empty for webhooks. */
  reason: string;
  /** `test` sends a test webhook; `enable_again` too, and GitLab turns the webhook on again. */
  action: 'test' | 'enable_again' | null;
}

export const eventsLine = (link: RepositoryLink): EventsLine => {
  const usable = link.state === 'active';
  if (link.deliveryMode === 'webhook') {
    return {
      mode: 'webhook',
      text: link.lastEventAt
        ? t(messages.webhooksLastEvent(getRelativeTime(link.lastEventAt)))
        : t(messages.webhooksNoEvent),
      reason: '',
      action: usable ? 'test' : null,
    };
  }
  const minutes = Math.max(1, Math.round(link.pollIntervalSeconds / 60));
  const polling = { mode: 'polling' as const, text: t(integrationsMessages.pollingEvery(minutes)) };
  switch (link.stateReason) {
    case 'ROLE_TOO_LOW':
      return { ...polling, reason: t(messages.roleTooLow), action: null };
    case 'WEBHOOK_DISABLED':
      return { ...polling, reason: t(messages.webhookDisabled), action: 'enable_again' };
    default:
      return usable
        ? { ...polling, reason: t(messages.cannotReach(providerName(link.provider))), action: 'test' }
        : { ...polling, reason: '', action: null };
  }
};

/** Where a person repairs a link that stopped. */
export type LinkRepair = 'integrations' | 'configure';

/** Why the link stopped, in words. `null` when the events line tells the reason, or none. */
export const linkAlert = (link: RepositoryLink): { text: string; repair: LinkRepair } | null => {
  if (link.state === 'active') return null;
  switch (link.stateReason) {
    case 'ROLE_TOO_LOW':
    case 'WEBHOOK_DISABLED':
      return null;
    case 'REPOSITORY_NOT_VISIBLE':
      return {
        text: t(
          link.provider === 'github'
            ? messages.repositoryNotVisibleGitHub(link.fullName)
            : messages.repositoryNotVisibleGitLab(link.fullName),
        ),
        repair: 'configure',
      };
    default:
      return { text: stateReasonText(link), repair: 'integrations' };
  }
};

/** The names of the reports, one per pipeline, in the order of the server. */
export const reportContexts = (blocks: readonly MergeBlock[]): string[] => [
  ...new Set(blocks.map(block => block.context).filter(Boolean)),
];

/** What stops when the project loses its repository. */
export const unlinkStops = (link: RepositoryLink, blocks: readonly MergeBlock[]): string[] => {
  const stops = [t(messages.stopsTriggers)];
  if (link.pipelineSource === 'file') stops.push(t(messages.stopsFiles));
  stops.push(t(messages.stopsCheckout));
  if (link.reportsEnabled) stops.push(t(messages.stopsReports(providerName(link.provider))));
  const rules = blocks.filter(block => block.enabled);
  if (rules.length > 0) {
    stops.push(
      link.provider === 'gitlab'
        ? t(messages.stopsGitLabMergeRule)
        : t(messages.stopsMergeRules(reportContexts(rules).join(', '))),
    );
  }
  if (link.provider === 'gitlab' && link.deliveryMode === 'webhook') {
    stops.push(t(messages.deletesWebhook));
  }
  return stops;
};

/** The result of a test webhook, beside the events line. */
export interface DeliveryResult {
  delivered: boolean;
  text: string;
}

export const deliveryResult = (test: DeliveryTest): DeliveryResult => ({
  delivered: test.delivered,
  text: test.delivered
    ? t(messages.delivered)
    : test.error
      ? t(messages.notDelivered(test.error))
      : t(messages.notDeliveredNoReason),
});

/** A server without the test of the webhooks answers UNIMPLEMENTED: that is not a fault. */
export const deliveryErrorText = (error: unknown): string => {
  const refusal = ScyllaError.from(error);
  return refusal.code === 'UNIMPLEMENTED' ? t(messages.testNotServed) : refusal.userMessage();
};

/** The refusal of a link, in the words of the dialog. */
export const linkErrorText = (error: unknown): string => {
  const refusal = ScyllaError.from(error);
  switch (refusal.reason) {
    case 'REPOSITORY_ALREADY_LINKED':
      return t(messages.alreadyLinked);
    case 'REPOSITORY_NOT_VISIBLE':
      return t(messages.notVisible);
    default:
      return refusal.userMessage();
  }
};

const ROLES = {
  developer: messages.developer,
  maintainer: messages.maintainer,
  owner: messages.owner,
} as const;

const roleLabel = (role: string): string =>
  role in ROLES ? t(ROLES[role as keyof typeof ROLES]) : role;

/**
 * "Private · default branch main · Maintainer · linked to the project Mocks". `projectName` is
 * the name of the project of the link, when the reader can see it.
 */
export const repositoryOptionDetails = (
  repository: ProviderRepository,
  projectName?: string,
): string => {
  const details = t(
    messages.repositoryDetails(visibility(repository.private), repository.defaultBranch),
  );
  const withRole = repository.role
    ? t(messages.repositoryRole(details, roleLabel(repository.role)))
    : details;
  if (!repository.linkedProjectId) return withRole;
  return projectName
    ? t(messages.linkedTo(withRole, projectName))
    : t(messages.linkedElsewhere(withRole));
};
