import type { IMergeBlockServiceClient } from '@base/generated/scylla/integrations/v1/merge_block_service.client.ts';
import type {
  MergeBlock,
  SetMergeBlockInput,
} from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import type { MergeBlockRepository } from '@base/features/integrations/domain/repository/merge-block.repository.ts';
import { required, wrapId, wrapIdOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcMergeBlock from './grpc-merge-block.mapper.ts';

export class DefaultMergeBlockRepository implements MergeBlockRepository {
  constructor(private readonly client: IMergeBlockServiceClient) {}

  public async listByProject(projectId: string): Promise<MergeBlock[]> {
    const response = await this.client.listMergeBlocks({ projectId: wrapId(projectId) }).response;
    return response.blocks.map(grpcMergeBlock.toDomain);
  }

  public async set(input: SetMergeBlockInput): Promise<MergeBlock> {
    const response = await this.client.setMergeBlock({
      projectId: wrapId(input.projectId),
      pipelineId: wrapIdOpt(input.pipelineId),
      enabled: input.enabled,
    }).response;
    return grpcMergeBlock.toDomain(required(response.block, 'merge block'));
  }
}
