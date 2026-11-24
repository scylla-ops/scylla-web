// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { gitGlobIssue, MAX_GLOBS } from '../git-glob.struct.ts';

describe('gitGlobIssue', () => {
  it('takes a new glob, trimmed', () => {
    expect(gitGlobIssue('  release/*  ', ['main'])).toBeNull();
  });

  it('refuses a blank glob, a duplicate and a glob of more than 255 characters', () => {
    expect(gitGlobIssue('   ', [])).toBe('blank');
    expect(gitGlobIssue(' main ', ['main'])).toBe('duplicate');
    expect(gitGlobIssue('a'.repeat(256), [])).toBe('tooLong');
  });

  it('refuses a 33rd glob, as the server does', () => {
    const full = Array.from({ length: MAX_GLOBS }, (_, index) => `v${index}`);
    expect(gitGlobIssue('next', full)).toBe('tooMany');
    expect(gitGlobIssue('next', full.slice(1))).toBeNull();
  });
});
