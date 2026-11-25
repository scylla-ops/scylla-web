import { describe, it, expect, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { createJobFilters, type JobFilters } from './job-filters.state.svelte.ts';

const PATH = '/acme/projects/project-1/pipelines/pipeline-1/jobs';

let restore = () => {};

afterEach(() => restore());

const withFilters = (run: (filters: JobFilters) => void, search = '') => {
  const navigator = installTestNavigator({ pathname: PATH, search });
  restore = navigator.restore;
  const cleanup = $effect.root(() => {
    const filters = createJobFilters();
    flushSync();
    run(filters);
  });
  cleanup();
  return navigator;
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

  it('reads the filters of a link, so that a copied link opens the same list', () => {
    withFilters(filters => {
      expect(filters.branch).toBe('feature/login');
      expect(filters.event).toBe('pull_request');
      expect(filters.author).toBe('lea-martin');
      expect(filters.filter).toEqual({
        branch: 'feature/login',
        event: 'pull_request',
        authorLogin: 'lea-martin',
        pullRequest: 51,
      });
    }, '?branch=feature%2Flogin&event=pull_request&author=lea-martin&pr=51');
  });

  it('ignores an event of a link that no job has', () => {
    withFilters(filters => expect(filters.event).toBeNull(), '?event=deploy');
  });

  it('writes each change in the URL, in place of the current entry', () => {
    const navigator = withFilters(filters => {
      filters.setBranch('main');
      filters.setEvent('push');
      filters.clear();
    }, '?branch=dev');

    expect(navigator.navigate.mock.calls.map(([to]) => to)).toEqual([
      `${PATH}?branch=main`,
      `${PATH}?branch=main&event=push`,
      PATH,
    ]);
    expect(navigator.navigate).toHaveBeenCalledWith(PATH, { replace: true });
  });
});
