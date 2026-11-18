import type { IVcsConnectionServiceClient } from '@base/generated/scylla/integrations/v1/vcs_connection_service.client.ts';
import { DeliveryStatsBucket } from '@base/generated/scylla/integrations/v1/delivery_stats.ts';
import type { ITriggerServiceClient } from '@base/generated/scylla/pipelines/v1/trigger_service.client.ts';
import { TriggerKind } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { DeliveryStatsRepository } from '@base/features/dashboard/domain/repository/delivery-stats.repository.ts';
import type { DeliveryStats } from '@base/features/dashboard/domain/structs/delivery.struct.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIGGER_LIMIT = 100;

export class GrpcDeliveryStatsRepository implements DeliveryStatsRepository {
  constructor(
    private readonly connections: IVcsConnectionServiceClient,
    private readonly triggers: ITriggerServiceClient,
  ) {}

  public async lastDay(workspaceId: string): Promise<DeliveryStats> {
    const from = Date.now() - DAY_MS;
    const [stats, webhooks] = await Promise.all([
      this.connections.getDeliveryStats({
        workspaceId: wrapId(workspaceId),
        from: { seconds: BigInt(Math.floor(from / 1000)), nanos: 0 },
        bucket: DeliveryStatsBucket.HOUR,
      }).response,
      this.triggers.listWorkspaceTriggers({
        workspaceId: wrapId(workspaceId),
        projectIds: [],
        pipelineIds: [],
        kinds: [TriggerKind.WEBHOOK],
        enabledOnly: false,
        order: 0,
        page: { size: TRIGGER_LIMIT, token: '' },
      }).response,
    ]);
    const names = new Map(
      webhooks.triggers.map(summary => [idValue(summary.trigger?.id), { name: summary.trigger?.name ?? '', pipelineName: summary.pipelineName }]),
    );
    return {
      delivered: stats.totals?.delivered ?? 0,
      failed: stats.totals?.failed ?? 0,
      connections: stats.connections.map(item => ({
        id: idValue(item.connectionId),
        delivered: item.figures?.delivered ?? 0,
        failed: item.figures?.failed ?? 0,
        lastReceivedAt: timestampToIso(item.lastReceivedAt),
        lastEvent: item.lastEvent,
        lastRepository: item.lastRepository,
        lastRef: item.lastRef,
      })),
      triggers: stats.triggers.map(item => {
        const id = idValue(item.triggerId);
        return {
          id,
          name: names.get(id)?.name ?? id.slice(-8),
          pipelineName: names.get(id)?.pipelineName ?? '',
          delivered: item.figures?.delivered ?? 0,
          failed: item.figures?.failed ?? 0,
          lastReceivedAt: timestampToIso(item.lastReceivedAt),
          lastEvent: '',
          lastRepository: '',
          lastRef: '',
        };
      }),
      hours: stats.buckets.map(bucket => ({
        start: timestampToIso(bucket.start),
        delivered: bucket.figures?.delivered ?? 0,
        failed: bucket.figures?.failed ?? 0,
      })),
    };
  }
}
