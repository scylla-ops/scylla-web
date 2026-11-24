import { describe, it, expect } from 'vitest';
import type { MemberRoleEntity } from '@base/features/access';
import type { RoleEntity } from '@base/features/roles';
import { otherScopes, roleChoices } from '../role-choices.presenter.ts';

const option = (key: string, overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  key,
  name: key,
  description: `About ${key}`,
  level: 'workspace',
  holder: 'people',
  grantName: key,
  builtin: false,
  fullControl: false,
  permissions: [],
  holderCount: 0,
  ...overrides,
});

const held = (role: string, overrides: Partial<MemberRoleEntity> = {}): MemberRoleEntity => ({
  scopeKind: 'workspace',
  scopeId: 'w-1',
  scopeName: 'Acme',
  role,
  roleKey: role,
  roleName: role,
  ...overrides,
});

describe('roleChoices', () => {
  it('keeps the order of the list when a role changes, so that a row does not move', () => {
    const options = [option('a'), option('b'), option('c')];

    expect(roleChoices(options, [], undefined, []).map(one => one.grantName)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(roleChoices(options, [held('c')], undefined, []).map(one => one.grantName)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('puts a held role that the list does not have first', () => {
    const choices = roleChoices([option('a')], [held('old')], undefined, []);

    expect(choices.map(one => [one.grantName, one.held])).toEqual([
      ['old', true],
      ['a', false],
    ]);
  });

  it('locks nothing before the permissions of the caller load', () => {
    const [choice] = roleChoices([option('a', { fullControl: true })], [], undefined, []);

    expect(choice?.locked).toBe(false);
  });

  it('does not lock a held role: Revoke has no escalation check', () => {
    const area = {
      id: 'secrets',
      permissions: [{ id: 'secrets.delete', action: 'delete', level: 'workspace', holders: ['people'] }],
    } as never;
    const role = option('a', { permissions: ['secrets.delete'] });

    expect(roleChoices([role], [held('a')], new Set(), [area])[0]?.locked).toBe(false);
    expect(roleChoices([role], [], new Set(), [area])[0]?.locked).toBe(true);
  });

  it('marks only a role that is not built in as custom', () => {
    const choices = roleChoices([option('a'), option('b', { builtin: true })], [], undefined, []);

    expect(choices.map(one => one.custom)).toEqual([true, false]);
  });
});

describe('otherScopes', () => {
  it('gives one line for each scope, in the order of the roles', () => {
    const scopes = otherScopes([
      held('editor', { scopeKind: 'project', scopeId: 'p-1', scopeName: 'api' }),
      held('viewer', { scopeKind: 'project', scopeId: 'p-2', scopeName: 'web' }),
      held('admin', { scopeKind: 'project', scopeId: 'p-1', scopeName: 'api' }),
    ]);

    expect(scopes).toEqual([
      { kind: 'project', id: 'p-1', name: 'api', roles: ['editor', 'admin'] },
      { kind: 'project', id: 'p-2', name: 'web', roles: ['viewer'] },
    ]);
  });
});
