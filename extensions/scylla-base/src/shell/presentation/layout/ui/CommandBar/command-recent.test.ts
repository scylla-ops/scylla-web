import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addRecent, readRecent, readRecentRows } from './command-recent.ts';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('the recent rows', () => {
  it('keeps the last pick first, once', () => {
    addRecent('w1', 'a');
    addRecent('w1', 'b');
    addRecent('w1', 'a');

    expect(readRecent('w1')).toEqual(['a', 'b']);
  });

  it('keeps 8 rows', () => {
    for (let index = 0; index < 10; index++) addRecent('w1', `row-${index}`);

    expect(readRecent('w1')).toHaveLength(8);
    expect(readRecent('w1')[0]).toBe('row-9');
  });

  it('has one list per workspace', () => {
    addRecent('w1', 'a');

    expect(readRecent('w2')).toEqual([]);
    expect(readRecent(null)).toEqual([]);
  });

  it('ignores a stored value that it cannot read', () => {
    localStorage.setItem('scylla-command-bar-recent:w1', 'not json');
    expect(readRecent('w1')).toEqual([]);

    localStorage.setItem('scylla-command-bar-recent:w1', JSON.stringify([1, 'a']));
    expect(readRecent('w1')).toEqual(['a']);
  });

  it('works when the browser refuses the storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(readRecent('w1')).toEqual([]);
    expect(() => addRecent('w1', 'a')).not.toThrow();
  });
});

describe('the recent rows of the server search', () => {
  const job = {
    id: 'job:1',
    group: 'jobs' as const,
    name: '#9f3c2a1b',
    place: 'Build web · web-api',
    href: '/acme/projects/p1/pipelines/l1/jobs/1',
  };

  it('keeps what a row shows with its id, once', () => {
    addRecent('w1', 'page:a');
    addRecent('w1', 'job:1', job);
    addRecent('w1', 'job:1', { ...job, name: '#9f3c2a1b' });

    expect(readRecent('w1')).toEqual(['job:1', 'page:a']);
    expect(readRecentRows('w1')).toEqual([job]);
  });

  it('ignores a stored row that it cannot read', () => {
    localStorage.setItem(
      'scylla-command-bar-recent:w1',
      JSON.stringify([{ id: 'job:1' }, job, 'page:a']),
    );

    expect(readRecent('w1')).toEqual(['job:1', 'page:a']);
    expect(readRecentRows('w1')).toEqual([job]);
  });
});
