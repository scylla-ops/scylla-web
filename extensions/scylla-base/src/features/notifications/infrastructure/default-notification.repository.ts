import type {
  NotificationEntity,
  NotificationFilter,
  NotificationInvitationState,
  NotificationPage,
  NotificationSummary,
} from '@base/features/notifications/domain/entities/notification.entity.ts';
import type { NotificationRepository } from '@base/features/notifications/domain/repository/notification.repository.ts';
import type { INotificationServiceClient } from '@base/generated/scylla/notifications/v1/notification_service.client.ts';
import type {
  Notification,
  NotificationInvitation,
} from '@base/generated/scylla/notifications/v1/notification_service.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

const stateOf = (invitation: NotificationInvitation): NotificationInvitationState | null => {
  const { state } = invitation;
  switch (state.oneofKind) {
    case 'open':
      return { kind: 'open', expiresAt: timestampToIso(state.open.expiresAt) };
    case 'accepted':
      return { kind: 'accepted', acceptedAt: timestampToIso(state.accepted.acceptedAt) };
    case 'expired':
      return { kind: 'expired', expiredAt: timestampToIso(state.expired.expiredAt) };
    default:
      return null;
  }
};

export const toDomain = (row: Notification): NotificationEntity => {
  const state = row.invitation ? stateOf(row.invitation) : null;
  return {
    id: idValue(row.id),
    kind: row.kind,
    category: row.category,
    reason: row.reason,
    actorName: row.actorName,
    workspaceId: row.workspaceId ? idValue(row.workspaceId) : null,
    workspaceSlug: row.workspaceSlug,
    workspaceName: row.workspaceName,
    projectId: row.projectId ? idValue(row.projectId) : null,
    projectName: row.projectName,
    params: row.params,
    occurrences: row.occurrences,
    needsAction: row.needsAction,
    firstAt: timestampToIso(row.firstAt),
    lastAt: timestampToIso(row.lastAt),
    read: row.readAt !== undefined,
    done: row.doneAt !== undefined,
    invitation:
      row.invitation && state
        ? { id: idValue(row.invitation.id), role: row.invitation.role, state }
        : null,
  };
};

export class DefaultNotificationRepository implements NotificationRepository {
  constructor(private readonly client: INotificationServiceClient) {}

  public async summary(): Promise<NotificationSummary> {
    const response = await this.client.getNotificationSummary({}).response;
    return {
      unread: response.unreadCount,
      needsAction: response.needsActionCount,
      pollAfterSeconds: response.pollAfterSeconds,
    };
  }

  public async list(
    filter: NotificationFilter,
    size: number,
    token: string,
  ): Promise<NotificationPage> {
    const response = await this.client.listNotifications({
      page: { size, token },
      done: filter.done,
      unreadOnly: filter.unreadOnly,
      needsActionOnly: filter.needsActionOnly,
      workspaceId: filter.workspaceId ? wrapId(filter.workspaceId) : undefined,
      category: filter.category,
    }).response;
    return {
      items: response.notifications.map(toDomain),
      nextToken: response.page?.nextToken ?? '',
    };
  }

  public async markRead(ids: readonly string[], read: boolean): Promise<void> {
    await this.client.markNotificationsRead({ notificationIds: ids.map(wrapId), read }).response;
  }

  public async markAllRead(): Promise<void> {
    await this.client.markAllNotificationsRead({}).response;
  }

  public async setDone(ids: readonly string[], done: boolean): Promise<void> {
    await this.client.setNotificationsDone({ notificationIds: ids.map(wrapId), done }).response;
  }
}
