import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
  Permission,
  PermissionScope,
  PrincipalKind,
  permissionsStore,
  RoleKind,
  type EffectiveScopeEntity,
} from '@platform/authz';
import { contextStore } from '@platform/context';
import { selectionStore } from '@scylla/ui/stores';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
import type { GrantEntity } from '@base/features/roles/domain/entities/grant.entity.ts';
import RolesPage from './Roles.page.svelte';

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

const deployBot = role({
  id: 'deploy-bot',
  name: 'Deploy bot',
  scope: PermissionScope.PROJECT,
  kind: RoleKind.AGENT,
  access: { kind: 'restricted', permissions: [Permission.RUN_PIPELINE] },
});

const viewer = role({
  id: 'organization-viewer',
  name: 'Organization Viewer',
  description: 'Reads everything',
  origin: { kind: 'builtin', key: 'organization-viewer' },
});

const grant = (overrides: Partial<GrantEntity> = {}): GrantEntity => ({
  id: 'grant-1',
  principal: { kind: PrincipalKind.USER, id: 'user-1' },
  roleId: 'auditor',
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  ...overrides,
});

let listRoles: ReturnType<typeof vi.fn>;
let listGrants: ReturnType<typeof vi.fn>;
let createRole: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

const holding = (...scopes: EffectiveScopeEntity[]) =>
  permissionsStore.setState({ permissions: { scopes } });

const ACME_ADMIN: EffectiveScopeEntity = {
  scope: PermissionScope.ORGANIZATION,
  scopeId: 'org-1',
  access: { kind: 'fullControl' },
};

beforeEach(() => {
  listRoles = vi.fn().mockResolvedValue([role(), deployBot, viewer]);
  listGrants = vi
    .fn()
    .mockImplementation((scope: PermissionScope) =>
      Promise.resolve(scope === PermissionScope.ORGANIZATION ? [grant()] : []),
    );
  createRole = vi.fn().mockResolvedValue(role());

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: {
      permissionRepository: {
        listRoles,
        listGrants,
        createRole,
        getMyPermissions: vi.fn().mockResolvedValue({ scopes: [] }),
      },
      updateRole: { execute: vi.fn().mockResolvedValue(role()) },
    },
    organization: {
      organizationRepository: {
        getMine: vi.fn().mockResolvedValue([{ id: 'org-1', name: 'Acme' }]),
        listMembers: vi.fn().mockResolvedValue([{ userId: 'user-1', username: 'dave' }]),
      },
    },
    project: {
      projectRepository: {
        getByOrganizationId: vi.fn().mockResolvedValue({ projects: [] }),
      },
    },
  });

  contextStore.getState().setOrganization('org-1', 'Acme');
  selectionStore.setState({ selectedIds: {} });
  holding(ACME_ADMIN);
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
  contextStore.getState().setOrganization(null, null);
});

describe('RolesPage — the roles of an organization', () => {
  it("asks for the organization's catalog and groups its own roles before the platform's", async () => {
    render(RolesPage);

    const acme = await screen.findByRole('region', { name: 'Acme roles' });
    const platform = screen.getByRole('region', { name: 'Platform roles' });
    expect(listRoles).toHaveBeenCalledWith('org-1');
    expect(within(acme).getByText('Auditor')).toBeInTheDocument();
    expect(
      within(acme).getByText(
        'Created by the administrators of Acme. Only Acme sees and grants them.',
      ),
    ).toBeInTheDocument();
    expect(within(platform).getByText('Organization Viewer')).toBeInTheDocument();
  });

  it('marks a role for apps, and counts holders from the grants of the organization', async () => {
    render(RolesPage);

    await screen.findByText('Deploy bot');
    expect(screen.getByText('Apps only')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('shows a platform role read only: no selection, no edit', async () => {
    render(RolesPage);

    await screen.findByText('Organization Viewer');
    expect(screen.getByRole('checkbox', { name: 'Organization Viewer' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Auditor' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /Organization Viewer/ }));
    expect(await screen.findByText('Platform')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
  });

  it('opens its own role for edit, tagged with the organization and who holds it', async () => {
    render(RolesPage);

    await userEvent.click(await screen.findByRole('button', { name: /Auditor/ }));
    expect(await screen.findByRole('button', { name: /Edit/ })).toBeEnabled();
    expect(screen.getByText('For people')).toBeInTheDocument();
    expect(await screen.findByText('dave')).toBeInTheDocument();
  });

  it('hides the counts when the grants are out of reach, rather than showing zero', async () => {
    holding({
      scope: PermissionScope.ORGANIZATION,
      scopeId: 'org-1',
      access: {
        kind: 'restricted',
        permissions: [Permission.MANAGE_ORG_ROLES, Permission.READ_ORGANIZATION],
      },
    });
    render(RolesPage);

    await screen.findByText('Auditor');
    expect(screen.queryByText(/members$/)).not.toBeInTheDocument();
  });
});

describe('RolesPage — the role editor is a page of its own', () => {
  let navigator: ReturnType<typeof installTestNavigator>;

  beforeEach(() => {
    navigator = installTestNavigator({ pathname: '/acme/roles' });
  });

  afterEach(() => navigator.restore());

  it('opens the creation page of the organization from the header button', async () => {
    render(RolesPage);
    await screen.findByText('Auditor');

    await userEvent.click(screen.getByRole('button', { name: 'Create role' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/roles/new', undefined);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the edit page of its own role', async () => {
    render(RolesPage);
    await userEvent.click(await screen.findByRole('button', { name: /Auditor/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Edit/ }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/roles/auditor/edit', undefined);
  });
});
