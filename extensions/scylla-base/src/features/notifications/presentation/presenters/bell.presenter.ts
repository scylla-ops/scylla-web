import { t } from '@scylla/ui/i18n';
import type { NotificationSummary } from '../../domain/entities/notification.entity.ts';
import { notificationMessages } from '../messages/notifications.messages.ts';

/** The highest number that the badge shows. */
const BADGE_MAX = 99;

/** The label of the bell for a screen reader. */
export const bellLabel = (unread: number): string =>
  unread > 0 ? t(notificationMessages.unreadLabel(unread)) : t(notificationMessages.title);

/** The text of the badge, or an empty text for no badge. */
export const badgeText = (unread: number): string => {
  if (unread <= 0) return '';
  return unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread);
};

/** "Mark all as read" skips a row that waits for an answer: it needs another unread row. */
export const canMarkAllRead = ({ unread, needsAction }: NotificationSummary): boolean =>
  unread > needsAction;
