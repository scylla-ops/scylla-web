import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, PrincipalKind, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { WidgetInjection } from '@scylla/core-sdk';
import {
  render,
  withQueryClient,
  withRegistry,
  withWidgetInjections,
} from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import { membershipPoints } from '@base/features/membership/presentation/membership.points.ts';
import OrganizationMembersPage from './OrganizationMembers.page.svelte';

const probe = () => import('./OrganizationMembersProbe.fixture.svelte');

let listMembers: ReturnType<typeof vi.fn>;
let listGrants: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

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

const setUp = (injection?: WidgetInjection) => {
  if (injection) teardown.push(withWidgetInjections({ 'ee-members': injection }));
  render(OrganizationMembersPage);
};

beforeEach(() => {
  listMembers = vi.fn().mockResolvedValue(
    ScyllaResult.success([
      { userId: 'user-1', username: 'alice' },
      { userId: 'user-2', username: 'bob' },
    ]),
  );
  listGrants = vi.fn().mockResolvedValue(
    ScyllaResult.success([
      {
        id: 'grant-1',
        principal: { kind: PrincipalKind.USER, id: 'user-1' },
        roleId: 'organization-admin',
        scope: PermissionScope.ORGANIZATION,
        scopeId: 'org-1',
      },
    ]),
  );

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({
    organization: { organizationRepository: { listMembers } },
    user: { userRepository: { getAll: vi.fn().mockResolvedValue(ScyllaResult.success([])) } },
    roles: {
      permissionRepository: {
        listGrants,
        listGrantableRoles: vi.fn().mockResolvedValue(ScyllaResult.success([])),
        listRoles: vi.fn().mockResolvedValue(ScyllaResult.success([])),
        createGrant: vi.fn(),
        revokeGrant: vi.fn(),
        revokeAllAccess: vi.fn(),
        getMyPermissions: vi.fn().mockResolvedValue(ScyllaResult.success({ scopes: [] })),
      },
    },
  });
  teardown = [cache.restore, restoreRegistry];

  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: null, name: null },
  });
  grant('all');
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('OrganizationMembers.page with widget injections', () => {
  it('gives the organization, the right to manage and the member count to a header action', async () => {
    setUp([membershipPoints.organizationActions.inject({ component: probe })]);
    await screen.findByText('alice');

    expect(await screen.findByTestId('organization-members-probe')).toHaveTextContent(
      'Acme|org-1|2|true',
    );
    expect(screen.getByRole('button', { name: 'Add a member' })).toBeInTheDocument();
  });

  it('puts a header action in place of "Add a member" with `replace`', async () => {
    setUp([
      membershipPoints.organizationActions.inject({ component: probe, position: 'replace' }),
    ]);
    expect(await screen.findByTestId('organization-members-probe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a member' })).not.toBeInTheDocument();
  });

  it('renders a section under the members list', async () => {
    setUp([membershipPoints.organizationSection.inject({ component: probe })]);

    expect(await screen.findByTestId('organization-members-probe')).toBeInTheDocument();
  });

  it('reloads the members and their grants when a component asks for it', async () => {
    setUp([membershipPoints.organizationSection.inject({ component: probe })]);
    await screen.findByText('alice');
    const members = listMembers.mock.calls.length;
    const grants = listGrants.mock.calls.length;

    await userEvent.click(await screen.findByTestId('organization-members-probe'));

    await vi.waitFor(() => expect(listMembers.mock.calls.length).toBe(members + 1));
    await vi.waitFor(() => expect(listGrants.mock.calls.length).toBe(grants + 1));
  });

  it('hides "Add a member" without LIST_USERS when an extension asks for it', async () => {
    grant([Permission.MANAGE_ORG_GRANTS]);
    setUp([
      membershipPoints.organizationAddMember.patch(action => ({
        ...action,
        withoutDirectory: 'hide',
      })),
    ]);
    await screen.findByText('alice');

    expect(screen.queryByRole('button', { name: 'Add a member' })).not.toBeInTheDocument();
  });

  it('keeps "Add a member" usable with LIST_USERS, as an outline button', async () => {
    setUp([
      membershipPoints.organizationAddMember.patch(() => ({
        withoutDirectory: 'hide',
        variant: 'outline',
      })),
    ]);
    await screen.findByText('alice');

    const add = screen.getByRole('button', { name: 'Add a member' });
    expect(add).not.toHaveAttribute('aria-disabled');
    expect(add).toHaveAttribute('data-variant', 'outline');
  });
});
