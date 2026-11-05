// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
import { groupRoles } from '../roles-list.presenter.ts';

const role = (over: Partial<RoleEntity>): RoleEntity => ({
  key: 'k',
  name: 'Role',
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: 'k',
  builtin: true,
  fullControl: false,
  permissions: [],
  holderCount: 0,
  ...over,
});

describe('groupRoles', () => {
  const roles = [
    role({ key: 'agent', name: 'Agent', holder: 'apps' }),
    role({ key: 'member', name: 'Member' }),
    role({ key: 'admin', name: 'Instance admin', level: 'platform' }),
  ];

  it('orders the groups, and puts a role for apps with the machines', () => {
    expect(groupRoles(roles, 'all', '').map(group => group.id)).toEqual([
      'platform',
      'workspace',
      'machines',
    ]);
  });

  it('keeps one group with a filter, and the names that fit the search', () => {
    expect(groupRoles(roles, 'workspace', '').map(group => group.id)).toEqual(['workspace']);
    const [group] = groupRoles(roles, 'all', ' ADMIN ');
    expect(group?.roles.map(kept => kept.key)).toEqual(['admin']);
  });
});
