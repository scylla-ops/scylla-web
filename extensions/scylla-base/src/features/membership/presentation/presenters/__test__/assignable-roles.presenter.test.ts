// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  assignableForPeople,
  groupAssignableRoles,
  type AssignableRole,
} from '../assignable-roles.presenter.ts';

const assignable = (roleId: string, ownedByWorkspace: boolean): AssignableRole => ({
  roleId,
  name: roleId,
  description: '',
  ownedByWorkspace,
});

describe('assignableForPeople', () => {
  it('offers the fixed roles of a workspace, the strongest first, and never runner', () => {
    expect(assignableForPeople('workspace').map(role => role.roleId)).toEqual([
      'admin',
      'member',
      'viewer',
    ]);
  });

  it('offers the fixed roles of a project', () => {
    expect(assignableForPeople('project').map(role => role.roleId)).toEqual([
      'admin',
      'editor',
      'viewer',
    ]);
  });

  it('gives each role its name and what it allows', () => {
    const [admin] = assignableForPeople('workspace');

    expect(admin).toMatchObject({ name: 'Admin', ownedByWorkspace: true });
    expect(admin.description).not.toBe('');
  });

  it('offers nothing on the platform', () => {
    expect(assignableForPeople('platform')).toEqual([]);
  });
});

describe('groupAssignableRoles', () => {
  it("puts the workspace's roles first, then the platform roles", () => {
    const groups = groupAssignableRoles([
      assignable('workspace-viewer', false),
      assignable('auditor', true),
      assignable('support', false),
    ]);

    expect(groups.map(group => [group.owner, group.roles.map(role => role.roleId)])).toEqual([
      ['workspace', ['auditor']],
      ['platform', ['workspace-viewer', 'support']],
    ]);
  });

  it('leaves an empty group out, so no header stands alone', () => {
    expect(groupAssignableRoles([assignable('support', false)]).map(group => group.owner)).toEqual([
      'platform',
    ]);
    expect(groupAssignableRoles([])).toEqual([]);
  });
});
