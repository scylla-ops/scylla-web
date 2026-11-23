export type {
  PipelineEntity,
  PipelineMetadata,
  PipelineIdentity,
} from './domain/entities/pipeline.entity.ts';
export type { PipelineNodeEntity } from './domain/entities/pipeline-node.entity.ts';
export type {
  PipelineHealth,
  PipelineSummary,
  PipelineSummaryList,
  PipelineSummaryOrder,
  PipelineTriggerKind,
  RecentRun,
} from './domain/structs/pipeline-summary.struct.ts';
export { recentSuccessRate } from './domain/structs/pipeline-summary.struct.ts';
export {
  PIPELINES_QUERY_KEY,
  WORKSPACE_PIPELINES_QUERY_KEY,
  PIPELINES_QUERY_ROOT,
  CREATE_PIPELINE_MUTATION_KEY,
  RUN_PIPELINE_MUTATION_KEY,
} from './presentation/pipeline.query-keys.ts';
export { pipelineQueries } from './presentation/pipeline.queries.ts';
export { createRunPipeline } from './presentation/ui/run-pipeline.state.svelte.ts';
export { asPipelineFeed } from './presentation/presenters/pipeline-feed.presenter.ts';

// The library of fragments, for the marketplace: it adds a package as a linked or forked
// fragment, and shows a package with the components of a fragment page.
export type {
  AddCommunityFragmentInput,
  FragmentAuthor,
  FragmentEntity,
  FragmentParameter,
  FragmentVersion,
  MarketplaceCategory,
  PackageRef,
} from './domain/entities/fragment.entity.ts';
export { MARKETPLACE_CATEGORIES, latestVersion } from './domain/entities/fragment.entity.ts';
export { publicName } from './domain/structs/fragment-publication.struct.ts';
export {
  categoryToDomain,
  versionFromContent,
} from './infrastructure/grpc-fragment.mapper.ts';
export { pendingUpstream } from './domain/structs/fragment-upstream.struct.ts';
export { fragmentMutations, fragmentQueries } from './presentation/fragment.queries.ts';
export { categoryName } from './presentation/presenters/fragment-community.presenter.ts';
/** Loaders, not components: the graph of the nodes brings the editor and Svelte Flow. */
export const loadFragmentNodes = () =>
  import('./presentation/ui/library/FragmentDetail/FragmentNodes.svelte');
export const loadFragmentParameters = () =>
  import('./presentation/ui/library/FragmentDetail/FragmentParameters.svelte');
