import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { SchedulesRepository } from '../domain/repository/schedules.repository.ts';
import type { Schedules } from '../domain/structs/schedule.struct.ts';

const repository = () =>
  getModuleDomain<{ schedulesRepository: SchedulesRepository }>('dashboard').schedulesRepository;

const REFRESH_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const schedulesQueries = {
  /** The cron triggers with their fires of the next 24 hours, and the fires since `since`. */
  list: (workspaceId: string | null, projectId: string | null, since: string | null, enabled = true) =>
    queryOptions<Schedules>({
      queryKey: ['dashboard', 'schedules', workspaceId, projectId, since] as const,
      queryFn: () =>
        repository().list({
          workspaceId: workspaceId ?? '',
          projectIds: projectId ? [projectId] : [],
          from: since ? new Date(since) : new Date(Date.now() - DAY_MS),
        }),
      enabled: enabled && !!workspaceId,
      staleTime: REFRESH_MS / 2,
      refetchInterval: REFRESH_MS,
    }),
};
