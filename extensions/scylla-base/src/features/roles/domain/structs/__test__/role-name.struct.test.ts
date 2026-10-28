// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { roleNameIssue } from '../role-name.struct.ts';

describe('roleNameIssue', () => {
  it('refuses a name with nothing but spaces', () => {
    expect(roleNameIssue('')).toBe('empty');
    expect(roleNameIssue('   ')).toBe('empty');
  });

  it('accepts any other name', () => {
    expect(roleNameIssue('Deployer')).toBeNull();
  });
});
