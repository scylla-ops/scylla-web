// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { commitShaIssue } from '../commit-ref.struct.ts';

describe('commitShaIssue', () => {
  it('accepts 7 to 40 hexadecimal characters in either case, around spaces the server trims', () => {
    expect(commitShaIssue('a1b2c3d')).toBeNull();
    expect(commitShaIssue(' A1B2C3D4E5F6A7B8C9D0A1B2C3D4E5F6A7B8C9D0 ')).toBeNull();
  });

  it('asks for a SHA when the field is empty', () => {
    expect(commitShaIssue('   ')).toBe('empty');
  });

  it('refuses a character that is not hexadecimal before it counts the length', () => {
    expect(commitShaIssue('main')).toBe('not-hex');
    expect(commitShaIssue('a1b2 c3d')).toBe('not-hex');
  });

  it('refuses a SHA shorter than 7 or longer than 40 characters', () => {
    expect(commitShaIssue('a1b2c3')).toBe('length');
    expect(commitShaIssue('a'.repeat(41))).toBe('length');
  });
});
