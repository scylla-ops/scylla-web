import type {
  AddCommunityFragmentInput,
  CreateFragmentInput,
  FragmentEntity,
  FragmentLink,
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
  /**
   * Removes the fragment from the library. The pipelines that link it keep its nodes and still
   * run; their blocks name a fragment that is no longer in the library.
   */
  delete(id: string): Promise<void>;
  /** The links are saved with the pipeline: `PipelineRepository.edit`. */
  linksOf(pipelineId: string): Promise<FragmentLink[]>;

  /** Rejects with `ALREADY_EXISTS` when the workspace has a fragment of this name. */
  addFromMarketplace(input: AddCommunityFragmentInput): Promise<FragmentEntity>;
  acceptUpstream(id: string, version: number): Promise<FragmentEntity>;
  skipUpstream(id: string, version: number): Promise<FragmentEntity>;
  dismissUpstream(id: string): Promise<FragmentEntity>;
  detachAsFork(id: string): Promise<FragmentEntity>;
  publishToMarketplace(input: PublishToMarketplaceInput): Promise<FragmentEntity>;
  deprecateVersion(id: string, version: number): Promise<FragmentEntity>;
}
