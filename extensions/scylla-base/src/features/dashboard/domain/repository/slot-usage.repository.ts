import type { SlotUsage } from '@base/features/dashboard/domain/structs/slot-usage.struct.ts';

/** The busy job slots of the agents of a workspace, by hour. */
export interface SlotUsageRepository {
  lastDay(workspaceId: string): Promise<SlotUsage>;
}
