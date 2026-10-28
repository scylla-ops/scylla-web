// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  Permission,
  PermissionScope,
  type EffectivePermissions,
  type EffectiveScope,
} from '@platform/authz';
import {
  lockedPermissionsOf,
  roleConfers,
  RoleKind,
  updateRole,
  type RoleEntity,
} from '../role.entity.ts';

const role = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-1',
  name: 'CI runner',
  description: 'runs pipelines',
  scope: PermissionScope.PROJECT,
  origin: { kind: 'custom' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.RUN_PIPELINE] },
  ...overrides,
});

describe('roleConfers', () => {
  it('a restricted role confers what its permissions imply', () => {
    const access = { kind: 'restricted', permissions: [Permission.MANAGE_ROLES] } as const;
    expect(
      roleConfers(
        role({ access: { ...access, permissions: [...access.permissions] } }),
        Permission.MANAGE_SYSTEM_GRANTS,
      ),
    ).toBe(true);
  });

  it('a fullControl role confers everything', () => {
    expect(roleConfers(role({ access: { kind: 'fullControl' } }), Permission.DELETE_PROJECT)).toBe(
      true,
    );
  });

  it('a restricted role confers only its listed permissions', () => {
    const r = role({ access: { kind: 'restricted', permissions: [Permission.RUN_PIPELINE] } });
    expect(roleConfers(r, Permission.RUN_PIPELINE)).toBe(true);
    expect(roleConfers(r, Permission.DELETE_PIPELINE)).toBe(false);
  });

  it('an unknown access arm confers everything, not nothing (deliberately, per the doc comment)', () => {
    expect(roleConfers(role({ access: { kind: 'unknown' } }), Permission.DELETE_PROJECT)).toBe(
      true,
    );
  });

  it('a missing role (undefined) confers everything - denying would hide access that actually exists', () => {
    expect(roleConfers(undefined, Permission.DELETE_PROJECT)).toBe(true);
  });
});

describe('updateRole', () => {
  it('merges changes onto the role, keeping the id fixed', () => {
    const r = role();
    const updated = updateRole(r, { name: 'New name', id: 'ignored-attempt' });
    expect(updated.name).toBe('New name');
    expect(updated.id).toBe('role-1');
  });

  it('leaves fields not present in changes untouched', () => {
    const r = role({ description: 'original' });
    const updated = updateRole(r, { name: 'renamed' });
    expect(updated.description).toBe('original');
  });

  it('rejects a rename to an empty (or whitespace-only) name', () => {
    expect(() => updateRole(role(), { name: '' })).toThrow('Role name cannot be empty');
    expect(() => updateRole(role(), { name: '   ' })).toThrow('Role name cannot be empty');
  });

  it('does not throw when name is simply absent from changes (no rename intended)', () => {
    expect(() => updateRole(role(), { description: 'new description' })).not.toThrow();
  });

  it('returns a new object rather than mutating the original', () => {
    const r = role();
    const updated = updateRole(r, { name: 'renamed' });
    expect(updated).not.toBe(r);
    expect(r.name).toBe('CI runner');
  });
});

const restricted = (
  scope: PermissionScope,
  scopeId: string,
  permissions: Permission[],
): EffectiveScope => ({ scope, scopeId, access: { kind: 'restricted', permissions } });

const holding = (...scopes: EffectiveScope[]): EffectivePermissions => ({ scopes });

describe('lockedPermissionsOf', () => {
  it('locks what the author does not hold, and nothing else', () => {
    const effective = holding(
      restricted(PermissionScope.ORGANIZATION, 'org-1', [Permission.RUN_PIPELINE]),
    );

    const locked = lockedPermissionsOf(
      [Permission.RUN_PIPELINE, Permission.DELETE_PIPELINE],
      PermissionScope.PROJECT,
      effective,
      'org-1',
    );

    expect([...locked]).toEqual([Permission.DELETE_PIPELINE]);
  });

  it('locks a stand-in when the author lacks what it carries', () => {
    // At project scope, listing the pipelines also writes READ_PIPELINE.
    const effective = holding(
      restricted(PermissionScope.ORGANIZATION, 'org-1', [Permission.LIST_PIPELINES_BY_PROJECT]),
    );

    const locked = lockedPermissionsOf(
      [Permission.LIST_PIPELINES_BY_PROJECT],
      PermissionScope.PROJECT,
      effective,
      'org-1',
    );

    expect(locked.has(Permission.LIST_PIPELINES_BY_PROJECT)).toBe(true);
  });
});
