import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
import DeleteRoleDialog from './DeleteRoleDialog.svelte';

const role = (key: string, name: string, level = 'workspace'): RoleEntity =>
  ({
    key,
    name,
    description: '',
    level,
    holder: 'people',
    grantName: `grant-${key}`,
    builtin: false,
    fullControl: false,
    permissions: [],
    holderCount: 2,
  }) as RoleEntity;

const doomed = role('doomed', 'Doomed');

let remove: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

beforeEach(() => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
  remove = vi.fn().mockResolvedValue(undefined);
  const cache = withQueryClient();
  const restore = withRegistry({
    roles: {
      roleRepository: {
        list: vi
          .fn()
          .mockResolvedValue([
            doomed,
            role('qa', 'Quality'),
            role('ops', 'Operations'),
            role('other', 'Other level', 'project'),
          ]),
        holders: vi.fn().mockResolvedValue({ holders: [] }),
        remove,
      },
    },
  });
  teardown = [cache.restore, restore];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('DeleteRoleDialog', () => {
  it('finds the role that takes the holders, and refuses to delete before that', async () => {
    render(DeleteRoleDialog, {
      role: doomed,
      workspaceId: 'w-1',
      open: true,
      onOpenChange: vi.fn(),
      onDeleted: vi.fn(),
    });
    await focusSettled();
    const confirm = screen.getByRole('button', { name: 'Move holders and delete' });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByRole('combobox'), 'qual');
    await findFloating('option', 'Quality');
    expect(screen.queryAllByRole('option', { hidden: true })).toHaveLength(1);
    await userEvent.keyboard('{Enter}');

    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await vi.waitFor(() => expect(remove).toHaveBeenCalledWith('doomed', 'grant-qa'));
  });
});
