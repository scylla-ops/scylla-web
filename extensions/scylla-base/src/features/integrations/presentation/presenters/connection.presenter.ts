import { t } from '@scylla/ui/i18n';
import { formatDay, getRelativeTime } from '@shared/utils/date-utils.ts';
import {
  tokenExpiresSoon,
  type AccountKind,
  type ConnectionState,
  type VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import type { VcsProviderInfo } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
import { integrationsMessages as messages } from '../messages/integrations.messages.ts';

const KIND_LABELS = {
  organization: messages.organization,
  user: messages.user,
  service_account: messages.serviceAccount,
} as const;

export const accountKindLabel = (kind: AccountKind): string => t(KIND_LABELS[kind]);

/** "Organization · connected 2 min ago". */
export const connectionSubtitle = (connection: VcsConnectionEntity): string =>
  t(
    messages.connectedOn(
      accountKindLabel(connection.accountKind),
      getRelativeTime(connection.createdAt),
    ),
  );

/** What the connection can see: repositories on GitHub, projects on GitLab. */
export const repositoriesLabel = (connection: VcsConnectionEntity): string => {
  if (connection.provider === 'gitlab') return t(messages.projectCount(connection.repositoryCount));
  return connection.allRepositories
    ? t(messages.allRepositories)
    : t(messages.repositoryCount(connection.repositoryCount));
};

export const eventsLabel = (connection: VcsConnectionEntity): string =>
  connection.deliveryMode === 'polling'
    ? t(messages.pollingEvery(Math.max(1, Math.round(connection.pollIntervalSeconds / 60))))
    : t(messages.webhooks);

const STATE_LABELS = {
  active: messages.active,
  suspended: messages.suspended,
  needs_attention: messages.needsAttention,
  disconnected: messages.disconnected,
} as const;

export const stateLabel = (state: ConnectionState): string => t(STATE_LABELS[state]);

/** The color of the state chip: a theme token. */
export const stateTone = (
  state: ConnectionState,
): 'success' | 'warning' | 'destructive' | 'muted' => {
  if (state === 'active') return 'success';
  if (state === 'needs_attention') return 'warning';
  if (state === 'disconnected') return 'destructive';
  return 'muted';
};

/** Why the connection is not active, in words. Empty for an active connection. */
export const stateReasonText = (connection: VcsConnectionEntity): string => {
  if (connection.state === 'active') return '';
  switch (connection.stateReason) {
    case 'APP_UNINSTALLED':
      return t(messages.appUninstalled(connection.account));
    case 'APP_SUSPENDED':
      return t(messages.appSuspended(connection.account));
    case 'PERMISSIONS_NOT_ACCEPTED':
      return t(messages.permissionsNotAccepted);
    case 'TOKEN_EXPIRED':
      return t(messages.tokenExpired);
    case 'TOKEN_REVOKED':
      return t(messages.tokenRevoked);
    case 'TOKEN_SCOPE_MISSING':
      return t(messages.tokenScopeMissing);
    default:
      return t(messages.unknownReason);
  }
};

/** The expiry of a GitLab token, when it has one. */
export const tokenExpiryText = (connection: VcsConnectionEntity, now: number): string => {
  if (!connection.tokenExpiresAt) return '';
  const day = formatDay(connection.tokenExpiresAt);
  return new Date(connection.tokenExpiresAt).getTime() <= now
    ? t(messages.tokenExpiredOn(day))
    : t(messages.tokenExpiresOn(day));
};

/** The one action that repairs the connection, beside its state. */
export type RepairAction = 'install_again' | 'configure' | 'replace_token';

export const repairActionOf = (
  connection: VcsConnectionEntity,
  now: number,
): RepairAction | null => {
  if (connection.provider === 'gitlab') {
    return connection.state !== 'active' || tokenExpiresSoon(connection, now)
      ? 'replace_token'
      : null;
  }
  if (connection.stateReason === 'APP_UNINSTALLED') return 'install_again';
  if (connection.state !== 'active' && connection.settingsUrl) return 'configure';
  return null;
};

/** Why an admin cannot connect this provider now, or `null` when they can. */
export const unavailableText = (info: VcsProviderInfo | undefined): string | null => {
  if (!info || info.available) return null;
  if (info.unavailableReason === 'SECRET_KEY_MISSING') return t(messages.secretKeyMissing);
  return t(messages.appMissing);
};
