import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
  Permission,
  PermissionScope,
  permissionsStore,
  RoleKind,
  type EffectiveScopeEntity,
} from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
import RoleEditorPage from './RoleEditor.page.svelte';

const role = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'auditor',
  name: 'Auditor',
  description: 'Reads the organization',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom', ownerOrganizationId: 'org-1' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.READ_ORGANIZATION] },
  ...overrides,
});

const viewer = role({
  id: 'organization-viewer',
  name: 'Organization Viewer',
  origin: { kind: 'builtin', key: 'organization-viewer' },
});

let listRoles: ReturnType<typeof vi.fn>;
let createRole: ReturnType<typeof vi.fn>;
let updateRole: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let navigator: ReturnType<typeof installTestNavigator>;

const holding = (...scopes: EffectiveScopeEntity[]) =>
  permissionsStore.setState({ permissions: { scopes } });

const ACME_ADMIN: EffectiveScopeEntity = {
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  access: { kind: 'fullControl' },
};

beforeEach(() => {
  listRoles = vi.fn().mockResolvedValue(ScyllaResult.success([role(), viewer]));
  createRole = vi.fn().mockResolvedValue(ScyllaResult.success(role()));
  updateRole = vi.fn().mockResolvedValue(ScyllaResult.success(role()));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      permissionRepository: {
        listRoles,
        createRole,
        getMyPermissions: vi.fn().mockResolvedValue(ScyllaResult.success({ scopes: [] })),
      },
      updateRole: { execute: updateRole },
    },
  });
  navigator = installTestNavigator({ pathname: '/acme/roles/new' });

  contextStore.getState().setOrganization('org-1', 'Acme');
  holding(ACME_ADMIN);
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  navigator.restore();
  permissionsStore.setState({ permissions: null });
  contextStore.getState().setOrganization(null, null);
});

describe('RoleEditorPage — creating a role of the organization', () => {
  it('lays the form out as titled sections on a page, not in a dialog', async () => {
    render(RoleEditorPage);

    expect(await screen.findByRole('heading', { level: 1, name: 'New role' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Holders and scope' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Access' })).toBeInTheDocument();
    expect(listRoles).not.toHaveBeenCalled();
  });

  it('says the role stays in the organization, and offers no System scope', async () => {
    render(RoleEditorPage);

    expect(
      await screen.findByText(
        'Only Acme sees this role. You put in it only the permissions you hold in Acme.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Project' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'System' })).not.toBeInTheDocument();
  });

  it('creates a role for apps of this organization, then goes back to the list', async () => {
    render(RoleEditorPage);

    await userEvent.type(await screen.findByLabelText('Name'), 'Release bot');
    await userEvent.click(screen.getByRole('radio', { name: 'Apps' }));
    expect(
      screen.getByText('Apps of Acme, such as agents. People cannot hold it.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create role' }));

    await vi.waitFor(() =>
      expect(createRole).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Release bot',
          organizationId: 'org-1',
          kind: RoleKind.AGENT,
        }),
      ),
    );
    await vi.waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/acme/roles', undefined),
    );
  });

  it('stays on the page when the backend refuses the role', async () => {
    createRole.mockResolvedValue(ScyllaResult.error(new ScyllaError('nope')));
    render(RoleEditorPage);

    await userEvent.type(await screen.findByLabelText('Name'), 'Release bot');
    await userEvent.click(screen.getByRole('button', { name: 'Create role' }));

    await vi.waitFor(() => expect(createRole).toHaveBeenCalled());
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveValue('Release bot');
  });

  it('goes back to the list on cancel, and writes nothing', async () => {
    render(RoleEditorPage);

    await userEvent.type(await screen.findByLabelText('Name'), 'Release bot');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/roles', undefined);
    expect(createRole).not.toHaveBeenCalled();
  });

  it('locks the permissions the author does not hold, with the reason on the row', async () => {
    holding({
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
      access: {
        kind: 'restricted',
        permissions: [
          Permission.MANAGE_ORG_ROLES,
          Permission.READ_ORGANIZATION,
          Permission.LIST_ORGANIZATION_MEMBERS,
        ],
      },
    });
    render(RoleEditorPage);

    expect(
      await screen.findByRole('checkbox', { name: 'See who belongs to the organization' }),
    ).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Edit the organization' })).toBeDisabled();
    expect(screen.getAllByText('Not held in Acme').length).toBeGreaterThan(0);
  });
});

describe('RoleEditorPage — editing a role of the organization', () => {
  it('opens on the role from the catalog of the organization, its scope fixed', async () => {
    render(RoleEditorPage, { roleId: 'auditor' });

    expect(await screen.findByLabelText('Name')).toHaveValue('Auditor');
    expect(listRoles).toHaveBeenCalledWith('org-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Edit role' })).toBeInTheDocument();
    expect(screen.getByText('Scope cannot be changed after creation.')).toBeInTheDocument();
  });

  it('saves through the update use case, then opens the list on the role', async () => {
    render(RoleEditorPage, { roleId: 'auditor' });

    const name = await screen.findByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Lead auditor');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() =>
      expect(updateRole).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'auditor', name: 'Lead auditor' }),
      ),
    );
    expect(createRole).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/acme/roles?role=auditor', undefined),
    );
  });

  it('refuses a builtin role, which the backend would reject anyway', async () => {
    render(RoleEditorPage, { roleId: 'organization-viewer' });

    expect(
      await screen.findByText('This role does not exist, or you cannot edit it here.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('says so for a role that does not exist', async () => {
    render(RoleEditorPage, { roleId: 'ghost' });

    expect(
      await screen.findByText('This role does not exist, or you cannot edit it here.'),
    ).toBeInTheDocument();
  });
});
