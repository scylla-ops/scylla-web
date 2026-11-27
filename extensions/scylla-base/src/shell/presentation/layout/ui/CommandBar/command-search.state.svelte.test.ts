import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { flushSync } from 'svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { withQueryClient, withRegistry } from '@test/render.ts';
import type { CommandFilter } from './command-results.presenter.ts';
import {
  createCommandSearch,
  SEARCH_LIMIT,
  SEARCH_PAUSE_MS,
  searchTextFor,
} from './command-search.state.svelte.ts';

const typed = $state<{ search: string; filter: CommandFilter | null }>({
  search: '',
  filter: null,
});

let searchJobs: Mock;
let searchTriggers: Mock;
let searchSecrets: Mock;
let searchUsers: Mock;
let listPackages: Mock;
let teardown: (() => void)[] = [];
let search!: ReturnType<typeof createCommandSearch>;
let stop: () => void = () => {};

const grant = (permissions: Permission[] | 'all') =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access:
            permissions === 'all' ? { kind: 'fullControl' } : { kind: 'restricted', permissions },
        },
      ],
    },
  });

const start = () => {
  stop = $effect.root(() => {
    search = createCommandSearch(() => typed);
  });
  flushSync();
};

/** Types a text, then lets the time pass. */
const type = async (
  text: string,
  waitMs = SEARCH_PAUSE_MS,
  filter: CommandFilter | null = null,
) => {
  typed.search = text;
  typed.filter = filter;
  flushSync();
  await vi.advanceTimersByTimeAsync(waitMs);
  flushSync();
};

const texts = (mock: Mock) => mock.mock.calls.map(([query]) => (query as { text: string }).text);

beforeEach(() => {
  vi.useFakeTimers();
  typed.search = '';
  typed.filter = null;
  searchJobs = vi.fn(() => Promise.resolve([]));
  searchTriggers = vi.fn(() => Promise.resolve([]));
  searchSecrets = vi.fn(() => Promise.resolve([]));
  searchUsers = vi.fn(() => Promise.resolve([]));
  listPackages = vi.fn(() => Promise.resolve([]));
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      jobs: { jobsRepository: { getNewestByWorkspaceId: searchJobs } },
      triggers: { triggersRepository: { searchWorkspace: searchTriggers } },
      secret: { secretRepository: { searchWorkspace: searchSecrets } },
      user: { userRepository: { search: searchUsers } },
      marketplace: { marketplaceRepository: { list: listPackages } },
    }),
  ];
  contextStore.setState({
    workspace: { id: 'w1', name: 'Acme', slug: 'acme' },
    project: { id: null, name: null },
    pipeline: { id: null, name: null },
  });
  grant('all');
});

afterEach(() => {
  stop();
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
  contextStore.getState().reset();
  vi.useRealTimers();
});

describe('searchTextFor', () => {
  it('searches with 2 letters or more, in the kinds of the tab', () => {
    expect(searchTextFor('jobs', 'de', null)).toBe('de');
    expect(searchTextFor('jobs', 'd', null)).toBeNull();
    expect(searchTextFor('triggers', 'deploy', 'team')).toBe('deploy');
    expect(searchTextFor('triggers', '', 'team')).toBeNull();
    expect(searchTextFor('jobs', 'deploy', 'work')).toBe('deploy');
  });

  it('lists the newest rows of a tab with no text, and finds a job number after #', () => {
    expect(searchTextFor('secrets', '', 'team')).toBe('');
    expect(searchTextFor('secrets', '', null)).toBeNull();
    expect(searchTextFor('jobs', '7', 'work')).toBe('7');
    expect(searchTextFor('users', '7', 'team')).toBeNull();
  });
});

describe('createCommandSearch', () => {
  it('waits for a pause after the last key, and shows that it searches', async () => {
    start();

    await type('de', SEARCH_PAUSE_MS / 2);
    expect(searchJobs).not.toHaveBeenCalled();
    expect(search.searching).toContain('jobs');

    await type('dep', SEARCH_PAUSE_MS / 2);
    expect(searchJobs).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SEARCH_PAUSE_MS);
    flushSync();
    expect(searchJobs).toHaveBeenCalledTimes(1);
    expect(searchJobs).toHaveBeenCalledWith(
      { workspaceId: 'w1', text: 'dep', limit: SEARCH_LIMIT },
      expect.any(AbortSignal),
    );
    expect(search.searching).toEqual([]);
  });

  it('does not search with one letter, except a job number after #', async () => {
    start();

    await type('d');
    expect(searchJobs).not.toHaveBeenCalled();
    expect(search.searching).toEqual([]);

    await type('7', SEARCH_PAUSE_MS, 'work');
    expect(texts(searchJobs)).toEqual(['7']);
    expect(searchTriggers).not.toHaveBeenCalled();
  });

  it('stops the call of the old text', async () => {
    const signals: AbortSignal[] = [];
    searchJobs.mockImplementation((_query: unknown, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise(() => {});
    });
    start();

    await type('dep');
    await type('depl');

    expect(texts(searchJobs)).toEqual(['dep', 'depl']);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('reads each kind only with the permission of its pages', async () => {
    grant([Permission.LIST_JOBS_BY_WORKSPACE, Permission.LIST_PIPELINES_BY_WORKSPACE]);
    start();

    await type('deploy');

    expect(search.available).toEqual(['jobs', 'packages']);
    expect(searchJobs).toHaveBeenCalled();
    expect(listPackages).toHaveBeenCalled();
    expect(searchTriggers).not.toHaveBeenCalled();
    expect(searchSecrets).not.toHaveBeenCalled();
    expect(searchUsers).not.toHaveBeenCalled();
  });

  it('finds the users only for a person who can list them', async () => {
    grant([Permission.LIST_USERS]);
    start();

    await type('jane');

    expect(search.available).toEqual(['users']);
    expect(searchUsers).toHaveBeenCalledWith('jane', SEARCH_LIMIT, expect.any(AbortSignal));
  });

  it('lists the newest secrets of each project under the tab, with no text', async () => {
    searchSecrets.mockResolvedValue([
      { secret: { id: 's1', name: 'STRIPE_KEY', projectId: 'p2' }, projectName: 'mobile-app' },
    ]);
    start();

    await type('', SEARCH_PAUSE_MS, 'team');

    expect(texts(searchSecrets)).toEqual(['']);
    expect(searchJobs).not.toHaveBeenCalled();
    expect(search.data.workspaceSecrets?.map(found => found.secret.name)).toEqual(['STRIPE_KEY']);
  });

  it('drops the rows of a kind when the text no longer searches it', async () => {
    searchJobs.mockResolvedValue([
      { id: 'job-1', pipelineId: 'l1', status: 'failed', createdAt: '2026-11-26T10:00:00Z' },
    ]);
    start();

    await type('deploy');
    expect(search.data.jobs).toHaveLength(1);

    await type('d', 0);
    expect(search.data.jobs).toBeUndefined();
  });

  it('tells which kinds failed', async () => {
    searchTriggers.mockRejectedValue(new Error('down'));
    start();

    await type('nightly');

    expect(search.failed).toEqual(['triggers']);
  });
});
