import BellIcon from '@lucide/svelte/icons/bell';
import ClockExclamationIcon from '@lucide/svelte/icons/clock-exclamation-point';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import LinkIcon from '@lucide/svelte/icons/link';
import LockIcon from '@lucide/svelte/icons/lock';
import MailIcon from '@lucide/svelte/icons/mail';
import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import UnlinkIcon from '@lucide/svelte/icons/unlink';
import UnplugIcon from '@lucide/svelte/icons/unplug';
import UserRoundCheckIcon from '@lucide/svelte/icons/user-round-check';
import UserRoundCogIcon from '@lucide/svelte/icons/user-round-cog';
import UserRoundXIcon from '@lucide/svelte/icons/user-round-x';
import type { MessageDescriptor } from '@lingui/core';
import { roleLabel } from '@base/features/access';
import { workspaceUrl } from '@platform/context';
import { t } from '@scylla/ui/i18n';
import type { NotificationEntity } from '../../domain/entities/notification.entity.ts';
import { notificationMessages as messages } from '../messages/notifications.messages.ts';
import { notificationsPoints, type KindView } from '../notifications.points.ts';

/** The reason of a row that is about the reader. */
export const REASON_SUBJECT = 'subject';

const actorOf = (row: NotificationEntity): string => row.actorName || t(messages.someone);
const workspaceOf = (row: NotificationEntity): string =>
  row.workspaceName || t(messages.aWorkspace);
const placeOf = (row: NotificationEntity): string => row.projectName || workspaceOf(row);
const about = (row: NotificationEntity): boolean => row.reason === REASON_SUBJECT;
const roleOf = (row: NotificationEntity): string => roleLabel(row.params.role ?? '');

/** The roles of a parameter, as names for the reader. A value that is not a list gives none. */
const rolesIn = (row: NotificationEntity, field: 'added' | 'removed'): string[] => {
  const text = row.params[field];
  if (!text) return [];
  try {
    const list: unknown = JSON.parse(text);
    if (!Array.isArray(list)) return [];
    return list.filter(item => typeof item === 'string').map(roleLabel);
  } catch {
    return [];
  }
};

const roleChanges = (row: NotificationEntity): string | null => {
  const [added, removed] = [rolesIn(row, 'added'), rolesIn(row, 'removed')];
  const parts = [
    added.length ? t(messages.rolesAdded(added.join(', '))) : null,
    removed.length ? t(messages.rolesRemoved(removed.join(', '))) : null,
  ];
  return parts.filter(Boolean).join(' ') || null;
};

/** The page of an account section: in the frame of the active workspace, if there is one. */
const accountPage =
  (section: string) =>
  (_row: NotificationEntity, slug: string | null): string =>
    slug ? workspaceUrl(slug, `account/${section}`) : `/account/${section}`;

const membersPage = (row: NotificationEntity): string | null =>
  row.workspaceSlug ? workspaceUrl(row.workspaceSlug, 'access/members') : null;

const workspacePage = (row: NotificationEntity): string | null =>
  row.workspaceSlug ? workspaceUrl(row.workspaceSlug) : null;

/** A person who lost a role can have no access left: only a new role gives a link. */
const rolePage = (row: NotificationEntity): string | null => {
  if (!rolesIn(row, 'added').length || !row.workspaceSlug) return null;
  return row.projectId
    ? workspaceUrl(row.workspaceSlug, `projects/${row.projectId}`)
    : workspaceUrl(row.workspaceSlug);
};

const roleView = (kind: string): KindView => ({
  kind,
  icon: UserRoundCogIcon,
  text: row =>
    row.actorName
      ? messages.rolesChangedBy(row.actorName, placeOf(row))
      : messages.rolesChanged(placeOf(row)),
  detail: roleChanges,
  href: rolePage,
});

const security = (
  kind: string,
  icon: KindView['icon'],
  text: KindView['text'],
  detail?: () => string,
): KindView => ({
  kind,
  icon,
  text,
  detail,
  href: accountPage('security'),
});

/** The page of the Git connections of the workspace of a row. */
const integrationsPage = (row: NotificationEntity): string | null =>
  row.workspaceSlug ? workspaceUrl(row.workspaceSlug, 'settings/integrations') : null;

/** The name of a Git provider, from its key. */
const providerName = (row: NotificationEntity): string =>
  row.params.provider === 'gitlab' ? 'GitLab' : 'GitHub';

/** The reasons of a connection that needs attention, with what the reader can do. */
const BROKEN_DETAILS: Readonly<Record<string, MessageDescriptor>> = {
  APP_UNINSTALLED: messages.connectionUninstalled,
  APP_SUSPENDED: messages.connectionSuspended,
  PERMISSIONS_NOT_ACCEPTED: messages.connectionPermissions,
  TOKEN_EXPIRED: messages.connectionTokenExpired,
  TOKEN_REVOKED: messages.connectionTokenRevoked,
  TOKEN_SCOPE_MISSING: messages.connectionTokenScope,
};

