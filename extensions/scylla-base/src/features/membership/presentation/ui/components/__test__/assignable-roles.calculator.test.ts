// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Permission, PermissionScope, RoleKind } from '@platform/authz';
import type { GrantableRoleEntity, RoleEntity } from '@base/features/roles';
import {
  assignableForPeople,
  groupAssignableRoles,
  type AssignableRole,
} from '../assignable-roles.calculator.ts';

const grantable = (overrides: Partial<GrantableRoleEntity> = {}): GrantableRoleEntity => ({
  roleId: 'organization-viewer',
  name: 'Organization Viewer',
  scope: PermissionScope.ORGANIZATION,
  kind: RoleKind.MEMBER,
  description: 'Reads everything',
  ...overrides,
});

const assignable = (roleId: string, ownedByOrganization: boolean): AssignableRole => ({
  roleId,
  name: roleId,
  description: '',
  ownedByOrganization,
});

describe('assignableForPeople', () => {
  it('never offers a role for apps to a person', () => {
    const roles = assignableForPeople(
      [grantable(), grantable({ roleId: 'deploy-bot', kind: RoleKind.AGENT })],
      new Map(),
    );

    expect(roles.map(role => role.roleId)).toEqual(['organization-viewer']);
  });

  it('marks the roles the organization owns', () => {
    const [platform, owned] = assignableForPeople(
      [grantable(), grantable({ roleId: 'auditor', ownerOrganizationId: 'org-1' })],
      new Map(),
    );

    expect(platform.ownedByOrganization).toBe(false);
    expect(owned.ownedByOrganization).toBe(true);
  });

  it('names a role from the catalog first, then the grantable entry, then its id', () => {
    const catalog: RoleEntity = {
      id: 'auditor',
      name: 'Auditor (catalog)',
      description: 'From the catalog',
      scope: PermissionScope.ORGANIZATION,
      origin: { kind: 'custom', ownerOrganizationId: 'org-1' },
      kind: RoleKind.MEMBER,
      access: { kind: 'restricted', permissions: [Permission.READ_ORGANIZATION] },
    };
    const roles = assignableForPeople(
      [
        grantable({ roleId: 'auditor' }),
        grantable({ roleId: 'support' }),
        grantable({ roleId: 'project-viewer', name: '' }),
      ],
      new Map([['auditor', catalog]]),
    );

    expect(roles.map(role => role.name)).toEqual([
      'Auditor (catalog)',
      'Organization Viewer',
      'Project viewer',
    ]);
    expect(roles[0].role).toBe(catalog);
  });
});

describe('groupAssignableRoles', () => {
  it("puts the organization's roles first, then the platform roles", () => {
    const groups = groupAssignableRoles([
      assignable('organization-viewer', false),
      assignable('auditor', true),
      assignable('support', false),
    ]);

    expect(groups.map(group => [group.owner, group.roles.map(role => role.roleId)])).toEqual([
      ['organization', ['auditor']],
      ['platform', ['organization-viewer', 'support']],
    ]);
  });

  it('leaves an empty group out, so no header stands alone', () => {
    expect(groupAssignableRoles([assignable('support', false)]).map(group => group.owner)).toEqual([
      'platform',
    ]);
    expect(groupAssignableRoles([])).toEqual([]);
  });
});
