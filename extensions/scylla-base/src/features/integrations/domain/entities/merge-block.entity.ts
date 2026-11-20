export type MergeBlockState =
  'off' | 'applying' | 'on' | 'needs_permission' | 'not_possible' | 'out_of_sync' | 'failed';

/**
 * A rule on the provider that blocks the merge into the default branch when a pipeline fails.
 * GitHub has one rule for each pipeline. GitLab has one rule for the project, with no pipeline.
 */
export interface MergeBlock {
  projectId: string;
  /** Absent for the rule of the project on GitLab. */
  pipelineId?: string;
  /** For example scylla/build. Empty for the rule of the project. */
  context: string;
  enabled: boolean;
  state: MergeBlockState;
  /** A stable code, for example ADMINISTRATION_PERMISSION_MISSING. Empty when nothing failed. */
  stateReason: string;
  branch: string;
  /** Where a person grants the permission or changes the rule on the provider. */
  actionUrl: string;
  updatedAt: string;
}

export interface SetMergeBlockInput {
  projectId: string;
  /** Absent for the rule of the project on GitLab. */
  pipelineId?: string;
  enabled: boolean;
}
