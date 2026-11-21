import type { ActivityFeed } from '@base/features/dashboard/domain/structs/activity.struct.ts';

/** The activity feed of a workspace, newest first. */
export interface ActivityRepository {
  list(query: { workspaceId: string; since: string | null; limit: number }): Promise<ActivityFeed>;
}
