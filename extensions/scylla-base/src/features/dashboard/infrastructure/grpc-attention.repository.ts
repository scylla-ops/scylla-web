import type { IDashboardServiceClient } from '@base/generated/scylla/dashboards/v1/dashboard_service.client.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { AttentionRepository } from '@base/features/dashboard/domain/repository/attention.repository.ts';
import type {
  AttentionList,
  AttentionQuery,
} from '@base/features/dashboard/domain/structs/attention.struct.ts';
import * as grpcAttention from './grpc-attention.mapper.ts';

/** One page of the open items, the newest first. */
export class GrpcAttentionRepository implements AttentionRepository {
  constructor(private readonly client: IDashboardServiceClient) {}

  public async list(query: AttentionQuery): Promise<AttentionList> {
    const since = query.since ? Date.parse(query.since) : NaN;
    const response = await this.client.listAttentionItems({
      workspaceId: wrapId(query.workspaceId),
      projectIds: query.projectIds.map(wrapId),
      kinds: [],
      ...(Number.isFinite(since) && {
        since: { seconds: BigInt(Math.floor(since / 1000)), nanos: (since % 1000) * 1_000_000 },
      }),
      page: { size: query.limit, token: '' },
    }).response;
    return grpcAttention.toList(response);
  }
}
