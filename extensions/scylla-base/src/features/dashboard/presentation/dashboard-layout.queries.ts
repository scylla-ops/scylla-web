import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { DashboardSet } from '../domain/structs/dashboard-layout.struct.ts';
import type { DashboardLayoutRepository } from '../domain/repository/dashboard-layout.repository.ts';

const repository = () =>
  getModuleDomain<{ dashboardLayoutRepository: DashboardLayoutRepository }>('dashboard')
    .dashboardLayoutRepository;

export const DASHBOARDS_QUERY_KEY = (workspaceId: string | null) =>
  ['dashboard', 'layouts', workspaceId] as const;

export const dashboardLayoutQueries = {
  /** `null`: the workspace stored nothing yet. */
  set: (workspaceId: string | null) =>
    queryOptions<DashboardSet | null>({
      queryKey: DASHBOARDS_QUERY_KEY(workspaceId),
      queryFn: () => repository().get(workspaceId ?? ''),
      enabled: !!workspaceId,
      staleTime: Infinity,
    }),
};

export const dashboardLayoutMutations = {
  save: (workspaceId: string | null) =>
    mutationOptions({
      mutationFn: (set: DashboardSet) => repository().save(workspaceId ?? '', set),
      onMutate: (set: DashboardSet) => {
        getQueryClient().setQueryData(DASHBOARDS_QUERY_KEY(workspaceId), set);
      },
    }),
};
