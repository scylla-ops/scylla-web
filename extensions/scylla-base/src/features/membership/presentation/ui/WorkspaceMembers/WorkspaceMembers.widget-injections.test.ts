import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { WidgetInjection } from '@scylla/core-sdk';
import { render, withQueryClient, withRegistry, withWidgetInjections } from '@test/render.ts';
import { membershipPoints } from '@base/features/membership/presentation/membership.points.ts';
import WorkspaceMembersPage from './WorkspaceMembers.page.svelte';

const probe = () => import('./WorkspaceMembersProbe.fixture.svelte');

beforeAll(async () => {
  await probe();
});

let listMembers: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

const grant = (permissions: Permission[] | 'all') =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access:
            permissions === 'all' ? { kind: 'fullControl' } : { kind: 'restricted', permissions },
        },
      ],
    },
  });

const setUp = (injection?: WidgetInjection) => {
  if (injection) teardown.push(withWidgetInjections({ 'ee-members': injection }));
  render(WorkspaceMembersPage);
};

beforeEach(() => {
  listMembers = vi.fn().mockResolvedValue([
    { actorId: 'user-1', actorKind: 'user', displayName: 'alice', handle: 'alice', roles: [] },
    { actorId: 'user-2', actorKind: 'user', displayName: 'bob', handle: 'bob', roles: [] },
  ]);

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({
    invitation: {
      invitationRepository: {
        list: vi
          .fn()
          .mockResolvedValue([
            {
              id: 'i-1',
              workspaceId: 'org-1',
              email: 'lina@acme.dev',
              role: 'member',
              invitedBy: 'user-1',
              expiresAt: '2099-01-01T00:00:00.000Z',
              sentAt: '2098-12-01T00:00:00.000Z',
            },
          ]),
      },
    },
    user: { userRepository: { getAll: vi.fn().mockResolvedValue({ items: [] }) } },
    access: {
      accessRepository: {
        listMembers,
        grant: vi.fn(),
        revoke: vi.fn(),
        check: vi.fn().mockResolvedValue(new Set()),
      },
    },
  });
  teardown = [cache.restore, restoreRegistry];

  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: null, name: null },
  });
  grant('all');
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('WorkspaceMembers.page with widget injections', () => {
  it('gives the open invitations to a section: each one takes a seat', async () => {
    setUp([membershipPoints.workspaceSection.inject({ component: probe })]);

    await vi.waitFor(() =>
      expect(screen.getByTestId('workspace-members-probe')).toHaveTextContent(
        'Acme|org-1|2|true|1',
      ),
    );
  });

  it('gives the workspace, the right to manage and the member count to a header action', async () => {
    setUp([membershipPoints.workspaceActions.inject({ component: probe })]);
    await screen.findByText('alice');

    expect(await screen.findByTestId('workspace-members-probe')).toHaveTextContent(
      'Acme|org-1|2|true',
    );
    expect(screen.getByRole('button', { name: 'Add members' })).toBeInTheDocument();
  });

  it('puts a header action in place of "Add members" with `replace`', async () => {
    setUp([membershipPoints.workspaceActions.inject({ component: probe, position: 'replace' })]);
    expect(await screen.findByTestId('workspace-members-probe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add members' })).not.toBeInTheDocument();
  });

  it('renders a section under the members list', async () => {
    setUp([membershipPoints.workspaceSection.inject({ component: probe })]);

    expect(await screen.findByTestId('workspace-members-probe')).toBeInTheDocument();
  });

  it('reloads the roles of the members when a component asks for it', async () => {
    setUp([membershipPoints.workspaceSection.inject({ component: probe })]);
    await screen.findByText('alice');
    const reads = listMembers.mock.calls.length;

    await userEvent.click(await screen.findByTestId('workspace-members-probe'));

    await vi.waitFor(() => expect(listMembers.mock.calls.length).toBe(reads + 1));
  });

  it('hides "Add members" without LIST_USERS when an extension asks for it', async () => {
    grant([Permission.MANAGE_WORKSPACE_GRANTS, Permission.LIST_WORKSPACE_MEMBERS]);
    setUp([
      membershipPoints.workspaceAddMember.patch(action => ({
        ...action,
        withoutDirectory: 'hide',
      })),
    ]);
    await screen.findByText('alice');

    expect(screen.queryByRole('button', { name: 'Add members' })).not.toBeInTheDocument();
  });

  it('keeps "Add members" usable with LIST_USERS, as an outline button', async () => {
    setUp([
      membershipPoints.workspaceAddMember.patch(() => ({
        withoutDirectory: 'hide',
        variant: 'outline',
      })),
    ]);
    await screen.findByText('alice');

    const add = screen.getByRole('button', { name: 'Add members' });
    expect(add).not.toHaveAttribute('aria-disabled');
    expect(add).toHaveAttribute('data-variant', 'outline');
  });
});
