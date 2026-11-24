import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { NotificationFilter } from '../domain/entities/notification.entity.ts';
import type { NotificationRepository } from '../domain/repository/notification.repository.ts';

const repository = () =>
  getModuleDomain<{ notificationRepository: NotificationRepository }>('notifications')
    .notificationRepository;

/** The time between two reads of the counts, before the server gives its own. */
const DEFAULT_POLL_SECONDS = 30;

export const NOTIFICATIONS_QUERY_KEY = () => ['notifications'] as const;
const SUMMARY_KEY = () => [...NOTIFICATIONS_QUERY_KEY(), 'summary'] as const;
const LIST_KEY = (filter: NotificationFilter, size: number, token: string) =>
  [...NOTIFICATIONS_QUERY_KEY(), 'list', filter, size, token] as const;

/** Reads the list and the counts again. */
export const refreshNotifications = () =>
  getQueryClient().invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY() });

/** Marks each row as read, outside a page: the command bar has no mutation of its own. */
export const markAllNotificationsRead = async (): Promise<void> => {
  await repository().markAllRead();
  await refreshNotifications();
};

export const notificationQueries = {
  /** The counts of the badge. A failed read keeps the last number, with no toast. */
  summary: () =>
    queryOptions({
      queryKey: SUMMARY_KEY(),
      queryFn: () => repository().summary(),
      refetchInterval: query => (query.state.data?.pollAfterSeconds ?? DEFAULT_POLL_SECONDS) * 1000,
      meta: { showsOwnError: true },
    }),

  /** A list deletes the rows that the reader can no longer open, so the counts can change. */
  list: (filter: NotificationFilter, size: number, token = '') =>
    queryOptions({
      queryKey: LIST_KEY(filter, size, token),
      queryFn: async () => {
        const page = await repository().list(filter, size, token);
        void getQueryClient().invalidateQueries({ queryKey: SUMMARY_KEY() });
        return page;
      },
      meta: { showsOwnError: true },
    }),
};

export const notificationMutations = {
  markRead: () =>
    mutationOptions({
      mutationFn: ({ ids, read }: { ids: readonly string[]; read: boolean }) =>
        repository().markRead(ids, read),
      onSuccess: refreshNotifications,
    }),

  markAllRead: () =>
    mutationOptions({
      mutationFn: () => repository().markAllRead(),
      onSuccess: refreshNotifications,
    }),

  setDone: () =>
    mutationOptions({
      mutationFn: ({ ids, done }: { ids: readonly string[]; done: boolean }) =>
        repository().setDone(ids, done),
      onSuccess: refreshNotifications,
    }),
};
