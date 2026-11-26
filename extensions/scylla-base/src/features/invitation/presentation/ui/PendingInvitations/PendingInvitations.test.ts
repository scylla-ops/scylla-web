import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import PendingInvitations from './PendingInvitations.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];

const invitation = {
  id: 'inv-1',
  workspaceId: 'ws-1',
  email: 'ada@example.com',
  role: 'member',
  invitedBy: 'user-1',
  expiresAt: '2030-01-01T00:00:00.000Z',
  sentAt: '2029-12-25T00:00:00.000Z',
};

const inviter = {
  actorId: 'user-1',
  actorKind: 'user',
  displayName: 'Grace Hopper',
  handle: 'grace',
  runner: false,
  roles: [],
  avatarColor: 'chart-2',
};

const setUp = (canManage = true) => {
  const repository = {
    list: vi.fn().mockResolvedValue([invitation]),
    resend: vi.fn().mockResolvedValue(invitation),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: {
            kind: 'restricted',
            permissions: canManage ? [Permission.ADD_WORKSPACE_MEMBER] : [],
          },
        },
      ],
    },
  });
  const cache = withQueryClient();
  const access = { listMembers: vi.fn().mockResolvedValue([inviter]) };
  teardown = [
    cache.restore,
    withRegistry({
      invitation: { invitationRepository: repository },
      access: { accessRepository: access },
    }),
    () => permissionsStore.setState({ permissions: null }),
  ];
  render(PendingInvitations, { workspaceId: 'ws-1' });
  return repository;
};

afterEach(() => teardown.forEach(restore => restore()));

describe('PendingInvitations', () => {
  it('lists the open invitations with their role', async () => {
    setUp();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Member/)).toBeInTheDocument();
  });

  it('shows who sent each invitation, with the avatar of the list of the members', async () => {
    setUp();

    expect(await screen.findByText(/Invited by Grace Hopper/)).toBeInTheDocument();
    const avatar = document.querySelector(
      '[data-part="inviter"] [title="Invited by Grace Hopper"]',
    );
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent('GH');
  });

  it('sends one again and revokes one', async () => {
    const repository = setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Send again ada@example.com' }));
    await waitFor(() => expect(repository.resend).toHaveBeenCalledWith('ws-1', 'inv-1'));

    await user.click(screen.getByRole('button', { name: 'Revoke ada@example.com' }));
    await waitFor(() => expect(repository.revoke).toHaveBeenCalledWith('ws-1', 'inv-1'));
  });

  it('shows and reads nothing without the right to manage the workspace', () => {
    const repository = setUp(false);

    expect(screen.queryByText('Open invitations')).not.toBeInTheDocument();
    expect(repository.list).not.toHaveBeenCalled();
  });
});
