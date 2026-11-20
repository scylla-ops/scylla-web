import type { IAgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import { JobStatsBucket } from '@base/generated/scylla/pipelines/v1/job_stats.ts';
import { timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { AgentMetricsRepository } from '@base/features/dashboard/domain/repository/agent-metrics.repository.ts';
import type { AgentMetrics } from '@base/features/dashboard/domain/structs/agent-metrics.struct.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export class GrpcAgentMetricsRepository implements AgentMetricsRepository {
  constructor(private readonly client: IAgentServiceClient) {}

  public async lastDay(agentId: string): Promise<AgentMetrics> {
    const from = Date.now() - DAY_MS;
    const response = await this.client.getAgentMetrics({
      agentId: wrapId(agentId),
      from: { seconds: BigInt(Math.floor(from / 1000)), nanos: 0 },
      bucket: JobStatsBucket.HOUR,
    }).response;
    return {
      buckets: response.buckets.map(bucket => ({
        start: timestampToIso(bucket.start),
        samples: bucket.figures?.samples ?? 0,
        cpuPercent: bucket.figures?.cpuAvgPercent ?? 0,
        memoryBytes: Number(bucket.figures?.memoryAvgBytes ?? 0n),
      })),
    };
  }
}
