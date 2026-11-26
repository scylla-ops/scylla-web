import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runQueryFn } from '@test/queries.ts';
import { withQueryClient, withRegistry } from '@test/render.ts';
import type { StoredDashboard } from '@base/features/dashboard/domain/repository/dashboard-layout.repository.ts';
import type { DashboardSet } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { DASHBOARDS_QUERY_KEY, dashboardQueries, setMyDefault } from '../dashboard-layout.queries.ts';

const stored = (id: string, extra: Partial<StoredDashboard> = {}): StoredDashboard => ({
  id,
  name: `Dashboard ${id}`,
  widgets: [],
  version: 1,
  visibility: 'private',
  teamDefault: false,
  ...extra,
});

let queryClient: ReturnType<typeof withQueryClient>['queryClient'];
let restore: (() => void)[] = [];
const create = vi.fn();
const setDefaultId = vi.fn();

const serve = (dashboards: StoredDashboard[]) => {
  const list = vi.fn(() => Promise.resolve(dashboards));
  restore.push(
    withRegistry({
      dashboard: {
        dashboardLayoutRepository: { list, create },
        dashboardPreferences: { defaultId: () => null, legacy: () => null, setDefaultId },
      },
    }),
  );
  return list;
};

beforeEach(() => {
  vi.clearAllMocks();
  const cache = withQueryClient();
  queryClient = cache.queryClient;
  restore = [cache.restore];
});

afterEach(() => restore.forEach(undo => undo()));

describe('dashboardQueries.list', () => {
  it('is under the key of the set: an invalidation of the set reaches it', () => {
    expect(dashboardQueries.list('w1').queryKey.slice(0, 3)).toEqual(DASHBOARDS_QUERY_KEY('w1'));
    expect(dashboardQueries.list('w1').queryKey).not.toEqual(DASHBOARDS_QUERY_KEY('w1'));
  });

  it('only reads: a workspace with no dashboard gives an empty list and creates none', async () => {
    const list = serve([]);

    await expect(runQueryFn(dashboardQueries.list('w1'))).resolves.toEqual([]);
    expect(list).toHaveBeenCalledWith('w1');
    expect(create).not.toHaveBeenCalled();
  });

  it('gives the path of each dashboard, the default one at « dashboard »', async () => {
    serve([stored('d1'), stored('d2', { visibility: 'workspace', teamDefault: true, createdBy: 'u2' })]);

    await expect(runQueryFn(dashboardQueries.list('w1'))).resolves.toEqual([
      { id: 'd1', name: 'Dashboard d1', visibility: 'private', teamDefault: false, path: 'dashboards/d1' },
      {
        id: 'd2',
        name: 'Dashboard d2',
        visibility: 'workspace',
        teamDefault: true,
        createdBy: 'u2',
        path: 'dashboard',
      },
    ]);
  });

  it('starts from the set of the page in the cache, with the dashboards of the server only', () => {
    queryClient.setQueryData<DashboardSet>(DASHBOARDS_QUERY_KEY('w1'), {
      defaultId: 'd1',
      dashboards: [stored('d1'), { id: 'default', name: 'Ops overview', widgets: [] }],
    });
    const options = dashboardQueries.list('w1');

    expect(typeof options.initialData === 'function' && options.initialData()).toEqual([
      { id: 'd1', name: 'Dashboard d1', visibility: 'private', teamDefault: false, path: 'dashboard' },
    ]);
  });

  it('has no first value with no set in the cache', () => {
    const options = dashboardQueries.list('w1');

    expect(typeof options.initialData === 'function' && options.initialData()).toBeUndefined();
  });

  it('reads the server again after a change of the default dashboard', async () => {
    serve([stored('d1')]);
    const options = dashboardQueries.list('w1');
    await queryClient.prefetchQuery(options);

    setMyDefault('w1', 'd1');

    expect(queryClient.getQueryState(options.queryKey)?.isInvalidated).toBe(true);
    expect(setDefaultId).toHaveBeenCalledWith('w1', 'd1');
  });
});
