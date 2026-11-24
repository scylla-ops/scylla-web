import type {
  NotificationFilter,
  NotificationPage,
  NotificationSummary,
} from '../entities/notification.entity.ts';

/** The inbox of the signed-in user. No method takes a person: each route acts on the caller. */
export interface NotificationRepository {
  summary(): Promise<NotificationSummary>;
  list(filter: NotificationFilter, size: number, token: string): Promise<NotificationPage>;
  /** NOT_FOUND if an id is not a row of the caller, and nothing changes. */
  markRead(ids: readonly string[], read: boolean): Promise<void>;
  /** Skips the rows that need an action. */
  markAllRead(): Promise<void>;
  /** NOT_FOUND if an id is not a row of the caller, and nothing changes. */
  setDone(ids: readonly string[], done: boolean): Promise<void>;
}
