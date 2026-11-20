import type {
  AddCommunityFragmentInput,
  CreateFragmentInput,
  FragmentEntity,
  FragmentLink,
  LinkingPipeline,
  PublishFragmentVersionInput,
  PublishToMarketplaceInput,
} from '../entities/fragment.entity.ts';

/** The library of the workspace, and the fragments that each pipeline links. */
export interface FragmentRepository {
  list(workspaceId: string): Promise<FragmentEntity[]>;
  /** Rejects with `NOT_FOUND` for an id that is not in the workspace. */
  getById(workspaceId: string, id: string): Promise<FragmentEntity>;
  /** Rejects with `ALREADY_EXISTS` when the workspace has a fragment of this name. */
  create(input: CreateFragmentInput): Promise<FragmentEntity>;
  publishVersion(input: PublishFragmentVersionInput): Promise<FragmentEntity>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
  linksOf(pipelineId: string): Promise<FragmentLink[]>;
  /** Replaces all the links of the pipeline. */
  saveLinks(pipeline: LinkingPipeline, links: FragmentLink[]): Promise<void>;

  /** Rejects with `ALREADY_EXISTS` when the workspace has a fragment of this name. */
  addFromMarketplace(input: AddCommunityFragmentInput): Promise<FragmentEntity>;
  acceptUpstream(id: string, version: number): Promise<FragmentEntity>;
  skipUpstream(id: string, version: number): Promise<FragmentEntity>;
  dismissUpstream(id: string): Promise<FragmentEntity>;
  detachAsFork(id: string): Promise<FragmentEntity>;
  publishToMarketplace(input: PublishToMarketplaceInput): Promise<FragmentEntity>;
  deprecateVersion(id: string, version: number): Promise<FragmentEntity>;
}
