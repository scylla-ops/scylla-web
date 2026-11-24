import { msg } from '@lingui/core/macro';
import BellIcon from '@lucide/svelte/icons/bell';
import CheckCheckIcon from '@lucide/svelte/icons/check-check';
import { routeParams, type CommandDefinition } from '@scylla/core-sdk';
import { markAllNotificationsRead } from './notifications.queries.ts';

const TYPE = msg`Notifications`;

const inboxPath = (): string => {
  const { workspaceSlug } = routeParams();
  return workspaceSlug ? `/${workspaceSlug}/notifications/inbox` : '/notifications/inbox';
};

export const notificationsCommands: readonly CommandDefinition[] = [
  {
    id: 'notifications.open',
    kind: 'go',
    title: msg`Notifications`,
    keywords: msg`inbox bell invitations alerts`,
    icon: BellIcon,
    path: inboxPath,
  },
  {
    id: 'notifications.mark-all-read',
    kind: 'confirm',
    type: TYPE,
    title: msg`Mark all notifications as read`,
    keywords: msg`inbox bell clear`,
    icon: CheckCheckIcon,
    verb: msg`Mark as read`,
    question: msg`Mark all notifications as read?`,
    detail: msg`A notification that needs an action stays unread.`,
    run: markAllNotificationsRead,
  },
];
