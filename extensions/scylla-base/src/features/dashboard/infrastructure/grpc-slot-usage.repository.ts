import type { IAgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import { JobStatsBucket } from '@base/generated/scylla/pipelines/v1/job_stats.ts';
import { timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { SlotUsageRepository } from '@base/features/dashboard/domain/repository/slot-usage.repository.ts';
import type { SlotUsage } from '@base/features/dashboard/domain/structs/slot-usage.struct.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export class GrpcSlotUsageRepository implements SlotUsageRepository {
  constructor(private readonly client: IAgentServiceClient) {}

  public async lastDay(workspaceId: string): Promise<SlotUsage> {
    const from = Date.now() - DAY_MS;
    const response = await this.client.getSlotUsage({
      workspaceId: wrapId(workspaceId),
      from: { seconds: BigInt(Math.floor(from / 1000)), nanos: 0 },
      bucket: JobStatsBucket.HOUR,
    }).response;
    return {
      capacity: response.capacity,
      average: response.totals?.busySlotsAvg ?? 0,
      peak: response.totals?.busySlotsMax ?? 0,
      buckets: response.buckets.map(bucket => ({
        start: timestampToIso(bucket.start),
        average: bucket.figures?.busySlotsAvg ?? 0,
        peak: bucket.figures?.busySlotsMax ?? 0,
      })),
    };
  }
}
