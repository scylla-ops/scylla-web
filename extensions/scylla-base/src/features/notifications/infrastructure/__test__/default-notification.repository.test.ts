// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { INotificationServiceClient } from '@base/generated/scylla/notifications/v1/notification_service.client.ts';
import type { Notification } from '@base/generated/scylla/notifications/v1/notification_service.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultNotificationRepository, toDomain } from '../default-notification.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const wire = (overrides: Partial<Notification> = {}): Notification => ({
  id: { value: 'row-1' },
  kind: 'invitation.received',
  category: 'access',
  reason: 'subject',
  actorName: 'Sam',
  workspaceSlug: 'acme',
  workspaceName: 'Acme',
  projectName: '',
  params: { role: 'member' },
  occurrences: 1,
  needsAction: true,
  firstAt: TS,
  lastAt: TS,
  ...overrides,
});

const open = {
  id: { value: 'inv-1' },
  role: 'member',
  state: { oneofKind: 'open' as const, open: { expiresAt: TS } },
};

describe('toDomain', () => {
  it('reads the state of the invitation', () => {
    expect(toDomain(wire({ invitation: open })).invitation).toEqual({
      id: 'inv-1',
      role: 'member',
      state: { kind: 'open', expiresAt: ISO },
    });
    const accepted = toDomain(
      wire({
        invitation: {
          ...open,
          state: { oneofKind: 'accepted', accepted: { acceptedAt: TS } },
        },
      }),
    );
    expect(accepted.invitation?.state).toEqual({ kind: 'accepted', acceptedAt: ISO });
    const expired = toDomain(
      wire({
        invitation: {
          ...open,
          state: { oneofKind: 'expired', expired: { expiredAt: TS } },
        },
      }),
    );
    expect(expired.invitation?.state).toEqual({ kind: 'expired', expiredAt: ISO });
  });

  it('shows a state of a newer server as no invitation', () => {
    const row = toDomain(
      wire({ invitation: { ...open, state: { oneofKind: undefined } } }),
    );

    expect(row.invitation).toBeNull();
  });

  it('reads a row as unread and in the inbox when the times are not set', () => {
    const row = toDomain(wire());

    expect(row.read).toBe(false);
    expect(row.done).toBe(false);
    expect(row.workspaceId).toBeNull();
    expect(row.lastAt).toBe(ISO);
  });

  it('reads a row with its times as read and done', () => {
    const row = toDomain(wire({ readAt: TS, doneAt: TS, workspaceId: { value: 'ws-1' } }));

    expect(row.read).toBe(true);
    expect(row.done).toBe(true);
    expect(row.workspaceId).toBe('ws-1');
  });
});

describe('DefaultNotificationRepository', () => {
  const client = () =>
    ({
      getNotificationSummary: vi.fn(() =>
        unaryCall({ unreadCount: 4, needsActionCount: 1, pollAfterSeconds: 30 }),
      ),
      listNotifications: vi.fn(() =>
        unaryCall({ notifications: [wire()], page: { nextToken: 'next' } }),
      ),
      markNotificationsRead: vi.fn(() => unaryCall({})),
      markAllNotificationsRead: vi.fn(() => unaryCall({})),
      setNotificationsDone: vi.fn(() => unaryCall({})),
    }) as unknown as INotificationServiceClient;

  it('gives the counts', async () => {
    const summary = await new DefaultNotificationRepository(client()).summary();

    expect(summary).toEqual({ unread: 4, needsAction: 1, pollAfterSeconds: 30 });
  });

  it('sends the filters and gives the next token', async () => {
    const fake = client();

    const page = await new DefaultNotificationRepository(fake).list(
      {
        done: true,
        unreadOnly: true,
        needsActionOnly: false,
        workspaceId: 'ws-1',
        category: 'access',
      },
      20,
      'tok',
    );

    expect(page.nextToken).toBe('next');
    expect(page.items).toHaveLength(1);
    expect(fake.listNotifications).toHaveBeenCalledWith({
      page: { size: 20, token: 'tok' },
      done: true,
      unreadOnly: true,
      needsActionOnly: false,
      workspaceId: { value: 'ws-1' },
      category: 'access',
    });
  });

  it('sends no workspace for all the workspaces', async () => {
    const fake = client();

    await new DefaultNotificationRepository(fake).list(
      { done: false, unreadOnly: false, needsActionOnly: false, workspaceId: null, category: '' },
      20,
      '',
    );

    expect(fake.listNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: undefined }),
    );
  });

  it('wraps the ids of a change', async () => {
    const fake = client();
    const repository = new DefaultNotificationRepository(fake);

    await repository.markRead(['a'], false);
    await repository.setDone(['b'], true);

    expect(fake.markNotificationsRead).toHaveBeenCalledWith({
      notificationIds: [{ value: 'a' }],
      read: false,
    });
    expect(fake.setNotificationsDone).toHaveBeenCalledWith({
      notificationIds: [{ value: 'b' }],
      done: true,
    });
  });
});
