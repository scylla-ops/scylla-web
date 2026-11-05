import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { toast } from 'svelte-sonner';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import AddMembersDialog from './AddMembersDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const role = (grantName: string, name: string, permissions: string[], level = 'workspace') => ({
  key: grantName,
  name,
  description: '',
  level,
  holder: 'people',
  grantName,
  builtin: true,
  fullControl: false,
  permissions,
  holderCount: 0,
});

let grant: ReturnType<typeof vi.fn>;
let create: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

const open = (
  held: string[],
  directory: { canBrowse: boolean } | null = null,
  more: ReturnType<typeof role>[] = [],
) => {
  grant = vi.fn().mockResolvedValue(undefined);
  create = vi.fn().mockResolvedValue({ id: 'i-1' });
  const cache = withQueryClient();
  const restore = withRegistry({
    access: {
      accessRepository: {
        grant,
        revoke: vi.fn(),
        check: vi.fn().mockResolvedValue(new Set()),
        heldPermissions: vi.fn().mockResolvedValue(new Set(held)),
      },
    },
    roles: {
      roleRepository: {
        catalog: vi.fn().mockResolvedValue([]),
        list: vi
          .fn()
          .mockResolvedValue([
            role('member', 'Workspace member', ['pipelines.edit']),
            role('viewer', 'Workspace viewer', ['pipelines.view']),
            ...more,
          ]),
      },
    },
    invitation: { invitationRepository: { create } },
  });
  teardown = [cache.restore, restore];
  render(AddMembersDialog, {
    open: true,
    onOpenChange: vi.fn(),
    workspaceId: 'w-1',
    workspaceName: 'acme',
    candidates: directory ? [] : [{ id: 'u-1', username: 'lina', displayName: 'Lina Moreau' }],
    canBrowse: directory?.canBrowse ?? true,
    onAdded: vi.fn(),
  });
};

/** The dialog takes the focus just after it opens: a key sent before that is lost. */
const ready = async () => {
  await screen.findByText('Workspace member');
  await vi.waitFor(() =>
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement),
  );
};

beforeEach(() => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AddMembersDialog', () => {
  it('says that only an email adds someone to a caller who cannot browse', () => {
    open(['pipelines.edit'], { canBrowse: false });

    expect(screen.getByText(/You cannot browse the users/)).toBeInTheDocument();
  });

  it('does not say it to a caller who can browse, with no one left to add', () => {
    open(['pipelines.edit'], { canBrowse: true });

    expect(screen.queryByText(/You cannot browse the users/)).not.toBeInTheDocument();
  });

  it('gives the workspace role to a person of the directory', async () => {
    open(['pipelines.edit', 'pipelines.view']);
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'lina');
    await userEvent.click(await screen.findByRole('button', { name: /Lina Moreau/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() =>
      expect(grant).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'member', 'u-1'),
    );
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 member added'));
  });

  it('makes an invitation from an email', async () => {
    open(['pipelines.edit', 'pipelines.view']);
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'new@acme.dev{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(grant).not.toHaveBeenCalled();
  });

  it('does not put the role owner in an invitation', async () => {
    open(['pipelines.edit', 'pipelines.view'], null, [role('owner', 'Workspace owner', [])]);
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'new@acme.dev{Enter}');
    await userEvent.click(screen.getByRole('combobox', { name: 'Workspace role' }));
    await userEvent.click(
      await findFloating(
        'option',
        'Workspace owner Full control of one workspace, also its deletion and its owners.',
      ),
    );

    expect(screen.getByText(/An invitation does not carry the role/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add 1 member' })).toBeDisabled();
  });

  it('gives the role owner to a person of the directory', async () => {
    open(['pipelines.edit', 'pipelines.view'], null, [role('owner', 'Workspace owner', [])]);
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'lina');
    await userEvent.click(await screen.findByRole('button', { name: /Lina Moreau/ }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Workspace role' }));
    await userEvent.click(
      await findFloating(
        'option',
        'Workspace owner Full control of one workspace, also its deletion and its owners.',
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() =>
      expect(grant).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'owner', 'u-1'),
    );
  });

  it('starts on a role that the caller can give', async () => {
    open(['pipelines.view']);

    expect(await screen.findByText('Workspace viewer')).toBeInTheDocument();
  });

  it('cannot send a role that no one here can give', async () => {
    open([]);
    await screen.findByText('Add members to acme');

    await userEvent.type(screen.getByLabelText('People'), 'lina');
    await userEvent.click(await screen.findByRole('button', { name: /Lina Moreau/ }));

    expect(screen.getByRole('button', { name: 'Add 1 member' })).toBeDisabled();
  });
});
