import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { installTestNavigator } from '@test/navigator.ts';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
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
const jobs = { getByWorkspaceId: vi.fn() };
const pipelines = { getMetadataByWorkspaceId: vi.fn() };

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
      jobs: { jobsRepository: jobs },
      pipeline: { pipelineRepository: pipelines },
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

  it('opens with one skeleton row per unread row, so it does not open large and then shrink', async () => {
    repository.summary.mockResolvedValue({ unread: 2, needsAction: 0, pollAfterSeconds: 30 });
    repository.list.mockReturnValue(new Promise(() => {}));

    panel();

    await waitFor(() => expect(screen.getAllByTestId('notification-skeleton')).toHaveLength(2));
  });

  it('has no filter and no failed runs: it asks for the inbox of all workspaces', async () => {
    lists(row());
    panel();
    await screen.findByText('Your password changed.');

    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText('Failed runs')).toBeNull();
    expect(repository.list).toHaveBeenCalledWith(
      { done: false, unreadOnly: false, needsActionOnly: false, category: '', workspaceId: null },
      20,
      '',
    );
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
    repository.summary.mockResolvedValue({ unread: 2, needsAction: 1, pollAfterSeconds: 30 });
    lists(row());
    panel();

    await userEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));

    await waitFor(() => expect(repository.markAllRead).toHaveBeenCalledOnce());
  });

  it('offers no mark all as read when only rows that wait for an answer are unread', async () => {
    repository.summary.mockResolvedValue({ unread: 1, needsAction: 1, pollAfterSeconds: 30 });
    lists(invitedRow());
    panel();
    await screen.findByText('Sam invited you to Acme as Member.');
    await waitFor(() => expect(repository.summary).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull();
  });

  it('labels only the rows that need an action, with no time labels', async () => {
    lists(invitedRow({ id: 'a' }), row({ id: 'b' }));
    panel();
    await screen.findByText('Your password changed.');

    expect(screen.getAllByRole('heading', { level: 3 }).map(el => el.textContent?.trim())).toEqual([
      'Needs action',
    ]);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('has one action on a row, and no read toggle', async () => {
    lists(row());
    panel();
    await screen.findByText('Your password changed.');

    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as read' })).toBeNull();
  });

  it('marks a row with no link as read on a click', async () => {
    lists(row({ kind: 'unknown.kind' }));
    panel();

    await userEvent.click(
      await screen.findByRole('button', { name: 'You have a new notification.' }),
    );

    await waitFor(() => expect(repository.markRead).toHaveBeenCalledWith(['row-1'], true));
  });

  it('opens the inbox from its footer', async () => {
    const onNavigate = vi.fn();
    lists();
    render(NotificationsPanel, { onNavigate });

    await userEvent.click(await screen.findByRole('link', { name: 'All notifications' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/notifications/inbox', undefined);
    expect(onNavigate).toHaveBeenCalledOnce();
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
  const inbox = () => render(Notifications, { view: 'inbox' });

  it('marks the selected rows as read', async () => {
    lists(row({ id: 'a' }), row({ id: 'b' }));
    inbox();
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
    inbox();
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
    inbox();
    await screen.findAllByText('Your password changed.');

    await press('j');
    await press('j');
    await press('u');
    await press('e');

    await waitFor(() => expect(repository.markRead).toHaveBeenCalledWith(['b'], true));
    await waitFor(() => expect(repository.setDone).toHaveBeenCalledWith(['b'], true));
  });

  it('has no active row until a key moves to one, so a key acts on no hidden row', async () => {
    lists(row({ id: 'a' }));
    inbox();
    await screen.findByText('Your password changed.');

    await press('e');

    expect(repository.setDone).not.toHaveBeenCalled();
    expect(screen.getByTestId('notification-row')).not.toHaveAttribute('data-active');

    await press('j');

    await waitFor(() =>
      expect(screen.getByTestId('notification-row')).toHaveAttribute('data-active'),
    );
  });

  it('shows the bulk actions only with a selection', async () => {
    lists(row({ id: 'a' }));
    inbox();
    await screen.findByText('Your password changed.');
    const bar = () => screen.getByRole('checkbox', { name: 'Select all' }).closest('div');

    expect(within(bar()!).queryByRole('button')).toBeNull();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));

    expect(within(bar()!).getByRole('button', { name: 'Mark as done' })).toBeInTheDocument();
  });

  it('keeps the time labels', async () => {
    lists(row({ lastAt: new Date().toISOString() }));
    inbox();

    await screen.findByRole('heading', { name: 'Today' });
  });

  it.each([
    ['done', { done: true }],
    ['unread', { unreadOnly: true }],
    ['needs-action', { needsActionOnly: true }],
    ['access', { category: 'access' }],
    ['security', { category: 'security' }],
  ])('asks the server for the rows of the view %s', async (view, filter) => {
    lists();
    render(Notifications, { view });

    await waitFor(() =>
      expect(repository.list).toHaveBeenLastCalledWith(
        expect.objectContaining(filter),
        25,
        '',
      ),
    );
  });

  it('reads the view of the route, which changes inside the page', async () => {
    navigator.restore();
    navigator = installTestNavigator({ params: { view: 'done' } });
    lists();
    render(Notifications, { view: 'inbox' });

    await waitFor(() =>
      expect(repository.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ done: true }),
        25,
        '',
      ),
    );
  });

  it('goes to the inbox from an empty quick filter', async () => {
    lists();
    render(Notifications, { view: 'unread' });

    await screen.findByText('No notification matches this filter.');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/notifications/inbox', undefined);
  });

  it('says that the done list is empty, with no filter to clear and nothing to select', async () => {
    lists();
    render(Notifications, { view: 'done' });

    await screen.findByText('No notifications yet.');
    expect(screen.queryByRole('button', { name: 'Clear filter' })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Select all' })).toBeNull();
  });

  it('sends a segment that names no view to the inbox', () => {
    lists();
    render(Notifications, { view: 'nope' });

    expect(navigator.navigate).toHaveBeenCalledWith('../inbox', { replace: true });
  });

  it('lists the views in the page outside a workspace, with no failed runs', async () => {
    lists();
    inbox();

    const nav = await screen.findByRole('navigation', { name: 'Notifications' });
    expect(within(nav).getByRole('link', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Security' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Failed runs' })).toBeNull();
  });

  it('has no sidebar links of its own in a workspace', async () => {
    lists();
    render(Notifications, { view: 'inbox', workspaceSlug: 'acme' });

    await screen.findByText('No notifications yet.');
    expect(screen.queryByRole('navigation', { name: 'Notifications' })).toBeNull();
  });
});

describe('the failed runs of the page', () => {
  const failedRuns = () =>
    render(Notifications, { view: 'failed-runs', workspaceSlug: 'acme' });

  const allow = (permissions: Permission[]) => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.WORKSPACE,
            scopeId: 'ws-1',
            access: { kind: 'restricted', permissions },
          },
        ],
      },
    });
    contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  };

  afterEach(() => {
    permissionsStore.setState({ permissions: null });
    contextStore.setState({ workspace: { id: null, name: null, slug: null } });
  });

  it('sends the personal page to the inbox: it has no workspace', () => {
    render(Notifications, { view: 'failed-runs' });

    expect(navigator.navigate).toHaveBeenCalledWith('../inbox', { replace: true });
  });

  it('denies a person with no access, with no call', async () => {
    allow([]);

    failedRuns();

    await waitFor(() => expect(jobs.getByWorkspaceId).not.toHaveBeenCalled());
    expect(screen.queryByText(/No failed run/)).toBeNull();
  });

  it('opens a failed run, with no limit of five', async () => {
    allow([Permission.LIST_JOBS_BY_WORKSPACE, Permission.LIST_PIPELINES_BY_WORKSPACE]);
    jobs.getByWorkspaceId.mockResolvedValue({
      items: Array.from({ length: 7 }, (_, index) => ({
        id: `job-${index}`,
        pipelineId: 'p1',
        status: 'failed',
        createdAt: '2026-11-06T10:00:00.000Z',
      })),
    });
    pipelines.getMetadataByWorkspaceId.mockResolvedValue({
      items: [{ id: 'p1', projectId: 'pr1', name: 'Nightly' }],
    });

    failedRuns();

    const rows = await screen.findAllByRole('button', { name: /Nightly/ });
    expect(rows).toHaveLength(7);
    await userEvent.click(rows[0]);
    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/projects/pr1/pipelines/p1/jobs/job-0',
      undefined,
    );
  });

  it('never says that no run failed when the read fails', async () => {
    allow([Permission.LIST_JOBS_BY_WORKSPACE, Permission.LIST_PIPELINES_BY_WORKSPACE]);
    jobs.getByWorkspaceId.mockRejectedValue(new ScyllaError('down', { code: 'INTERNAL' }));
    pipelines.getMetadataByWorkspaceId.mockResolvedValue({ items: [] });

    failedRuns();

    await screen.findByText('Cannot load the failed runs.');
    expect(screen.queryByText(/No failed run/)).toBeNull();
  });
});
