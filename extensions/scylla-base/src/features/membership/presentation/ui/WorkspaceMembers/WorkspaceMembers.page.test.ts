import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { AccessEntryEntity } from '@base/features/access';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import WorkspaceMembersPage from './WorkspaceMembers.page.svelte';

const entry = (overrides: Partial<AccessEntryEntity> = {}): AccessEntryEntity => ({
  actorId: 'user-1',
  actorKind: 'user',
  displayName: '',
  handle: 'alice',
  role: 'admin',
  ...overrides,
});

const workspace = { kind: 'workspace', id: 'org-1' };

let listAccess: ReturnType<typeof vi.fn>;
let getAll: ReturnType<typeof vi.fn>;
let grantRole: ReturnType<typeof vi.fn>;
let revoke: ReturnType<typeof vi.fn>;
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
  listAccess = vi.fn().mockResolvedValue([entry(), entry({ role: 'viewer' })]);
  getAll = vi.fn().mockResolvedValue({
    items: [
      { id: 'user-1', username: 'alice' },
      { id: 'user-2', username: 'bob' },
    ],
  });
  grantRole = vi.fn().mockResolvedValue(undefined);
  revoke = vi.fn().mockResolvedValue(undefined);

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    user: { userRepository: { getAll } },
    access: {
      accessRepository: {
        listAccess,
        grant: grantRole,
        revoke,
        check: vi.fn().mockResolvedValue(new Set()),
      },
    },
  });

  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: null, name: null },
  });
  localStorage.setItem('userId', 'user-9');
  grant('all');
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  localStorage.clear();
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
    expect(listAccess).not.toHaveBeenCalled();
  });

  it("lists the workspace's members", async () => {
    render(WorkspaceMembersPage);

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(listAccess).toHaveBeenCalledWith(workspace);
  });

  it('shows an owner locked, with no way to revoke it here', async () => {
    listAccess.mockResolvedValue([entry({ role: 'owner' })]);
    render(WorkspaceMembersPage);

    await screen.findByText('Owner');
    expect(screen.queryByRole('button', { name: /Revoke Owner/ })).not.toBeInTheDocument();
  });

  it('says so when nobody belongs to the workspace yet', async () => {
    listAccess.mockResolvedValue([]);
    render(WorkspaceMembersPage);

    expect(await screen.findByText('Nobody belongs to this workspace yet.')).toBeInTheDocument();
  });

  it('does not enumerate accounts without LIST_USERS', async () => {
    grant([Permission.MANAGE_WORKSPACE_GRANTS, Permission.LIST_WORKSPACE_MEMBERS]);
    render(WorkspaceMembersPage);

    await screen.findByText('alice');
    expect(getAll).not.toHaveBeenCalled();
  });

  it('offers to add a member when the caller may manage grants', async () => {
    render(WorkspaceMembersPage);
    await screen.findByText('alice');

    expect(screen.getByRole('button', { name: 'Add a member' })).toBeEnabled();
  });

  it('disables adding a member without MANAGE_WORKSPACE_GRANTS', async () => {
    grant([Permission.LIST_USERS]);
    render(WorkspaceMembersPage);

    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add a member' })).toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
  });

  it('denies "Add a member" without LIST_USERS, and says who can browse the users', async () => {
    grant([Permission.MANAGE_WORKSPACE_GRANTS, Permission.LIST_WORKSPACE_MEMBERS]);
    render(WorkspaceMembersPage);
    await screen.findByText('alice');

    const add = screen.getByRole('button', { name: 'Add a member' });
    expect(add).toHaveAttribute('aria-disabled', 'true');
    expect(add).toHaveAccessibleDescription('Only a system admin can browse the users.');

    await userEvent.click(add);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the directory dialog with LIST_USERS', async () => {
    render(WorkspaceMembersPage);
    await screen.findByText('alice');

    await userEvent.click(screen.getByRole('button', { name: 'Add a member' }));

    expect(
      await screen.findByRole('dialog', { name: 'Add a member to “Acme”' }),
    ).toBeInTheDocument();
  });

  it('confirms before removing a member, and revokes each of their roles on continue', async () => {
    render(WorkspaceMembersPage);
    await screen.findByText('alice');

    await userEvent.click(screen.getByRole('button', { name: 'Remove from the workspace' }));
    expect(revoke).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    // A role left behind would keep them listed.
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledTimes(2));
    expect(revoke).toHaveBeenCalledWith(workspace, 'admin', 'user-1');
    expect(revoke).toHaveBeenCalledWith(workspace, 'viewer', 'user-1');
  });

  it('grants a role to somebody already listed, without opening the dialog', async () => {
    render(WorkspaceMembersPage);
    await screen.findByText('alice');

    await userEvent.click(screen.getAllByRole('combobox')[0]);
    await userEvent.click(await findFloating('option', 'Member'));

    await vi.waitFor(() => expect(grantRole).toHaveBeenCalledWith(workspace, 'member', 'user-1'));
  });
});
