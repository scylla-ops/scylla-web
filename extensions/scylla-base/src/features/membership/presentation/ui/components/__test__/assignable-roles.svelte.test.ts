import { describe, it, expect } from 'vitest';
import { PermissionScope } from '@platform/authz';
import { createAssignableRoles } from '../assignable-roles.state.svelte.ts';

const roles = (scope: PermissionScope) => {
  let state!: ReturnType<typeof createAssignableRoles>;
  const cleanup = $effect.root(() => {
    state = createAssignableRoles(scope);
  });
  return { state, cleanup };
};

describe('createAssignableRoles', () => {
  it('offers the fixed roles of a workspace with no call', () => {
    const { state, cleanup } = roles(PermissionScope.ORGANIZATION);

    expect(state.assignableRoles.map(role => role.roleId)).toEqual(['admin', 'member', 'viewer']);
    expect(state.isLoading).toBe(false);
    cleanup();
  });

  it('offers the fixed roles of a project', () => {
    const { state, cleanup } = roles(PermissionScope.PROJECT);

    expect(state.assignableRoles.map(role => role.roleId)).toEqual(['admin', 'editor', 'viewer']);
    cleanup();
  });

  it('names any role, an owner and a role of an edition included', () => {
    const { state, cleanup } = roles(PermissionScope.PROJECT);

    expect(state.labelFor('owner')).toBe('Owner');
    expect(state.labelFor('release_manager')).toBe('Release manager');
    cleanup();
  });
});
