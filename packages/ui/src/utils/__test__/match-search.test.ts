// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { matchesSearch } from '../match-search.ts';

describe('matchesSearch', () => {
  it('keeps each row for an empty search', () => {
    expect(matchesSearch('', ['web'])).toBe(true);
    expect(matchesSearch('   ', [])).toBe(true);
  });

  it('does not count the case or the accents, on either side', () => {
    expect(matchesSearch('SEB', ['Sébastien'])).toBe(true);
    expect(matchesSearch('sébastien', ['Sebastien'])).toBe(true);
  });

  it('finds a word in the middle of a field', () => {
    expect(matchesSearch('dep', ['my-deploy-bot'])).toBe(true);
  });

  it('finds each word, in any order and in any field', () => {
    expect(matchesSearch('admin local', ['Local Admin'])).toBe(true);
    expect(matchesSearch('local @lo', ['Local Admin', '@local-admin'])).toBe(true);
  });

  it('refuses a row when one word is missing', () => {
    expect(matchesSearch('local viewer', ['Local Admin'])).toBe(false);
  });

  it('skips a field that is not set', () => {
    expect(matchesSearch('undefined', ['web', undefined])).toBe(false);
  });
});
