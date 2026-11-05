// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { MemberEntity, MemberRoleEntity } from '@base/features/access';
import {
  buildMemberRows,
  buildProjectMemberRows,
  filterMemberRows,
} from '../member-rows.presenter.ts';

const role = (overrides: Partial<MemberRoleEntity>): MemberRoleEntity => ({
  scopeKind: 'workspace',
  scopeId: 'w',
  scopeName: 'acme',
  role: 'member',
  roleKey: 'workspace-member',
  roleName: 'Workspace member',
  ...overrides,
});

const member = (roles: MemberRoleEntity[], actorKind = 'user'): MemberEntity => ({
  actorId: 'a',
  actorKind,
  displayName: 'Lina',
  handle: 'lina',
  roles,
});

const project = role({ scopeKind: 'project', scopeId: 'p', scopeName: 'api', roleKey: 'project-editor' });

describe('buildMemberRows', () => {
  it('splits the roles by scope, and keeps the oldest date', () => {
    const old = new Date('2026-01-01');
    const [row] = buildMemberRows([
      member([role({ grantedAt: new Date('2026-05-01') }), { ...project, grantedAt: old }]),
    ]);

    expect(row?.workspaceRoles).toHaveLength(1);
    expect(row?.projectRoles).toHaveLength(1);
    expect(row?.addedAt).toEqual(old);
  });

  it('has no date when no grant tells one', () => {
    expect(buildMemberRows([member([role({})])])[0]?.addedAt).toBeUndefined();
  });

  it('knows who is admin of every project', () => {
    const owner = role({ roleKey: 'owner' });
    const workspaceAdmin = role({ roleKey: 'workspace-admin' });

    expect(buildMemberRows([member([owner])])[0]?.adminOfEachProject).toBe(true);
    expect(buildMemberRows([member([workspaceAdmin])])[0]?.adminOfEachProject).toBe(true);
    expect(buildMemberRows([member([role({})])])[0]?.adminOfEachProject).toBe(false);
  });

  it('puts an app on the tab of the apps', () => {
    expect(buildMemberRows([member([role({})], 'app')])[0]?.tab).toBe('apps');
  });
});

describe('filterMemberRows', () => {
  const rows = buildMemberRows([member([role({})]), { ...member([role({})], 'app'), displayName: 'bot', handle: '' }]);

  it('keeps the tab, then the search on the name and the handle', () => {
    expect(filterMemberRows(rows, 'people', '')).toHaveLength(1);
    expect(filterMemberRows(rows, 'apps', 'bot')).toHaveLength(1);
    expect(filterMemberRows(rows, 'people', 'LIN')).toHaveLength(1);
    expect(filterMemberRows(rows, 'people', 'nobody')).toHaveLength(0);
  });
});

describe('buildProjectMemberRows', () => {
  it('shows the nearest scope first, each one once', () => {
    const [row] = buildProjectMemberRows([member([role({}), project, { ...project, roleKey: 'other' }])]);

    expect(row?.scopes.map(scope => scope.scopeKind)).toEqual(['project', 'workspace']);
    expect(row?.inheritedOnly).toBe(false);
  });

  it('knows a member with only a role from above', () => {
    expect(buildProjectMemberRows([member([role({})])])[0]?.inheritedOnly).toBe(true);
  });

  it('puts the roles of the project before the roles from above', () => {
    const rows = buildProjectMemberRows([
      { ...member([role({})]), actorId: 'above' },
      { ...member([project]), actorId: 'here' },
    ]);

    expect(rows.map(row => row.actorId)).toEqual(['here', 'above']);
  });
});
