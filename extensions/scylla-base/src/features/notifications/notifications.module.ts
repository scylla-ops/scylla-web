import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { grpcTransport } from '@platform/grpc';
import { NotificationServiceClient } from '@base/generated/scylla/notifications/v1/notification_service.client.ts';
import { DefaultNotificationRepository } from './infrastructure/default-notification.repository.ts';
import { notificationsCommands } from './presentation/notifications.commands.ts';
import { notificationsPoints } from './presentation/notifications.points.ts';
import { NOTIFICATION_VIEWS } from './presentation/ui/Notifications/notification-views.registry.ts';

const notificationRepository = new DefaultNotificationRepository(
  new NotificationServiceClient(grpcTransport.getTransport()),
);

/** The inbox of the signed-in user: the bell of the shell loads its panel, and the full page. */
export const NotificationsModule = {
  id: 'notifications',
  domain: {
    notificationRepository,
  },
  points: notificationsPoints,
  commands: notificationsCommands,
  routes: {
    workspace: [
      {
        // No `permission`: each call acts on the caller, which needs no grant.
        path: 'notifications',
        breadcrumb: () => ({ label: msg`Notifications` }),
        children: [
          { redirect: 'inbox' },
          {
            path: ':view',
            inPageParams: ['view'],
            page: () => import('./presentation/ui/Notifications/Notifications.page.svelte'),
            nav: NOTIFICATION_VIEWS.map(({ id, title, icon, heading, permission, filter }) => ({
              section: 'notifications',
              title,
              icon,
              heading,
              permission,
              params: { view: id },
              // A filter of the list is no place to go to: `notifications.open` opens the inbox.
              inCommandBar: !filter,
            })),
          },
        ],
      },
    ],
    // The same page with no workspace: an invitation reaches a user who has none yet.
    personal: [
      {
        path: 'notifications',
        children: [
          { redirect: 'inbox' },
          {
            path: ':view',
            inPageParams: ['view'],
            page: () => import('./presentation/ui/Notifications/Notifications.page.svelte'),
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
