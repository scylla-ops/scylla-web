import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { ActivityRepository } from '../domain/repository/activity.repository.ts';
import type { ActivityFeed } from '../domain/structs/activity.struct.ts';

const repository = () =>
  getModuleDomain<{ activityRepository: ActivityRepository }>('dashboard').activityRepository;

const REFRESH_MS = 10_000;
const LIMIT = 30;

export const activityQueries = {
  /** The newest events, and the count since the last visit. */
  feed: (workspaceId: string | null, since: string | null, enabled = true) =>
    queryOptions<ActivityFeed>({
      queryKey: ['dashboard', 'activity', workspaceId, since] as const,
      queryFn: () => repository().list({ workspaceId: workspaceId ?? '', since, limit: LIMIT }),
      enabled: enabled && !!workspaceId,
      staleTime: REFRESH_MS / 2,
      refetchInterval: REFRESH_MS,
    }),
};
