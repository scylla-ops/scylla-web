import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { NotificationEntity } from '../../../domain/entities/notification.entity.ts';
import { row } from '../../presenters/__test__/fixtures.ts';
import Notifications from '../Notifications/Notifications.page.svelte';
import NotificationsPanel from '../NotificationsPanel/NotificationsPanel.svelte';

const repository = {
  summary: vi.fn(),
  list: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  setDone: vi.fn(),
};
const invitations = { acceptById: vi.fn(), decline: vi.fn() };

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;

const invitedRow = (overrides: Partial<NotificationEntity> = {}): NotificationEntity =>
  row({
    kind: 'invitation.received',
    category: 'access',
    actorName: 'Sam',
    workspaceName: 'Acme',
    workspaceSlug: 'acme',
    needsAction: true,
    params: { role: 'member' },
    invitation: {
      id: 'inv-1',
      role: 'member',
      state: { kind: 'open', expiresAt: '2026-11-12T00:00:00.000Z' },
    },
    ...overrides,
  });

const lists = (...items: NotificationEntity[]) =>
  repository.list.mockResolvedValue({ items, nextToken: '' });

beforeEach(() => {
  vi.clearAllMocks();
  repository.summary.mockResolvedValue({ unread: 0, needsAction: 0, pollAfterSeconds: 30 });
  repository.markRead.mockResolvedValue(undefined);
  repository.markAllRead.mockResolvedValue(undefined);
  navigator = installTestNavigator();
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      notifications: { notificationRepository: repository },
      invitation: { invitationRepository: invitations },
      workspace: { workspaceRepository: { getMine: vi.fn().mockResolvedValue([]) } },
    }),
  ];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

const panel = () => render(NotificationsPanel, { onNavigate: vi.fn() });

describe('the panel of the bell', () => {
  it('never says that all is well on an empty list', async () => {
    lists();

    panel();

    await screen.findByText('No notifications yet.');
    expect(screen.queryByText(/all is well/i)).toBeNull();
  });

  it('offers to clear a filter that hides the rows', async () => {
    lists();
    panel();
    await screen.findByText('No notifications yet.');

    await userEvent.click(screen.getByRole('radio', { name: 'Unread' }));

    await screen.findByText('No notification matches this filter.');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    await screen.findByText('No notifications yet.');
  });

  it('shows a load error with a way to try again', async () => {
    repository.list.mockRejectedValueOnce(new ScyllaError('down', { code: 'INTERNAL' }));
    panel();

    await screen.findByText('Cannot load notifications.');
    lists(row());
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await screen.findByText('Your password changed.');
  });

  it('puts an invitation under Needs action, with its answers', async () => {
    lists(invitedRow(), row());

    panel();

    await screen.findByText('Sam invited you to Acme as Member.');
    expect(screen.getByText('Needs action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('marks all as read', async () => {
    lists(row());
    panel();
    await screen.findByText('Your password changed.');

    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

    await waitFor(() => expect(repository.markAllRead).toHaveBeenCalledOnce());
  });

  it('shows no mark as read on a row that waits for an answer', async () => {
    lists(invitedRow());
    panel();
    await screen.findByText('Sam invited you to Acme as Member.');

    expect(screen.queryByRole('button', { name: 'Mark as read' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeInTheDocument();
  });

  it('marks a row as read when it opens its link', async () => {
    lists(row());
    panel();

    await userEvent.click(await screen.findByRole('link', { name: 'Your password changed.' }));

    await waitFor(() => expect(repository.markRead).toHaveBeenCalledWith(['row-1'], true));
    expect(navigator.navigate).toHaveBeenCalledWith('/account/security', undefined);
  });
});

describe('the answer to an invitation', () => {
  it('shows the text for another email, and keeps the row', async () => {
    lists(invitedRow());
    invitations.acceptById.mockRejectedValue(
      new ScyllaError('no', {
        code: 'FAILED_PRECONDITION',
        reason: 'INVITATION_FOR_ANOTHER_EMAIL',
      }),
    );
    panel();

    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    await screen.findByText('This invitation is for another email. Verify this email first.');
    expect(screen.getByRole('button', { name: 'Open account' })).toBeInTheDocument();
  });

  it('reads the list again after a decline', async () => {
    lists(invitedRow());
    invitations.decline.mockResolvedValue(undefined);
    panel();

    await userEvent.click(await screen.findByRole('button', { name: 'Decline' }));

    await waitFor(() => expect(invitations.decline).toHaveBeenCalledWith('inv-1'));
    await waitFor(() => expect(repository.list).toHaveBeenCalledTimes(2));
  });

  it('says that an invitation that ended has no answer', async () => {
    lists(
      invitedRow({
        needsAction: false,
        invitation: {
          id: 'inv-1',
          role: 'member',
          state: { kind: 'expired', expiredAt: '2026-11-01T00:00:00.000Z' },
        },
      }),
    );

    panel();

    await screen.findByText('The invitation to Acme ended. Ask Sam for a new one.');
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  it('offers to open the workspace of an accepted invitation', async () => {
    lists(
      invitedRow({
        needsAction: false,
        invitation: {
          id: 'inv-1',
          role: 'member',
          state: { kind: 'accepted', acceptedAt: '2026-11-01T00:00:00.000Z' },
        },
      }),
    );

    panel();

    await screen.findByText('You joined Acme as Member.');
    expect(screen.getByRole('button', { name: 'Open Acme' })).toBeInTheDocument();
  });
});

describe('the full page', () => {
  const press = (key: string) => userEvent.keyboard(key);

  it('marks the selected rows as read', async () => {
    lists(row({ id: 'a' }), row({ id: 'b' }));
    render(Notifications);
    await screen.findAllByText('Your password changed.');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Mark as read' })[0]);

    await waitFor(() => expect(repository.markRead).toHaveBeenCalledWith(['a', 'b'], true));
  });

  it('goes through the pages with the token of the server', async () => {
    repository.list.mockImplementation((_filter, _size, token: string) =>
      Promise.resolve({
        items: [row({ id: token || 'first' })],
        nextToken: token ? '' : 'second',
      }),
    );
    render(Notifications);
    await screen.findByText('Your password changed.');

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() =>
      expect(repository.list).toHaveBeenCalledWith(expect.anything(), 25, 'second'),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled());
  });

  it('acts on the active row with the keys', async () => {
    repository.setDone.mockResolvedValue(undefined);
    lists(row({ id: 'a', read: true }), row({ id: 'b' }));
    render(Notifications);
    await screen.findAllByText('Your password changed.');

    await press('j');
    await press('u');
    await press('e');

    await waitFor(() => expect(repository.markRead).toHaveBeenCalledWith(['b'], true));
    await waitFor(() => expect(repository.setDone).toHaveBeenCalledWith(['b'], true));
  });

  it('asks the server for the done rows on the Done tab', async () => {
    lists();
    render(Notifications);
    await screen.findByText('No notifications yet.');

    await userEvent.click(screen.getByRole('radio', { name: 'Done' }));

    await waitFor(() =>
      expect(repository.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ done: true }),
        25,
        '',
      ),
    );
  });
});
