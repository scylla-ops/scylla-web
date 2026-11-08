import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, type Mock } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { MemberEntity, MemberRoleEntity } from '@base/features/access';
import type { WidgetInjection } from '@scylla/core-sdk';
import { render, withQueryClient, withRegistry, withWidgetInjections } from '@test/render.ts';
import { membershipPoints } from '@base/features/membership/presentation/membership.points.ts';
import ProjectMembersPage from './ProjectMembers.page.svelte';

const probe = () => import('./ProjectMembersProbe.fixture.svelte');

beforeAll(async () => {
  await probe();
});

const role = (overrides: Partial<MemberRoleEntity>): MemberRoleEntity => ({
  scopeKind: 'project',
  scopeId: 'project-1',
  scopeName: 'Web',
  role: 'editor',
  roleKey: 'project-editor',
  roleName: 'Project editor',
  ...overrides,
});

const member = (id: string, name: string, roles: MemberRoleEntity[]): MemberEntity => ({
  actorId: id,
  actorKind: 'user',
  displayName: name,
  handle: name.toLowerCase(),
  roles,
});

const inWorkspace = {
  scopeKind: 'workspace',
  scopeId: 'org-1',
  scopeName: 'Acme',
  role: 'viewer',
  roleKey: 'workspace-viewer',
  roleName: 'Workspace viewer',
} as const;

let teardown: Array<() => void> = [];
let listMembers: Mock<() => Promise<MemberEntity[]>>;
let revokeRole: Mock<() => Promise<void>>;

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
  render(ProjectMembersPage, { projectId: 'project-1' });
};

beforeEach(() => {
  listMembers = vi.fn<() => Promise<MemberEntity[]>>().mockResolvedValue([
    member('user-1', 'Alice', [role({}), role(inWorkspace)]),
    member('user-2', 'Bob', [role(inWorkspace)]),
  ]);
  revokeRole = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

  const cache = withQueryClient();
  const restoreRegistry = withRegistry({
    access: {
      accessRepository: {
        listMembers,
        grant: vi.fn(),
        revoke: revokeRole,
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
  teardown = [cache.restore, restoreRegistry];

  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'Web' },
  });
  grant('all');
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('ProjectMembersPage', () => {
  it('renders nothing without a project id', () => {
    render(ProjectMembersPage);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the roles here and where they come from', async () => {
    setUp();

    const alice = (await screen.findByText('Alice')).closest('tr') as HTMLElement;
    expect(within(alice).getByText('Project editor')).toBeInTheDocument();
    expect(within(alice).getByText('Workspace viewer')).toBeInTheDocument();
    expect(within(alice).getByText('Web')).toBeInTheDocument();
    expect(within(alice).getByText('Acme')).toBeInTheDocument();
  });

  it('sends a role from above to the place where it is given', async () => {
    setUp();

    const bob = (await screen.findByText('Bob')).closest('tr') as HTMLElement;
    expect(within(bob).getByRole('button', { name: 'Change in Acme' })).toBeInTheDocument();
  });

  it('lets a manager change only the roles of the project', async () => {
    setUp();

    const alice = (await screen.findByText('Alice')).closest('tr') as HTMLElement;
    const bob = (await screen.findByText('Bob')).closest('tr') as HTMLElement;
    expect(within(alice).getByRole('button', { name: 'Change roles' })).toBeInTheDocument();
    expect(within(bob).queryByRole('button', { name: 'Change roles' })).not.toBeInTheDocument();
  });

  it('says that a project role needs a role in the workspace', async () => {
    setUp();

    expect(
      await screen.findByText('A project role needs a role in Acme first'),
    ).toBeInTheDocument();
  });

  it('disables adding without MANAGE_PROJECT_GRANTS', async () => {
    grant([Permission.LIST_PROJECT_MEMBERS]);
    setUp();
    await screen.findByText('Alice');

    expect(screen.getByRole('button', { name: 'Add to Web' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('gives the project, the right to manage and the member count to its zone', async () => {
    setUp([membershipPoints.projectSection.inject({ component: probe })]);

    expect(await screen.findByTestId('project-members-probe')).toHaveTextContent(
      'org-1|project-1|2|true',
    );
  });

  it('shows a removed role at once in the dialog, and shows the roles from above as read only', async () => {
    let aliceRoles: MemberRoleEntity[] = [role({}), role(inWorkspace)];
    listMembers.mockImplementation(() => Promise.resolve([member('user-1', 'Alice', aliceRoles)]));
    revokeRole.mockImplementation(() => {
      aliceRoles = [role(inWorkspace)];
      return Promise.resolve();
    });
    setUp();
    const alice = (await screen.findByText('Alice')).closest('tr') as HTMLElement;

    await userEvent.click(within(alice).getByRole('button', { name: 'Change roles' }));
    const dialog = await screen.findByRole('dialog');
    const row = await within(dialog).findByRole('checkbox', { name: 'Project editor' });
    expect(within(dialog).queryByRole('checkbox', { name: 'Workspace viewer' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Change in Acme' })).toBeInTheDocument();
    await userEvent.click(row);

    await vi.waitFor(() =>
      expect(within(dialog).queryByRole('checkbox', { name: 'Project editor' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Change the roles of Alice');
  });
});
