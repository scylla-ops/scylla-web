import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import type { MemberRoleEntity } from '@base/features/access';
import { render } from '@test/render.ts';
import { buildMemberRows } from '../../../presenters/member-rows.presenter.ts';
import MembersTable from './MembersTable.svelte';

const workspaceRole = (roleKey: string, roleName: string): MemberRoleEntity => ({
  scopeKind: 'workspace',
  scopeId: 'w',
  scopeName: 'acme',
  role: roleKey,
  roleKey,
  roleName,
});

const projectRole = (roleKey: string, roleName: string): MemberRoleEntity => ({
  scopeKind: 'project',
  scopeId: 'p',
  scopeName: 'fdfs',
  role: roleKey,
  roleKey,
  roleName,
});

const projectRolesCell = (...roles: MemberRoleEntity[]) => {
  const rows = buildMemberRows([
    { actorId: 'a', actorKind: 'user', displayName: 'Lina', handle: 'lina', runner: false, roles },
  ]);
  render(MembersTable, {
    rows,
    isLoading: false,
    userFor: () => undefined,
    canManage: false,
    onOpen: vi.fn(),
    onChangeRoles: vi.fn(),
    onRemove: vi.fn(),
  });
  return screen.getAllByRole('cell')[2];
};

const pills = (cell: HTMLElement) =>
  within(cell)
    .queryAllByText(/·/)
    .map(pill => pill.textContent?.trim());

const admin = workspaceRole('workspace-admin', 'Workspace admin');
const appCreator = workspaceRole('app-creator', 'App creator');

describe('MembersTable, the Project roles column', () => {
  it('puts the pill of all projects before the project roles', () => {
    const cell = projectRolesCell(
      workspaceRole('owner', 'Owner'),
      projectRole('a-custom-role', 'test'),
      projectRole('project-admin', 'Project admin'),
    );

    expect(pills(cell)).toEqual([
      'All projects · Project admin',
      'fdfs · test',
      'fdfs · Project admin',
    ]);
  });

  it('shows only the pill of all projects for an admin with no project role', () => {
    const cell = projectRolesCell(admin);

    expect(pills(cell)).toEqual(['All projects · Project admin']);
    expect(within(cell).queryByText('No project role')).not.toBeInTheDocument();
  });

  it.each([
    ['workspace-member', 'Workspace member', 'All projects · Project editor'],
    ['workspace-viewer', 'Workspace viewer', 'All projects · Project viewer'],
    ['agent', 'Agent', 'All projects · Project agent'],
  ])('tells the access of %s on all projects', (roleKey, roleName, pill) => {
    expect(pills(projectRolesCell(workspaceRole(roleKey, roleName)))).toEqual([pill]);
  });

  it('gives the pill the fill of a workspace role, and not the outline of a project role', () => {
    const cell = projectRolesCell(admin, projectRole('project-admin', 'Project admin'));
    const pill = within(cell).getByText('All projects · Project admin');

    expect(pill.className).toBe(screen.getByText('Workspace admin').className);
    expect(pill.className).not.toBe(within(cell).getByText('fdfs · Project admin').className);
  });

  it('shows only the project roles when the workspace role gives no project access', () => {
    const cell = projectRolesCell(appCreator, projectRole('project-editor', 'Project editor'));

    expect(pills(cell)).toEqual(['fdfs · Project editor']);
    expect(within(cell).queryByText('No project role')).not.toBeInTheDocument();
  });

  it.each([
    ['App creator', appCreator],
    ['a custom workspace role', workspaceRole('a-custom-role', 'Deployers')],
  ])('says that there is no project role for %s', (_name, role) => {
    const cell = projectRolesCell(role);

    expect(pills(cell)).toEqual([]);
    expect(within(cell).getByText('No project role')).toBeInTheDocument();
  });
});
