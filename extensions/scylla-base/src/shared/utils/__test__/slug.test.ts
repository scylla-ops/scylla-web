// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { slugifyWorkspaceName } from '../slug';

describe('slugifyWorkspaceName', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyWorkspaceName('My Workspace')).toBe('my-workspace');
  });

  it('collapses runs of non-alphanumeric characters into a single hyphen', () => {
    expect(slugifyWorkspaceName('Foo___Bar!!  Baz')).toBe('foo-bar-baz');
  });

  it('trims leading/trailing whitespace before slugifying', () => {
    expect(slugifyWorkspaceName('  Padded Name  ')).toBe('padded-name');
  });

  it('strips leading/trailing hyphens produced by punctuation at the edges', () => {
    expect(slugifyWorkspaceName('--Weird--')).toBe('weird');
    expect(slugifyWorkspaceName('!Org!')).toBe('org');
  });

  it('keeps digits', () => {
    expect(slugifyWorkspaceName('Team 42')).toBe('team-42');
  });

  it('returns an empty string for input with no alphanumeric characters', () => {
    expect(slugifyWorkspaceName('!!!')).toBe('');
  });
});
