import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import ChangeRolesDialog from './ChangeRolesDialog.svelte';

const agent = {
  key: 'agent',
  name: 'Agent',
  description: '',
  level: 'workspace',
  holder: 'apps',
  grantName: 'runner',
  builtin: true,
  fullControl: false,
  permissions: [],
  holderCount: 0,
};

let grant: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

const open = async (onOutside = vi.fn()) => {
  const cache = withQueryClient();
  const restore = withRegistry({
    access: {
      accessRepository: {
        grant,
        revoke: vi.fn(),
        check: vi.fn().mockResolvedValue(new Set()),
        heldPermissions: vi.fn().mockResolvedValue(new Set()),
      },
    },
    roles: {
      roleRepository: {
        catalog: vi.fn().mockResolvedValue([]),
        list: vi.fn().mockResolvedValue([agent]),
      },
    },
  });
  teardown = [cache.restore, restore];
  render(ChangeRolesDialog, {
    actorId: 'app-1',
    holder: 'apps',
    name: 'deploy-bot',
    roles: [],
    workspaceId: 'w-1',
    object: { kind: 'workspace', id: 'w-1' },
    onClose: vi.fn(),
    onChanged: vi.fn(),
    onOutside,
  });
  await userEvent.click(await screen.findByRole('combobox', { name: 'Add a role' }));
  await userEvent.click(await findFloating('option', 'Agent Takes the jobs of every project of the workspace.'));
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
};

const openOwner = (revoke: ReturnType<typeof vi.fn>) => {
  const cache = withQueryClient();
  const restore = withRegistry({
    access: {
      accessRepository: {
        grant: vi.fn(),
        revoke,
        check: vi.fn().mockResolvedValue(new Set()),
        heldPermissions: vi.fn().mockResolvedValue(new Set()),
      },
    },
    roles: {
      roleRepository: {
        catalog: vi.fn().mockResolvedValue([]),
        list: vi.fn().mockResolvedValue([]),
      },
    },
  });
  teardown = [cache.restore, restore];
  render(ChangeRolesDialog, {
    actorId: 'user-1',
    name: 'Alice',
    roles: [
      {
        scopeKind: 'workspace',
        scopeId: 'w-1',
        scopeName: 'Acme',
        role: 'owner',
        roleKey: 'owner',
        roleName: 'Workspace owner',
      },
    ],
    workspaceId: 'w-1',
    object: { kind: 'workspace', id: 'w-1' },
    onClose: vi.fn(),
    onChanged: vi.fn(),
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

describe('ChangeRolesDialog', () => {
  it('gives the role', async () => {
    grant = vi.fn().mockResolvedValue(undefined);

    await open();

    await vi.waitFor(() =>
      expect(grant).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'runner', 'app-1'),
    );
  });

  it('shows the refusal of the server in the dialog', async () => {
    grant = vi.fn().mockRejectedValue(
      new ScyllaError('you do not hold it', {
        code: 'FAILED_PRECONDITION',
        reason: 'ESCALATION',
        raw: true,
      }),
    );

    await open();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('takes back the role owner as any other role', async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);

    openOwner(revoke);
    expect(await screen.findByText('Workspace owner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await vi.waitFor(() =>
      expect(revoke).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'owner', 'user-1'),
    );
  });

  it('shows the refusal for the last owner in the dialog', async () => {
    const revoke = vi.fn().mockRejectedValue(
      new ScyllaError('a workspace keeps its last owner', {
        code: 'FAILED_PRECONDITION',
        reason: 'LAST_OWNER',
      }),
    );

    openOwner(revoke);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The workspace needs at least one other owner',
    );
  });

  it('keeps the role owner for a caller with no right on the owners', async () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: { kind: 'restricted', permissions: [Permission.MANAGE_WORKSPACE_GRANTS] },
          },
        ],
      },
    });

    openOwner(vi.fn());

    expect(await screen.findByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('leaves an app of another workspace to its own dialog', async () => {
    const onOutside = vi.fn();
    grant = vi.fn().mockRejectedValue(
      new ScyllaError('an app gets roles only in its own workspace', {
        code: 'FAILED_PRECONDITION',
        reason: 'ACTOR_OUTSIDE_WORKSPACE',
        raw: true,
      }),
    );

    await open(onOutside);

    await vi.waitFor(() => expect(onOutside).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
