import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { DeliveryStatsRepository } from '../domain/repository/delivery-stats.repository.ts';
import type { DeliveryStats } from '../domain/structs/delivery.struct.ts';

const repository = () =>
  getModuleDomain<{ deliveryStatsRepository: DeliveryStatsRepository }>('dashboard').deliveryStatsRepository;

const REFRESH_MS = 60_000;

export const deliveryStatsQueries = {
  /** The webhook deliveries of the last 24 hours, by hour. */
  lastDay: (workspaceId: string | null, enabled = true) =>
    queryOptions<DeliveryStats>({
      queryKey: ['dashboard', 'delivery-stats', workspaceId] as const,
      queryFn: () => repository().lastDay(workspaceId ?? ''),
      enabled: enabled && !!workspaceId,
      staleTime: REFRESH_MS / 2,
      refetchInterval: REFRESH_MS,
    }),
};
