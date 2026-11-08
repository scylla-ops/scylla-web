import { t } from '@scylla/ui/i18n';
import type { NotificationSummary } from '../../domain/entities/notification.entity.ts';
import { notificationMessages } from '../messages/notifications.messages.ts';

/** The highest number that the badge shows. */
const BADGE_MAX = 99;

/** More skeleton rows would not fit in the panel on a short screen. */
const SKELETON_MAX_ROWS = 8;

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

/**
 * The skeleton rows of the panel. Each unread row is in the inbox, so the skeleton is not taller
 * than the list that replaces it: the panel does not open large and then shrink.
 */
export const panelSkeletonRows = (summary: NotificationSummary | undefined): number =>
  Math.min(Math.max(summary?.unread ?? 0, 1), SKELETON_MAX_ROWS);
