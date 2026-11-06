import type { NotificationEntity } from '../../../domain/entities/notification.entity.ts';

/** A row with no action, about the reader. A test sets what it reads. */
export const row = (overrides: Partial<NotificationEntity> = {}): NotificationEntity => ({
  id: 'row-1',
  kind: 'security.password_changed',
  category: 'security',
  reason: 'subject',
  actorName: '',
  workspaceId: null,
  workspaceSlug: '',
  workspaceName: '',
  projectId: null,
  projectName: '',
  params: {},
  occurrences: 1,
  needsAction: false,
  firstAt: '2026-11-06T10:00:00.000Z',
  lastAt: '2026-11-06T10:00:00.000Z',
  read: false,
  done: false,
  invitation: null,
  ...overrides,
});
