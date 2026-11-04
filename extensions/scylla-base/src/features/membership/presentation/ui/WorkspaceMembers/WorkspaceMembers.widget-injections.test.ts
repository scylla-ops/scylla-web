import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { WidgetInjection } from '@scylla/core-sdk';
import { render, withQueryClient, withRegistry, withWidgetInjections } from '@test/render.ts';
import { membershipPoints } from '@base/features/membership/presentation/membership.points.ts';
import WorkspaceMembersPage from './WorkspaceMembers.page.svelte';

const probe = () => import('./WorkspaceMembersProbe.fixture.svelte');

let listAccess: ReturnType<typeof vi.fn>;
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
  listAccess = vi.fn().mockResolvedValue([
    { actorId: 'user-1', actorKind: 'user', displayName: '', handle: 'alice', role: 'admin' },
    { actorId: 'user-2', actorKind: 'user', displayName: '', handle: 'bob', role: 'member' },
  ]);

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({
    user: { userRepository: { getAll: vi.fn().mockResolvedValue({ items: [] }) } },
    access: {
      accessRepository: {
        listAccess,
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
  it('gives the workspace, the right to manage and the member count to a header action', async () => {
    setUp([membershipPoints.workspaceActions.inject({ component: probe })]);
    await screen.findByText('alice');

    expect(await screen.findByTestId('workspace-members-probe')).toHaveTextContent(
      'Acme|org-1|2|true',
    );
    expect(screen.getByRole('button', { name: 'Add a member' })).toBeInTheDocument();
  });

  it('puts a header action in place of "Add a member" with `replace`', async () => {
    setUp([
      membershipPoints.workspaceActions.inject({ component: probe, position: 'replace' }),
    ]);
    expect(await screen.findByTestId('workspace-members-probe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a member' })).not.toBeInTheDocument();
  });

  it('renders a section under the members list', async () => {
    setUp([membershipPoints.workspaceSection.inject({ component: probe })]);

    expect(await screen.findByTestId('workspace-members-probe')).toBeInTheDocument();
  });

  it('reloads the roles of the members when a component asks for it', async () => {
    setUp([membershipPoints.workspaceSection.inject({ component: probe })]);
    await screen.findByText('alice');
    const reads = listAccess.mock.calls.length;

    await userEvent.click(await screen.findByTestId('workspace-members-probe'));

    await vi.waitFor(() => expect(listAccess.mock.calls.length).toBe(reads + 1));
  });

  it('hides "Add a member" without LIST_USERS when an extension asks for it', async () => {
    grant([Permission.MANAGE_WORKSPACE_GRANTS, Permission.LIST_WORKSPACE_MEMBERS]);
    setUp([
      membershipPoints.workspaceAddMember.patch(action => ({
        ...action,
        withoutDirectory: 'hide',
      })),
    ]);
    await screen.findByText('alice');

    expect(screen.queryByRole('button', { name: 'Add a member' })).not.toBeInTheDocument();
  });

  it('keeps "Add a member" usable with LIST_USERS, as an outline button', async () => {
    setUp([
      membershipPoints.workspaceAddMember.patch(() => ({
        withoutDirectory: 'hide',
        variant: 'outline',
      })),
    ]);
    await screen.findByText('alice');

    const add = screen.getByRole('button', { name: 'Add a member' });
    expect(add).not.toHaveAttribute('aria-disabled');
    expect(add).toHaveAttribute('data-variant', 'outline');
  });
});
