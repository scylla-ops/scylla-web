import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import type { AccessEntryEntity, ObjectRef } from '@base/features/access';
import { render, withQueryClient, withRegistry, withWidgetInjections } from '@test/render.ts';
import { membershipPoints } from '@base/features/membership/presentation/membership.points.ts';
import ProjectMembersPage from './ProjectMembers.page.svelte';

const entry = (actorId: string, handle: string, role: string): AccessEntryEntity => ({
  actorId,
  actorKind: 'user',
  displayName: '',
  handle,
  role,
});

const project = { kind: 'project', id: 'project-1' };

let projectEntries: AccessEntryEntity[];
let workspaceEntries: AccessEntryEntity[];
let listAccess: ReturnType<typeof vi.fn>;
let revoke: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

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

beforeEach(() => {
  // alice has a role of the project; bob reaches it through his workspace role.
  projectEntries = [entry('user-1', 'alice', 'editor')];
  workspaceEntries = [entry('user-2', 'bob', 'admin'), entry('user-1', 'alice', 'viewer')];
  // The kind of the object decides which list answers.
  listAccess = vi.fn((object: ObjectRef) =>
    Promise.resolve(object.kind === 'project' ? projectEntries : workspaceEntries),
  );
  revoke = vi.fn().mockResolvedValue(undefined);

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    access: {
      accessRepository: {
        listAccess,
        grant: vi.fn().mockResolvedValue(undefined),
        revoke,
        check: vi.fn().mockResolvedValue(new Set()),
      },
    },
  });

  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'Web' },
  });
  localStorage.setItem('userId', 'user-9');
  grant('all');
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  localStorage.clear();
  permissionsStore.setState({ permissions: null });
});

describe('ProjectMembersPage', () => {
  it('renders nothing without a project id', () => {
    render(ProjectMembersPage, {});

    expect(listAccess).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'project' }));
    expect(screen.queryByRole('button', { name: 'Add a member' })).not.toBeInTheDocument();
  });

  it('lists the holders of a role of the project', async () => {
    render(ProjectMembersPage, { projectId: 'project-1' });

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(listAccess).toHaveBeenCalledWith(project);
  });

  it('also lists someone who only reaches the project through a workspace role', async () => {
    render(ProjectMembersPage, { projectId: 'project-1' });

    expect(await screen.findByText('bob')).toBeInTheDocument();
  });

  it('lets a manager revoke only the roles of the project', async () => {
    render(ProjectMembersPage, { projectId: 'project-1' });
    await screen.findByText('bob');

    expect(screen.getByRole('button', { name: 'Revoke Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke Viewer' })).not.toBeInTheDocument();
  });

  it('explains that inherited roles are visible and managed elsewhere', async () => {
    render(ProjectMembersPage, { projectId: 'project-1' });

    expect(
      await screen.findByText(/inherited from the organization and are managed there/),
    ).toBeInTheDocument();
  });

  it('says what it cannot show when the workspace roles are out of reach', async () => {
    grant([Permission.LIST_PROJECT_MEMBERS, Permission.MANAGE_PROJECT_GRANTS]);
    render(ProjectMembersPage, { projectId: 'project-1' });

    expect(
      await screen.findByText(/Their roles are managed at the organization level/),
    ).toBeInTheDocument();
    expect(listAccess).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'workspace' }));
  });

  it('says so when nobody has access to the project yet', async () => {
    projectEntries = [];
    workspaceEntries = [];
    render(ProjectMembersPage, { projectId: 'project-1' });

    expect(await screen.findByText('Nobody has access to this project yet.')).toBeInTheDocument();
  });

  it('disables adding a member without MANAGE_PROJECT_GRANTS', async () => {
    grant([Permission.LIST_PROJECT_MEMBERS, Permission.LIST_ORGANIZATION_MEMBERS]);
    render(ProjectMembersPage, { projectId: 'project-1' });

    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add a member' })).toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    );
  });

  it('gives the project, the right to manage and the member count to its zones', async () => {
    const restoreInjections = withWidgetInjections({
      'ee-members': [
        membershipPoints.projectActions.inject({
          component: () => import('./ProjectMembersProbe.fixture.svelte'),
        }),
        membershipPoints.projectSection.inject({
          component: () => import('./ProjectMembersProbe.fixture.svelte'),
        }),
      ],
    });
    try {
      render(ProjectMembersPage, { projectId: 'project-1' });
      await screen.findByText('bob');

      await vi.waitFor(() =>
        expect(
          screen.getAllByTestId('project-members-probe').map(probe => probe.textContent?.trim()),
        ).toEqual(['org-1|project-1|2|true', 'org-1|project-1|2|true']),
      );
    } finally {
      restoreInjections();
    }
  });

  it('removes only someone who holds a role of the project, and revokes only that role', async () => {
    render(ProjectMembersPage, { projectId: 'project-1' });
    await screen.findByText('bob');

    // bob's role is inherited: only alice can be removed from this project.
    const removals = screen.getAllByRole('button', { name: 'Remove from the project' });
    expect(removals).toHaveLength(1);

    await userEvent.click(removals[0]);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith(project, 'editor', 'user-1'));
    expect(revoke).toHaveBeenCalledOnce();
  });
});
