// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
import { groupRoles, nextSort, sortRoles } from '../roles-list.presenter.ts';

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

describe('sortRoles', () => {
  const roles = [
    role({ key: 'b', name: 'Security reviewer' }),
    role({ key: 'a', name: 'créateur de pipeline' }),
    role({ key: 'c', name: 'Agent' }),
  ];
  const keys = (sorted: RoleEntity[]) => sorted.map(one => one.key);
  const name = (one: RoleEntity) => one.name;

  it('sorts by name A to Z without case, then Z to A', () => {
    expect(keys(sortRoles(roles, 'asc', name))).toEqual(['c', 'a', 'b']);
    expect(keys(sortRoles(roles, 'desc', name))).toEqual(['b', 'a', 'c']);
  });

  it('keeps the order of the server with no sort', () => {
    expect(keys(sortRoles(roles, 'none', name))).toEqual(['b', 'a', 'c']);
  });

  it('goes from A to Z, to Z to A, and back to the default order', () => {
    expect(nextSort('none')).toBe('asc');
    expect(nextSort('asc')).toBe('desc');
    expect(nextSort('desc')).toBe('none');
  });
});
