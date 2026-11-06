/** The inbox of the signed-in user. Loaders only: a barrel must not re-export a component. */
export type {
  NotificationEntity,
  NotificationSummary,
} from './domain/entities/notification.entity.ts';
export { notificationQueries, NOTIFICATIONS_QUERY_KEY } from './presentation/notifications.queries.ts';
export { notificationsPoints, type KindView } from './presentation/notifications.points.ts';
export { bellLabel, badgeText } from './presentation/presenters/bell.presenter.ts';
export const loadNotificationsPanel = () =>
  import('./presentation/ui/NotificationsPanel/NotificationsPanel.svelte');
