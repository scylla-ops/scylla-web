import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import AddMembersDialog from './AddMembersDialog.svelte';

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

const open = (held: string[]) => {
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
    candidates: [{ id: 'u-1', username: 'lina', displayName: 'Lina Moreau' }],
    onAdded: vi.fn(),
  });
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
  it('gives the workspace role to a person of the directory', async () => {
    open(['pipelines.edit', 'pipelines.view']);
    await screen.findByText('Workspace member');

    await userEvent.type(screen.getByLabelText('People'), 'lina');
    await userEvent.click(await screen.findByRole('button', { name: /Lina Moreau/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() =>
      expect(grant).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'member', 'u-1'),
    );
  });

  it('makes an invitation from an email', async () => {
    open(['pipelines.edit', 'pipelines.view']);
    await screen.findByText('Workspace member');

    await userEvent.type(screen.getByLabelText('People'), 'new@acme.dev{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(grant).not.toHaveBeenCalled();
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
