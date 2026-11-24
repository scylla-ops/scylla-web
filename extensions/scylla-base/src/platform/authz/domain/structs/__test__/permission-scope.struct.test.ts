// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PermissionScope, scopeCovers } from '../permission-scope.struct.ts';

const { UNSPECIFIED, SYSTEM, WORKSPACE, PROJECT } = PermissionScope;

describe('scopeCovers', () => {
  it('a scope covers itself and every narrower scope', () => {
    expect(scopeCovers(SYSTEM, SYSTEM)).toBe(true);
    expect(scopeCovers(SYSTEM, WORKSPACE)).toBe(true);
    expect(scopeCovers(SYSTEM, PROJECT)).toBe(true);
    expect(scopeCovers(WORKSPACE, WORKSPACE)).toBe(true);
    expect(scopeCovers(WORKSPACE, PROJECT)).toBe(true);
    expect(scopeCovers(PROJECT, PROJECT)).toBe(true);
  });

  it('a scope never covers a broader one', () => {
    expect(scopeCovers(WORKSPACE, SYSTEM)).toBe(false);
    expect(scopeCovers(PROJECT, WORKSPACE)).toBe(false);
    expect(scopeCovers(PROJECT, SYSTEM)).toBe(false);
  });

  it('an unknown scope covers nothing and nothing covers it', () => {
    expect(scopeCovers(UNSPECIFIED, PROJECT)).toBe(false);
    expect(scopeCovers(SYSTEM, UNSPECIFIED)).toBe(false);
  });
});
