import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { type RoleEntity, RoleKind } from '@base/features/roles/domain/entities/role.entity.ts';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import PlatformRoleEditorPage from './PlatformRoleEditor.page.svelte';

const custom = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-1',
  name: 'viewer',
  description: 'read only',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.LIST_SECRETS] },
  ...overrides,
});

let listRoles: ReturnType<typeof vi.fn>;
let createRole: ReturnType<typeof vi.fn>;
let updateRole: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  listRoles = vi.fn().mockResolvedValue([custom()]);
  createRole = vi.fn().mockResolvedValue(custom());
  updateRole = vi.fn().mockResolvedValue(custom());

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      permissionRepository: {
        listRoles,
        createRole,
        getMyPermissions: vi.fn().mockResolvedValue({ scopes: [] }),
      },
      updateRole: { execute: updateRole },
    },
  });
  navigator = installTestNavigator({ pathname: '/acme/platform-roles/new' });
  contextStore.getState().setOrganization('org-1', 'Acme');
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  navigator.restore();
  permissionsStore.setState({ permissions: null });
  contextStore.getState().setOrganization(null, null);
});

describe('PlatformRoleEditorPage — creating a platform role', () => {
  it('creates the role with no owner, from the same mutation as before', async () => {
    render(PlatformRoleEditorPage);

    expect(screen.getByRole('radio', { name: 'System' })).toBeInTheDocument();
    await userEvent.type(await screen.findByLabelText('Name'), 'auditor');
    await userEvent.click(screen.getByRole('button', { name: 'Create role' }));

    await vi.waitFor(() =>
      expect(createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'auditor', scope: PermissionScope.ORGANIZATION }),
      ),
    );
    expect(createRole.mock.calls[0][0]).not.toHaveProperty('organizationId');
    await vi.waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/acme/platform-roles', undefined),
    );
  });

  it('refuses to submit a role with no name', async () => {
    render(PlatformRoleEditorPage);

    expect(await screen.findByRole('button', { name: 'Create role' })).toBeDisabled();
  });
});

describe('PlatformRoleEditorPage — editing a platform role', () => {
  it('opens on the role being edited, and says its scope is fixed', async () => {
    render(PlatformRoleEditorPage, { roleId: 'role-1' });

    expect(await screen.findByLabelText('Name')).toHaveValue('viewer');
    expect(listRoles).toHaveBeenCalledWith();
    expect(screen.getByText('Scope cannot be changed after creation.')).toBeInTheDocument();
  });

  it('goes back to the list, opened on the role, on cancel', async () => {
    render(PlatformRoleEditorPage, { roleId: 'role-1' });

    await screen.findByLabelText('Name');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/platform-roles?role=role-1', undefined);
    expect(updateRole).not.toHaveBeenCalled();
  });
});
