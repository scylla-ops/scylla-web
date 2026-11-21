import type { Schedules } from '@base/features/dashboard/domain/structs/schedule.struct.ts';

/** The cron triggers of a workspace, their next fires and their last fires. */
export interface SchedulesRepository {
  list(query: { workspaceId: string; projectIds: string[]; from: Date }): Promise<Schedules>;
}
