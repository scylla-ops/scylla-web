// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { IAgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import { JobStatsBucket } from '@base/generated/scylla/pipelines/v1/job_stats.ts';
import { unaryCall } from '@test/grpc.ts';
import { GrpcAgentMetricsRepository } from '../grpc-agent-metrics.repository.ts';

describe('GrpcAgentMetricsRepository', () => {
  it('reads the hours of the last day of one agent', async () => {
    const getAgentMetrics = vi.fn(() =>
      unaryCall({
        buckets: [
          {
            start: { seconds: 1_763_600_400n, nanos: 0 },
            figures: { samples: 12, cpuAvgPercent: 42.5, cpuMaxPercent: 90, memoryAvgBytes: 2_048n, memoryMaxBytes: 4_096n },
          },
          { start: { seconds: 1_763_604_000n, nanos: 0 } },
        ],
        timeZone: 'UTC',
      }),
    );
    const repository = new GrpcAgentMetricsRepository({ getAgentMetrics } as unknown as IAgentServiceClient);

    const metrics = await repository.lastDay('agent-1');

    expect(getAgentMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: { value: 'agent-1' }, bucket: JobStatsBucket.HOUR }),
    );
    expect(metrics.buckets).toEqual([
      { start: '2025-11-20T01:00:00.000Z', samples: 12, cpuPercent: 42.5, memoryBytes: 2048 },
      { start: '2025-11-20T02:00:00.000Z', samples: 0, cpuPercent: 0, memoryBytes: 0 },
    ]);
  });
});
