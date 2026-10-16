// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  Permission,
  PermissionScope,
  type EffectivePermissionsEntity,
  type EffectiveScopeEntity,
} from '@platform/authz';
import {
  holdsFullControl,
  holdsPermission,
  lockedPermissionsOf,
} from '../role-authoring.calculator.ts';

const restricted = (
  scope: PermissionScope,
  scopeId: string,
  permissions: Permission[],
): EffectiveScopeEntity => ({ scope, scopeId, access: { kind: 'restricted', permissions } });

const full = (scope: PermissionScope, scopeId: string): EffectiveScopeEntity => ({
  scope,
  scopeId,
  access: { kind: 'fullControl' },
});

const holding = (...scopes: EffectiveScopeEntity[]): EffectivePermissionsEntity => ({ scopes });

describe('holdsPermission — the escalation rule of the backend', () => {
  it('counts a grant on the organization that owns the role', () => {
    const effective = holding(
      restricted(PermissionScope.ORGANIZATION, 'org-1', [Permission.RUN_PIPELINE]),
    );

    expect(holdsPermission(effective, 'org-1', Permission.RUN_PIPELINE)).toBe(true);
    expect(holdsPermission(effective, 'org-2', Permission.RUN_PIPELINE)).toBe(false);
  });

  it('counts a System grant for any owner, the platform included', () => {
    const effective = holding(restricted(PermissionScope.SYSTEM, '', [Permission.RUN_PIPELINE]));

    expect(holdsPermission(effective, 'org-1', Permission.RUN_PIPELINE)).toBe(true);
    expect(holdsPermission(effective, null, Permission.RUN_PIPELINE)).toBe(true);
  });

  it('never counts a project grant, even inside the organization', () => {
    const effective = holding(
      restricted(PermissionScope.PROJECT, 'p-1', [Permission.RUN_PIPELINE]),
    );

    expect(holdsPermission(effective, 'org-1', Permission.RUN_PIPELINE)).toBe(false);
  });

  it('never counts an organization grant toward a platform role', () => {
    const effective = holding(full(PermissionScope.ORGANIZATION, 'org-1'));

    expect(holdsPermission(effective, null, Permission.RUN_PIPELINE)).toBe(false);
    expect(holdsFullControl(effective, null)).toBe(false);
  });

  it('lets full control cover every permission, and only full control give it', () => {
    expect(
      holdsPermission(
        holding(full(PermissionScope.ORGANIZATION, 'org-1')),
        'org-1',
        Permission.DELETE_PROJECT,
      ),
    ).toBe(true);
    expect(holdsFullControl(holding(full(PermissionScope.ORGANIZATION, 'org-1')), 'org-1')).toBe(
      true,
    );
    expect(
      holdsFullControl(
        holding(restricted(PermissionScope.ORGANIZATION, 'org-1', [Permission.RUN_PIPELINE])),
        'org-1',
      ),
    ).toBe(false);
  });

  it('holds nothing before the permissions load', () => {
    expect(holdsPermission(null, 'org-1', Permission.RUN_PIPELINE)).toBe(false);
    expect(holdsFullControl(null, 'org-1')).toBe(false);
  });
});

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
