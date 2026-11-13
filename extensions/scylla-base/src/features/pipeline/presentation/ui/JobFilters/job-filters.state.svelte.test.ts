import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createJobFilters, type JobFilters } from './job-filters.state.svelte.ts';

const withFilters = (run: (filters: JobFilters) => void) => {
  const cleanup = $effect.root(() => {
    const filters = createJobFilters();
    flushSync();
    run(filters);
  });
  cleanup();
};

describe('createJobFilters', () => {
  it('sends only the fields that are set, with a trimmed login', () => {
    withFilters(filters => {
      expect(filters.filter).toEqual({});
      expect(filters.active).toBe(false);

      filters.setBranch('main');
      filters.setEvent('pull_request');
      filters.setAuthor('  lea-martin ');
      filters.setPullRequest('51');

      expect(filters.filter).toEqual({
        branch: 'main',
        event: 'pull_request',
        authorLogin: 'lea-martin',
        pullRequest: 51,
      });
      expect(filters.active).toBe(true);
    });
  });

  it('ignores a pull request that is not a whole number from 1: the server reads 0 as each one', () => {
    withFilters(filters => {
      for (const text of ['0', '-3', '4.5', 'abc', ' ']) {
        filters.setPullRequest(text);
        expect(filters.filter).toEqual({});
      }
    });
  });

  it('clears every field at once', () => {
    withFilters(filters => {
      filters.setBranch('main');
      filters.setEvent('tag');
      filters.setAuthor('lea');
      filters.setPullRequest('7');

      filters.clear();

      expect(filters.filter).toEqual({});
      expect(filters.author).toBe('');
      expect(filters.event).toBeNull();
    });
  });
});
