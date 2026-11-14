import type {
  DeliveryTest,
  GitRefPage,
  LinkRepositoryInput,
  ListRefsInput,
  RepositoryLink,
  UpdateRepositoryLinkInput,
} from '../entities/repository-link.entity.ts';

export interface RepositoryLinkRepository {
  /** `null`: the project has no link. */
  getByProject(projectId: string): Promise<RepositoryLink | null>;
  link(input: LinkRepositoryInput): Promise<RepositoryLink>;
  update(input: UpdateRepositoryLinkInput): Promise<RepositoryLink>;
  unlink(projectId: string): Promise<void>;
  testDelivery(projectId: string): Promise<DeliveryTest>;
  listRefs(input: ListRefsInput): Promise<GitRefPage>;
}
