import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { toast } from 'svelte-sonner';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import UserDetailPage from './UserDetail.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const me = { userId: 'admin-1', username: 'root', isActive: true, updatedAt: '' };

const grace = {
  userId: 'user-2',
  username: 'grace',
  displayName: 'Grace Hopper',
  email: 'grace@example.com',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const recently = new Date(Date.now() - 60_000).toISOString();

const sessions = [
  {
    sessionId: 'session-a',
    createdAt: recently,
    lastActiveAt: recently,
    expiresAt: '',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    ipAddress: '203.0.113.7',
    current: false,
  },
  {
    sessionId: 'session-b',
    createdAt: recently,
    lastActiveAt: recently,
    expiresAt: '',
    userAgent: 'grpc-python/1.66.1',
    ipAddress: '',
    current: false,
  },
];

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;
let navigator: ReturnType<typeof installTestNavigator>;

const holding = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

const ADMIN = [
  Permission.READ_USER,
  Permission.UPDATE_USER,
  Permission.CREATE_USER,
  Permission.DELETE_USER,
];

const setUp = (
  { userId = 'user-2', permissions = ADMIN }: { userId?: string; permissions?: Permission[] } = {},
  overrides: Record<string, ReturnType<typeof vi.fn>> = {},
) => {
  holding(permissions);
  repository = {
    getMe: vi.fn().mockResolvedValue(ScyllaResult.success(me)),
    getById: vi.fn().mockResolvedValue(ScyllaResult.success(grace)),
    listAccess: vi.fn().mockResolvedValue(
      ScyllaResult.success([
        {
          grantId: 'g-1',
          scope: 'organization',
          organizationId: 'org-1',
          organizationName: 'Acme',
          projectName: '',
          roleId: 'organization-member',
          roleName: 'Member',
        },
      ]),
    ),
    update: vi.fn().mockResolvedValue(ScyllaResult.success(grace)),
    sendPasswordReset: vi.fn().mockResolvedValue(ScyllaResult.success('mail')),
    revokeSessions: vi.fn().mockResolvedValue(ScyllaResult.success(1)),
    listSessions: vi.fn().mockResolvedValue(ScyllaResult.success(sessions)),
    revokeSession: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    setActive: vi.fn().mockResolvedValue(ScyllaResult.success({ ...grace, isActive: false })),
    delete: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    ...overrides,
  };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: repository } })];
  render(UserDetailPage, { userId });
};

beforeEach(() => {
  vi.clearAllMocks();
  navigator = installTestNavigator({ pathname: '/acme/users/user-2' });
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme' } });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
  permissionsStore.setState({ permissions: null });
});

