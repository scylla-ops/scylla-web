import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
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
