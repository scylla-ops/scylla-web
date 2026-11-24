import type { IActivityServiceClient } from '@base/generated/scylla/activity/v1/activity_service.client.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { ActivityRepository } from '@base/features/dashboard/domain/repository/activity.repository.ts';
import type { ActivityFeed } from '@base/features/dashboard/domain/structs/activity.struct.ts';

export class GrpcActivityRepository implements ActivityRepository {
  constructor(private readonly client: IActivityServiceClient) {}

  public async list(query: { workspaceId: string; since: string | null; limit: number }): Promise<ActivityFeed> {
    const since = query.since ? Date.parse(query.since) : NaN;
    const response = await this.client.listActivity({
      workspaceId: wrapId(query.workspaceId),
      page: { size: query.limit, token: '' },
      ...(Number.isFinite(since) && {
        since: { seconds: BigInt(Math.floor(since / 1000)), nanos: (since % 1000) * 1_000_000 },
      }),
    }).response;
    return {
      sinceCount: response.sinceCount,
      events: response.activities.map(activity => ({
        id: idValue(activity.id),
        kind: activity.kind,
        area: activity.area,
        actorName: activity.actorName,
        projectName: activity.projectName,
        subjectKind: activity.subjectKind,
        subjectId: idValue(activity.subjectId),
        params: { ...activity.params },
        at: timestampToIso(activity.at),
      })),
    };
  }
}
