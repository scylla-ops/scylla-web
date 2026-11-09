// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { MemberRoleEntity } from '@base/features/access';
import { memberScopes } from '../member-scopes.presenter.ts';

const role = (overrides: Partial<MemberRoleEntity>): MemberRoleEntity => ({
  scopeKind: 'workspace',
  scopeId: 'w',
  scopeName: 'acme',
  role: 'member',
  roleKey: 'workspace-member',
  roleName: 'Workspace member',
  ...overrides,
});

const inProject = (scopeId: string, scopeName: string, name: string) =>
  role({ scopeKind: 'project', scopeId, scopeName, role: name, roleName: name });

describe('memberScopes', () => {
  it('puts the projects in the workspace, each one once, in the order of their first role', () => {
    const scopes = memberScopes(
      [
        inProject('p-2', 'web', 'viewer'),
        role({}),
        inProject('p-1', 'api', 'editor'),
        inProject('p-2', 'web', 'editor'),
      ],
      'Acme',
    );

    expect(scopes.workspace).toEqual({ name: 'Acme', roles: [role({})] });
    expect(scopes.projects.map(project => [project.id, project.name])).toEqual([
      ['p-2', 'web'],
      ['p-1', 'api'],
    ]);
    expect(scopes.projects[0]?.roles.map(one => one.role)).toEqual(['viewer', 'editor']);
  });

  it('keeps the workspace when the member has only project roles', () => {
    const scopes = memberScopes([inProject('p-1', 'api', 'editor')], 'Acme');

    expect(scopes.workspace).toEqual({ name: 'Acme', roles: [] });
    expect(scopes.projects).toHaveLength(1);
  });
});