describe('UserDetailPage', () => {
  it('shows the identity, the status, the creation date and the id to copy', async () => {
    setUp();

    expect((await screen.findAllByText('Grace Hopper')).length).toBeGreaterThan(0);
    expect(screen.getByText('grace@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/^Created on /)).toBeInTheDocument();
    expect(screen.getByText('user-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy the user ID' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Grace Hopper' })).toBeInTheDocument();
    expect(screen.getByText('@grace')).toBeInTheDocument();
  });

  it('lists the organizations and roles of the user, read with the page', async () => {
    setUp();

    expect(await screen.findByRole('link', { name: 'Acme' })).toHaveAttribute(
      'href',
      '/acme/dashboard',
    );
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(repository.listAccess).toHaveBeenCalledWith('user-2');
  });

  it('sends the own id to the account page', async () => {
    setUp({ userId: 'admin-1' });

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('../../account', { replace: true }),
    );
  });

  it('sends the own id to the account page also without READ_USER, as an old link does', async () => {
    setUp({ userId: 'admin-1', permissions: [] });

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('../../account', { replace: true }),
    );
    expect(screen.queryByText("You don't have the permission")).not.toBeInTheDocument();
  });

  it('refuses the page of another user without READ_USER, and reads nothing', async () => {
    setUp({ permissions: [] });

    expect(await screen.findByText("You don't have the permission")).toBeInTheDocument();
    expect(repository.getById).not.toHaveBeenCalled();
    expect(repository.listAccess).not.toHaveBeenCalled();
  });

  it('lets an administrator who may create users change the email', async () => {
    setUp();
    const user = userEvent.setup();

    const email = await screen.findByLabelText('Email');
    expect(email).not.toHaveAttribute('readonly');
    await user.clear(email);
    await user.type(email, 'grace@navy.mil');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(repository.update).toHaveBeenCalledWith({ userId: 'user-2', email: 'grace@navy.mil' }),
    );
  });

  it('keeps the email read-only without createUser', async () => {
    setUp({ permissions: [Permission.READ_USER, Permission.UPDATE_USER] });

    expect(await screen.findByLabelText('Email')).toHaveAttribute('readonly');
  });

  it('shows the profile read-only and hides every action of a reader', async () => {
    setUp({ permissions: [Permission.READ_USER] });

    expect(await screen.findByLabelText('Username')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Security' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete user' })).not.toBeInTheDocument();
  });

  describe('sessions', () => {
    it('comes after the organizations and roles, and before the security', async () => {
      setUp();

      const sessionsSection = await screen.findByRole('region', { name: 'Sessions' });
      const roles = screen.getByRole('region', { name: 'Organizations and roles' });
      const security = screen.getByRole('region', { name: 'Security' });

      expect(
        roles.compareDocumentPosition(sessionsSection) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        sessionsSection.compareDocumentPosition(security) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        within(security).queryByRole('button', { name: 'Sign out everywhere' }),
      ).not.toBeInTheDocument();
      expect(
        within(security).getByRole('button', { name: 'Send a reset link' }),
      ).toBeInTheDocument();
    });

    it('lists the sessions of the user, read with the page', async () => {
      setUp();

      const list = await screen.findByRole('region', { name: 'Sessions' });
      expect(await within(list).findByText('Chrome on macOS')).toBeInTheDocument();
      expect(within(list).getByText('gRPC Python')).toBeInTheDocument();
      expect(within(list).getByText('API client · Active now')).toBeInTheDocument();
      expect(within(list).queryByText('This session')).not.toBeInTheDocument();
      expect(repository.listSessions).toHaveBeenCalledWith('user-2');
    });

    it('signs out one session of the user, then reads the list again', async () => {
      setUp();
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Sign out gRPC Python' }));

      await waitFor(() =>
        expect(repository.revokeSession).toHaveBeenCalledWith('user-2', 'session-b'),
      );
      await waitFor(() => expect(repository.listSessions).toHaveBeenCalledTimes(2));
    });

    it('shows the sessions to a reader, with no sign-out button', async () => {
      setUp({ permissions: [Permission.READ_USER] });

      const list = await screen.findByRole('region', { name: 'Sessions' });
      expect(await within(list).findByText('Chrome on macOS')).toBeInTheDocument();
      expect(within(list).queryByRole('button')).not.toBeInTheDocument();
    });

    it('reads no session without READ_USER', async () => {
      setUp({ permissions: [] });

      await screen.findByText("You don't have the permission");
      expect(repository.listSessions).not.toHaveBeenCalled();
    });

    it('says when the user has no active session', async () => {
      setUp({}, { listSessions: vi.fn().mockResolvedValue(ScyllaResult.success([])) });

      const list = await screen.findByRole('region', { name: 'Sessions' });
      expect(await within(list).findByText('No active session.')).toBeInTheDocument();
    });

    it('shows an error when the sessions cannot be read', async () => {
      setUp(
        {},
        {
          listSessions: vi
            .fn()
            .mockResolvedValue(
              ScyllaResult.error(new ScyllaError('Failed.', { cause: { code: 'UNAVAILABLE' } })),
            ),
        },
      );

      const list = await screen.findByRole('region', { name: 'Sessions' });
      expect(await within(list).findByText('Error loading the sessions')).toBeInTheDocument();
    });
  });

  it('says where a reset link went by mail', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Send a reset link' }));

    await waitFor(() => expect(repository.sendPasswordReset).toHaveBeenCalledWith('user-2'));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('A reset link was sent to grace@example.com.'),
    );
  });

  it('says when the reset link is in the server log', async () => {
    setUp({}, { sendPasswordReset: vi.fn().mockResolvedValue(ScyllaResult.success('server-log')) });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Send a reset link' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('The reset link is in the server log.'),
    );
  });

  it('signs the user out everywhere from the sessions, tells how many, and reads them again', async () => {
    setUp();
    const user = userEvent.setup();

    const list = await screen.findByRole('region', { name: 'Sessions' });
    await user.click(within(list).getByRole('button', { name: 'Sign out everywhere' }));

    await waitFor(() => expect(repository.revokeSessions).toHaveBeenCalledWith('user-2'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 session signed out.'));
    await waitFor(() => expect(repository.listSessions).toHaveBeenCalledTimes(2));
  });

  it('deactivates the account after a confirmation that says what it does', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Deactivate account' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Deactivate this account?');
    expect(dialog).toHaveTextContent('signed out everywhere and cannot sign in');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(repository.setActive).toHaveBeenCalledWith('user-2', false));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Account deactivated'));
  });

  it('offers to reactivate a deactivated account', async () => {
    setUp(
      {},
      { getById: vi.fn().mockResolvedValue(ScyllaResult.success({ ...grace, isActive: false })) },
    );
    const user = userEvent.setup();

    expect(await screen.findByText('Deactivated')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reactivate account' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reactivate' }),
    );

    await waitFor(() => expect(repository.setActive).toHaveBeenCalledWith('user-2', true));
  });

  it('deletes the user after a confirmation, then goes back to the list', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete user' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete user' }),
    );

    await waitFor(() => expect(repository.delete).toHaveBeenCalledWith('user-2'));
    await waitFor(() => expect(navigator.navigate).toHaveBeenCalledWith('..', undefined));
  });

  it('shows an error when the user cannot be read', async () => {
    setUp(
      {},
      {
        getById: vi
          .fn()
          .mockResolvedValue(
            ScyllaResult.error(new ScyllaError('Failed.', { cause: { code: 'UNAVAILABLE' } })),
          ),
      },
    );

    expect(await screen.findByText('Error loading the user')).toBeInTheDocument();
  });
});
