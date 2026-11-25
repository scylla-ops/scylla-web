import {
  MergeBlockState as GrpcMergeBlockState,
  PipelineSource as GrpcPipelineSource,
  type MergeBlock as GrpcMergeBlock,
} from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { PipelineSource } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type {
  MergeBlock,
  MergeBlockState,
} from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import { idValue, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';

const STATES: Partial<Record<GrpcMergeBlockState, MergeBlockState>> = {
  [GrpcMergeBlockState.OFF]: 'off',
  [GrpcMergeBlockState.APPLYING]: 'applying',
  [GrpcMergeBlockState.ON]: 'on',
  [GrpcMergeBlockState.NEEDS_PERMISSION]: 'needs_permission',
  [GrpcMergeBlockState.NOT_POSSIBLE]: 'not_possible',
  [GrpcMergeBlockState.OUT_OF_SYNC]: 'out_of_sync',
  [GrpcMergeBlockState.FAILED]: 'failed',
};

const SOURCES: Partial<Record<GrpcPipelineSource, PipelineSource>> = {
  [GrpcPipelineSource.EDITOR]: 'editor',
  [GrpcPipelineSource.FILE]: 'file',
};

export function toDomain(block: GrpcMergeBlock): MergeBlock {
  const pipelineId = idValue(block.pipelineId);
  const pipelineSource = SOURCES[block.pipelineSource];
  return {
    projectId: idValue(block.projectId),
    ...(pipelineId ? { pipelineId } : {}),
    context: block.context,
    enabled: block.enabled,
    // A state that this build does not know: the rule is not known to be in place.
    state: STATES[block.state] ?? 'failed',
    stateReason: block.stateReason,
    branch: block.branch,
    actionUrl: block.actionUrl,
    updatedAt: timestampToIso(block.updatedAt),
    ...(pipelineSource && { pipelineSource }),
  };
}
