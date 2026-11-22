import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { SlotUsageRepository } from '../domain/repository/slot-usage.repository.ts';
import type { SlotUsage } from '../domain/structs/slot-usage.struct.ts';

const repository = () =>
  getModuleDomain<{ slotUsageRepository: SlotUsageRepository }>('dashboard').slotUsageRepository;

const REFRESH_MS = 60_000;

export const slotUsageQueries = {
  /** The busy slots of the last 24 hours, by hour. */
  lastDay: (workspaceId: string | null, enabled = true) =>
    queryOptions<SlotUsage>({
      queryKey: ['dashboard', 'slot-usage', workspaceId] as const,
      queryFn: () => repository().lastDay(workspaceId ?? ''),
      enabled: enabled && !!workspaceId,
      staleTime: REFRESH_MS / 2,
      refetchInterval: REFRESH_MS,
    }),
};