const brokenDetail = (row: NotificationEntity): string =>
  t(BROKEN_DETAILS[row.params.reason ?? ''] ?? messages.connectionStopped);

/** The kinds of the core. */
const CORE_KINDS: readonly KindView[] = [
  {
    kind: 'invitation.received',
    icon: MailIcon,
    text: row => messages.invitationReceived(actorOf(row), workspaceOf(row), roleOf(row)),
  },
  {
    kind: 'invitation.accepted',
    icon: UserRoundCheckIcon,
    text: row => messages.invitationAccepted(actorOf(row), workspaceOf(row)),
    href: membersPage,
  },
  {
    kind: 'invitation.declined',
    icon: UserRoundXIcon,
    text: row => messages.invitationDeclined(actorOf(row), workspaceOf(row)),
    href: membersPage,
  },
  roleView('role.granted'),
  roleView('role.revoked'),
  {
    kind: 'owner.added',
    icon: ShieldCheckIcon,
    text: row =>
      about(row)
        ? messages.ownerYouAdded(workspaceOf(row))
        : messages.ownerAdded(actorOf(row), workspaceOf(row)),
    href: workspacePage,
  },
  {
    kind: 'owner.removed',
    icon: ShieldCheckIcon,
    text: row =>
      about(row)
        ? messages.ownerYouRemoved(workspaceOf(row))
        : messages.ownerRemoved(actorOf(row), workspaceOf(row)),
  },
  {
    kind: 'admin.granted',
    icon: ShieldCheckIcon,
    text: row => (about(row) ? messages.adminYouGranted : messages.adminGranted(actorOf(row))),
  },
  {
    kind: 'admin.revoked',
    icon: ShieldCheckIcon,
    text: row => (about(row) ? messages.adminYouRevoked : messages.adminRevoked(actorOf(row))),
  },
  {
    kind: 'instance_role.changed',
    icon: ShieldCheckIcon,
    text: () => messages.instanceRolesChanged,
    detail: roleChanges,
  },
  security('security.password_changed', KeyRoundIcon, () => messages.passwordChanged, () =>
    t(messages.passwordChangedDetail),
  ),
  security('security.session_reuse', ShieldAlertIcon, () => messages.sessionReuse, () =>
    t(messages.sessionReuseDetail),
  ),
  security('security.account_locked', LockIcon, () => messages.accountLocked, () =>
    t(messages.accountLockedDetail),
  ),
  security('security.email_changed', MailIcon, () => messages.emailChanged),
  security('security.identity_linked', LinkIcon, row =>
    messages.identityLinked(row.params.provider ?? ''),
  ),
  security('security.identity_unlinked', UnlinkIcon, row =>
    messages.identityUnlinked(row.params.provider ?? ''),
  ),
  {
    kind: 'token.created',
    icon: KeyRoundIcon,
    text: row => messages.tokenCreated(row.params.name ?? ''),
    href: accountPage('tokens'),
  },
  {
    kind: 'vcs.connection_broken',
    icon: UnplugIcon,
    text: row => messages.connectionBroken(providerName(row), row.params.account ?? ''),
    detail: brokenDetail,
    href: integrationsPage,
  },
  {
    kind: 'vcs.token_expiring',
    icon: ClockExclamationIcon,
    text: row => messages.tokenExpiring(row.params.account ?? '', row.params.expires_at ?? ''),
    detail: () => t(messages.tokenExpiringDetail),
    href: integrationsPage,
  },
];

/** The keys of the kinds of the core, for a test against the kinds of the server. */
export const coreKinds = (): readonly string[] => CORE_KINDS.map(view => view.kind);

/** What a row shows. */
export interface RowView {
  icon: KindView['icon'];
  text: string;
  detail: string | null;
  /** Why the reader gets the row, if the row is not about the reader. */
  reason: string | null;
  href: string | null;
}

const reasonOf = (row: NotificationEntity): string | null => {
  if (row.reason === 'owner') return t(messages.reasonOwner);
  if (row.reason === 'admin') return t(messages.reasonAdmin);
  if (row.reason === 'workspace_admin') return t(messages.reasonWorkspaceAdmin);
  return null;
};

/** Makes the text of a row. A kind with no view shows a generic line, and no link. */
export const viewOfRow = (row: NotificationEntity, slug: string | null): RowView => {
  const view = notificationsPoints.kinds.resolve(CORE_KINDS).find(item => item.kind === row.kind);
  return {
    icon: view?.icon ?? BellIcon,
    text: t(view ? view.text(row) : messages.unknownKind),
    detail: view?.detail?.(row) ?? null,
    reason: reasonOf(row),
    href: view?.href?.(row, slug) ?? null,
  };
};
