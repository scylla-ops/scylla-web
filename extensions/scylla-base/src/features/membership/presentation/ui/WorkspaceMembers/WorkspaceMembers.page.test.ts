import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { MemberEntity, MemberRoleEntity } from '@base/features/access';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import WorkspaceMembersPage from './WorkspaceMembers.page.svelte';

const role = (overrides: Partial<MemberRoleEntity>): MemberRoleEntity => ({
  scopeKind: 'workspace',
  scopeId: 'org-1',
  scopeName: 'Acme',
  role: 'member',
  roleKey: 'workspace-member',
  roleName: 'Workspace member',
  ...overrides,
});

const member = (id: string, name: string, roles: MemberRoleEntity[]): MemberEntity => ({
  actorId: id,
  actorKind: 'user',
  displayName: name,
  handle: name.toLowerCase(),
  roles,
});

let listMembers: ReturnType<typeof vi.fn>;
let getAll: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

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

beforeEach(() => {
  listMembers = vi.fn().mockResolvedValue([
    member('user-1', 'Alice', [
      role({ role: 'owner', roleKey: 'owner', roleName: 'Owner', grantedAt: new Date('2026-03-03') }),
    ]),
    member('user-2', 'Bob', [
      role({}),
      role({
        scopeKind: 'project',
        scopeId: 'p-1',
        scopeName: 'api',
        role: 'editor',
        roleKey: 'project-editor',
        roleName: 'Project editor',
      }),
    ]),
    member('user-3', 'Sam', [
      role({
        scopeKind: 'platform',
        scopeId: 'x',
        scopeName: '',
        role: 'instance-admin',
        roleKey: 'instance-admin',
        roleName: 'Instance admin',
      }),
    ]),
    { ...member('app-1', 'deploy-bot', [role({ role: 'runner', roleKey: 'agent' })]), actorKind: 'app' },
  ]);
  getAll = vi.fn().mockResolvedValue({ items: [] });

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    user: { userRepository: { getAll } },
    access: {
      accessRepository: {
        listMembers,
        grant: vi.fn().mockResolvedValue(undefined),
        revoke: vi.fn().mockResolvedValue(undefined),
        check: vi.fn().mockResolvedValue(new Set()),
      },
    },
  });

  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: null, name: null },
  });
  grant('all');
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('WorkspaceMembersPage', () => {
  it('asks for a workspace rather than rendering an empty list', () => {
    contextStore.setState({
      workspace: { id: null, name: null, slug: null },
      project: { id: null, name: null },
    });

    render(WorkspaceMembersPage);

    expect(screen.getByText('Select a workspace to see its members.')).toBeInTheDocument();
    expect(listMembers).not.toHaveBeenCalled();
  });

  it('shows the workspace roles and the project roles of each person', async () => {
    render(WorkspaceMembersPage);

    const bob = (await screen.findByText('Bob')).closest('tr') as HTMLElement;
    expect(within(bob).getByText('Workspace member')).toBeInTheDocument();
    expect(within(bob).getByText('api · Project editor')).toBeInTheDocument();
  });

  it('shows an owner as admin of every project, with the date of the grant', async () => {
    render(WorkspaceMembersPage);

    const alice = (await screen.findByText('Alice')).closest('tr') as HTMLElement;
    expect(within(alice).getByText('Owner')).toBeInTheDocument();
    expect(within(alice).getByText('Every project, as admin')).toBeInTheDocument();
    expect(within(alice).queryByText('—')).not.toBeInTheDocument();
  });

  it('says that an instance admin is not a member', async () => {
    render(WorkspaceMembersPage);

    const sam = (await screen.findByText('Sam')).closest('tr') as HTMLElement;
    expect(within(sam).getByText('Instance admin')).toBeInTheDocument();
    expect(within(sam).getByText('Every project')).toBeInTheDocument();
    expect(screen.getByText('Sam is not a member of Acme')).toBeInTheDocument();
  });

  it('shows the apps on their own tab', async () => {
    render(WorkspaceMembersPage);
    await screen.findByText('Alice');
    expect(screen.queryByText('deploy-bot')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Apps 1' }));

    expect(await screen.findByText('deploy-bot')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('filters the list with the search', async () => {
    render(WorkspaceMembersPage);
    await screen.findByText('Alice');

    await userEvent.type(screen.getByRole('textbox', { name: 'Search members' }), 'bob');

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('does not enumerate accounts without LIST_USERS', async () => {
    grant([Permission.LIST_WORKSPACE_MEMBERS, Permission.MANAGE_WORKSPACE_GRANTS]);
    render(WorkspaceMembersPage);
    await screen.findByText('Alice');

    expect(getAll).not.toHaveBeenCalled();
  });

  it('offers to add members with an email also without LIST_USERS', async () => {
    grant([Permission.LIST_WORKSPACE_MEMBERS, Permission.MANAGE_WORKSPACE_GRANTS]);
    render(WorkspaceMembersPage);
    await screen.findByText('Alice');

    expect(screen.getByRole('button', { name: 'Add members' })).toBeEnabled();
  });

  it('disables adding members without MANAGE_WORKSPACE_GRANTS', async () => {
    grant([Permission.LIST_WORKSPACE_MEMBERS]);
    render(WorkspaceMembersPage);
    await screen.findByText('Alice');

    expect(screen.getByRole('button', { name: 'Add members' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('hides the actions on the roles from a reader', async () => {
    grant([Permission.LIST_WORKSPACE_MEMBERS]);
    render(WorkspaceMembersPage);
    const bob = (await screen.findByText('Bob')).closest('tr') as HTMLElement;

    await userEvent.click(within(bob).getByRole('button', { name: 'Member actions' }));

    expect(await findFloating('menuitem', 'See the access')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Change roles', hidden: true })).not.toBeInTheDocument();
  });
});
