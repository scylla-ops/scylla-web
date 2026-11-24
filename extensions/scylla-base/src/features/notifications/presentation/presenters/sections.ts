import type { MessageDescriptor } from '@lingui/core';
import type { NotificationEntity } from '../../domain/entities/notification.entity.ts';
import { notificationMessages } from '../messages/notifications.messages.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

type SectionId = 'needs-action' | 'today' | 'week' | 'earlier';

export interface NotificationSection {
  id: SectionId | 'others';
  /** `null`: the rows have no title above them. */
  title: MessageDescriptor | null;
  rows: NotificationEntity[];
}

const TITLES: Readonly<Record<SectionId, MessageDescriptor>> = {
  'needs-action': notificationMessages.needsAction,
  today: notificationMessages.sectionToday,
  week: notificationMessages.sectionWeek,
  earlier: notificationMessages.sectionEarlier,
};

const ORDER: readonly SectionId[] = ['needs-action', 'today', 'week', 'earlier'];

const sectionOf = (row: NotificationEntity, now: Date): SectionId => {
  if (row.needsAction) return 'needs-action';
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const at = new Date(row.lastAt).getTime();
  if (at >= startOfToday) return 'today';
  return at >= startOfToday - (WEEK_DAYS - 1) * DAY_MS ? 'week' : 'earlier';
};

/** Puts the rows in their sections, and leaves out a section with no row. */
export const sectionsOf = (
  rows: readonly NotificationEntity[],
  now = new Date(),
): NotificationSection[] =>
  ORDER.map(id => ({
    id,
    title: TITLES[id],
    rows: rows.filter(row => sectionOf(row, now) === id),
  })).filter(section => section.rows.length > 0);

/** The panel: only the rows that wait for an answer have a title. */
export const compactSectionsOf = (rows: readonly NotificationEntity[]): NotificationSection[] => {
  const sections: NotificationSection[] = [
    {
      id: 'needs-action',
      title: TITLES['needs-action'],
      rows: rows.filter(row => row.needsAction),
    },
    { id: 'others', title: null, rows: rows.filter(row => !row.needsAction) },
  ];
  return sections.filter(section => section.rows.length > 0);
};
