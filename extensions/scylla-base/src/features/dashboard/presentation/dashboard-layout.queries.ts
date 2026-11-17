import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { DashboardLayout } from '../domain/structs/dashboard-layout.struct.ts';
import type { DashboardLayoutRepository } from '../domain/repository/dashboard-layout.repository.ts';

const repository = () =>
  getModuleDomain<{ dashboardLayoutRepository: DashboardLayoutRepository }>('dashboard').dashboardLayoutRepository;

export const DASHBOARDS_QUERY_KEY = (workspaceId: string | null) =>
  ['dashboard', 'layouts', workspaceId] as const;

export const dashboardLayoutQueries = {
  list: (workspaceId: string | null) =>
    queryOptions<DashboardLayout[]>({
      queryKey: DASHBOARDS_QUERY_KEY(workspaceId),
      queryFn: () => repository().list(workspaceId ?? ''),
      enabled: !!workspaceId,
      staleTime: Infinity,
    }),
};

export const dashboardLayoutMutations = {
  save: (workspaceId: string | null) =>
    mutationOptions({
      mutationFn: (dashboards: readonly DashboardLayout[]) =>
        repository().save(workspaceId ?? '', dashboards),
      onMutate: (dashboards: readonly DashboardLayout[]) => {
        getQueryClient().setQueryData(DASHBOARDS_QUERY_KEY(workspaceId), [...dashboards]);
      },
    }),
};
