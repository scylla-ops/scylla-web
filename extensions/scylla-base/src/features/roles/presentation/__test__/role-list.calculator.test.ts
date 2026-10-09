// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Permission, PermissionScope, PrincipalKind, RoleKind } from '@platform/authz';
import type { RoleEntity } from '../../domain/entities/role.entity.ts';
import type { GrantEntity } from '../../domain/entities/grant.entity.ts';
import { countHoldersByRole, groupRolesByOwner, sortRolesByName } from '../role-list.calculator.ts';

const role = (id: string, name: string, owner?: string, scope = PermissionScope.ORGANIZATION): RoleEntity => ({
  id,
  name,
  description: '',
  scope,
  origin: owner ? { kind: 'custom', ownerOrganizationId: owner } : { kind: 'builtin', key: id },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.READ_ORGANIZATION] },
});

const grant = (roleId: string, principalId: string, scopeId: string): GrantEntity => ({
  id: `${roleId}-${principalId}-${scopeId}`,
  principal: { kind: PrincipalKind.USER, id: principalId },
  roleId,
  scope: PermissionScope.PROJECT,
  scopeId,
});

const names = (roles: RoleEntity[]) => roles.map(entry => entry.name);

describe('groupRolesByOwner', () => {
  it("puts the organization's roles apart from the platform roles, each sorted by name", () => {
    const groups = groupRolesByOwner(
      [role('a', 'release', 'org-1'), role('b', 'Viewer'), role('c', 'Auditor', 'org-1'), role('d', 'admin')],
      'org-1',
    );

    expect(names(groups.organization)).toEqual(['Auditor', 'release']);
    expect(names(groups.platform)).toEqual(['admin', 'Viewer']);
  });

  it('drops a role of another organization: it is not this one to show', () => {
    const groups = groupRolesByOwner([role('a', 'Globex', 'org-2'), role('b', 'Viewer')], 'org-1');

    expect(groups.organization).toEqual([]);
    expect(names(groups.platform)).toEqual(['Viewer']);
  });

  it('drops a SYSTEM-scope platform role: no grant in an organization binds it', () => {
    const groups = groupRolesByOwner(
      [role('a', 'System Admin', undefined, PermissionScope.SYSTEM), role('b', 'Project Viewer', undefined, PermissionScope.PROJECT)],
      'org-1',
    );

    expect(names(groups.platform)).toEqual(['Project Viewer']);
  });
});

describe('sortRolesByName', () => {
  it('sorts without regard to case and keeps the input untouched', () => {
    const input = [role('a', 'support'), role('b', 'Admin'), role('c', 'Billing')];

    expect(names(sortRolesByName(input))).toEqual(['Admin', 'Billing', 'support']);
    expect(names(input)).toEqual(['support', 'Admin', 'Billing']);
  });
});

describe('countHoldersByRole', () => {
  it('counts a principal once, even with the role on two projects', () => {
    const counts = countHoldersByRole([
      grant('project-admin', 'admin', 'web'),
      grant('project-admin', 'admin', 'api'),
      grant('project-admin', 'bob', 'web'),
      grant('viewer', 'bob', 'web'),
    ]);

    expect(counts.get('project-admin')).toBe(2);
    expect(counts.get('viewer')).toBe(1);
    expect(counts.get('unknown')).toBeUndefined();
  });

  it('tells a user and an app with the same id apart', () => {
    const counts = countHoldersByRole([
      grant('deployer', 'x', 'web'),
      { ...grant('deployer', 'x', 'api'), principal: { kind: PrincipalKind.APP, id: 'x' } },
    ]);

    expect(counts.get('deployer')).toBe(2);
  });
});
