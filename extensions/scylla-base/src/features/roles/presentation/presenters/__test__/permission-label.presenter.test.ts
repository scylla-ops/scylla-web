import { describe, it, expect } from 'vitest';
import { Permission, PermissionScope } from '@platform/authz';
import { humanizePermission, permissionLabelOf, scopeLabelOf } from '../permission-label.presenter.ts';

describe('humanizePermission', () => {
  it('turns an enum key into a readable, capitalized phrase', () => {
    expect(humanizePermission(Permission.LIST_JOBS_BY_PIPELINE)).toBe('List jobs by pipeline');
  });

  it('falls back to a numeric label for a value with no enum key (e.g. a future/unknown wire value)', () => {
    expect(humanizePermission(9999 as Permission)).toBe('Permission #9999');
  });
});

describe('permissionLabelOf', () => {
  it('names a permission of the catalog in words', () => {
    expect(permissionLabelOf(Permission.LIST_USERS)).toBe('View users');
  });

  it('falls back to the humanized key outside the catalog', () => {
    expect(permissionLabelOf(9999 as Permission)).toBe('Permission #9999');
  });
});

describe('scopeLabelOf', () => {
  it('names each scope', () => {
    expect(scopeLabelOf(PermissionScope.ORGANIZATION)).toBe('Organization');
  });
});
