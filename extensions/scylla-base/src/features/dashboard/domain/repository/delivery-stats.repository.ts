import type { DeliveryStats } from '@base/features/dashboard/domain/structs/delivery.struct.ts';

/** The webhook deliveries of the last 24 hours of a workspace, by hour. */
export interface DeliveryStatsRepository {
  lastDay(workspaceId: string): Promise<DeliveryStats>;
}
