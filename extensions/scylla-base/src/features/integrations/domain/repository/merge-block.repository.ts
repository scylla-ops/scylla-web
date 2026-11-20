import type { MergeBlock, SetMergeBlockInput } from '../entities/merge-block.entity.ts';

export interface MergeBlockRepository {
  /** One rule for each pipeline on GitHub, one for the project on GitLab. Empty with no link. */
  listByProject(projectId: string): Promise<MergeBlock[]>;
  set(input: SetMergeBlockInput): Promise<MergeBlock>;
}
