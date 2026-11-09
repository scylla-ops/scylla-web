import { describe, expect, it } from 'vitest';
import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
import { copyGroups, copySources } from '../role-copy.presenter.ts';

const role = (key: string, overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  key,
  name: key,
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: key,
  builtin: false,
  fullControl: false,
  permissions: [],
  holderCount: 0,
  ...overrides,
});

const roles = [
  role('admin', { level: 'platform' }),
  role('member'),
  role('agent', { holder: 'apps' }),
  role('editor', { level: 'project' }),
];

const keys = (list: readonly RoleEntity[]) => list.map(one => one.key);

describe('copySources', () => {
  it('offers a new role every role of the levels of the page', () => {
    expect(
      keys(
        copySources(roles, {
          level: 'workspace',
          holder: 'people',
          levels: ['workspace', 'project'],
        }),
      ),
    ).toEqual(['member', 'agent', 'editor']);
  });

  it('offers a saved role the roles with its holder, and not the role itself', () => {
    const target = {
      role: { key: 'member', holderCount: 0 },
      level: 'workspace' as const,
      holder: 'people' as const,
      levels: ['workspace', 'project'] as const,
    };

    expect(keys(copySources(roles, target))).toEqual(['editor']);
  });

  it('offers a held role only the roles of its level', () => {
    const target = {
      role: { key: 'other', holderCount: 3 },
      level: 'workspace' as const,
      holder: 'people' as const,
      levels: ['platform', 'workspace', 'project'] as const,
    };

    expect(keys(copySources(roles, target))).toEqual(['member']);
  });
});

describe('copyGroups', () => {
  it('groups the roles by level, in the order of the levels', () => {
    expect(
      copyGroups([...roles].reverse(), '').map(group => [group.level, keys(group.roles)]),
    ).toEqual([
      ['platform', ['admin']],
      ['workspace', ['agent', 'member']],
      ['project', ['editor']],
    ]);
  });

  it('finds a built-in role by its shown name, and leaves out an empty group', () => {
    const builtin = role('workspace-admin', { builtin: true, name: 'admin of the workspace' });

    expect(copyGroups([builtin, role('editor', { level: 'project' })], 'workspace adm')).toEqual([
      { level: 'workspace', roles: [builtin] },
    ]);
  });
});
