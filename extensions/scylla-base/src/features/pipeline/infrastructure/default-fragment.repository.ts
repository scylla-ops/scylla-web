import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { IFragmentServiceClient } from '@base/generated/scylla/library/v1/fragment_service.client.ts';
import type { Fragment } from '@base/generated/scylla/library/v1/fragment.ts';
import type { IMarketplaceServiceClient } from '@base/generated/scylla/marketplace/v1/marketplace_service.client.ts';
import type { Package, Publication } from '@base/generated/scylla/marketplace/v1/package.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { FragmentRepository } from '@base/features/pipeline/domain/repository/fragment.repository.ts';
import {
  latestVersion,
  type AddCommunityFragmentInput,
  type CreateFragmentInput,
  type FragmentEntity,
  type FragmentLink,
  type PublishFragmentVersionInput,
  type PublishToMarketplaceInput,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import { publicName } from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';
import * as grpcFragment from './grpc-fragment.mapper.ts';
import { nodeFromDomain } from './grpc-pipeline.mapper.ts';

const PAGE_SIZE = 100;

/** Where the marketplace is, and whether it is the server of the session. */
export interface MarketplaceAccess {
  client: IMarketplaceServiceClient;
  /** The URL that the origin of a fragment names. */
  registry: string;
  /** The marketplace takes the token of the session: its workspaces publish, and list it. */
  local: boolean;
}

/** Reads every page of a list. */
const allPages = async <T>(read: (token: string) => Promise<{ items: T[]; next: string }>) => {
  const items: T[] = [];
  let token = '';
  do {
    const page = await read(token);
    items.push(...page.items);
    token = page.next;
  } while (token);
  return items;
};

/**
 * The library of the core (`FragmentService`). A fragment of a package keeps its origin in the
 * core; the versions that it can take come from the marketplace that Scylla hosts. The links of a
 * pipeline are read with the pipeline, and saved with it by `PipelineRepository.edit`.
 */
export class DefaultFragmentRepository implements FragmentRepository {
  constructor(
    private readonly client: IFragmentServiceClient,
    private readonly pipelines: IPipelineServiceClient,
    private readonly marketplace: MarketplaceAccess,
  ) {}

  public async list(workspaceId: string): Promise<FragmentEntity[]> {
    const fragments = await allPages(async token => {
      const response = await this.client.listFragments({
        workspaceId: wrapId(workspaceId),
        page: { size: PAGE_SIZE, token },
      }).response;
      return { items: response.fragments, next: response.page?.nextToken ?? '' };
    });
    return this.complete(workspaceId, fragments);
  }

  public async getById(workspaceId: string, id: string): Promise<FragmentEntity> {
    const fragment = await this.fragment(id);
    // The server refuses an unknown fragment as a refusal: the page shows one answer.
    if (fragment.workspaceId?.value !== workspaceId) {
      throw new ScyllaError(`No fragment ${id}`, { code: 'NOT_FOUND' });
    }
    const [entity] = await this.complete(workspaceId, [fragment]);
    return entity;
  }

  public async create(input: CreateFragmentInput): Promise<FragmentEntity> {
    const { fragment } = await this.client.createFragment({
      workspaceId: wrapId(input.workspaceId),
      name: input.name,
      description: input.description,
      tags: input.tags,
      nodes: input.nodes.map(nodeFromDomain),
      parameters: input.parameters.map(grpcFragment.parameterFromDomain),
    }).response;
    return this.read(required(fragment, 'fragment'));
  }

  public async publishVersion(input: PublishFragmentVersionInput): Promise<FragmentEntity> {
    const { fragment } = await this.client.publishFragmentVersion({
      fragmentId: wrapId(input.id),
      nodes: input.nodes.map(nodeFromDomain),
      parameters: input.parameters.map(grpcFragment.parameterFromDomain),
      changes: input.changes,
    }).response;
    return this.read(required(fragment, 'fragment'));
  }

  public async setFavorite(id: string, favorite: boolean): Promise<void> {
    await this.client.setFragmentFavorite({ fragmentId: wrapId(id), favorite }).response;
  }

  public async delete(id: string): Promise<void> {
    await this.client.deleteFragment({ fragmentId: wrapId(id) }).response;
  }

  public async linksOf(pipelineId: string): Promise<FragmentLink[]> {
    const { pipeline } = await this.pipelines.getPipeline({ pipelineId: wrapId(pipelineId) })
      .response;
    return (pipeline?.fragmentLinks ?? []).map(grpcFragment.linkToDomain);
  }

  /** The version keeps the number that it has in the package. */
  public async addFromMarketplace(input: AddCommunityFragmentInput): Promise<FragmentEntity> {
    const { fragment } = await this.client.createFragment({
      workspaceId: wrapId(input.workspaceId),
      name: input.name,
      description: input.description,
      tags: input.tags,
      nodes: input.version.nodes.map(nodeFromDomain),
      parameters: input.version.parameters.map(grpcFragment.parameterFromDomain),
      origin: {
        registry: this.marketplace.registry,
        packageId: input.package.packageId,
        packageName: publicName(input.package.publisher, input.package.name),
        version: input.version.number,
        linked: input.mode === 'linked',
      },
    }).response;
    return this.read(required(fragment, 'fragment'));
  }

  /** The content comes from the marketplace: the server of the library never calls it. */
  public async acceptUpstream(id: string, version: number): Promise<FragmentEntity> {
    const pkg = await this.packageOf(id);
    const chosen = pkg.versions.find(entry => entry.number === version);
    if (!chosen?.content.length) {
      throw new ScyllaError(`The package has no version ${version}`, { code: 'NOT_FOUND' });
    }
    const content = grpcFragment.versionFromContent(chosen.content, pkg.publisher);
    const { fragment } = await this.client.acceptOriginVersion({
      fragmentId: wrapId(id),
      version,
      nodes: content.nodes.map(nodeFromDomain),
      parameters: content.parameters.map(grpcFragment.parameterFromDomain),
      changes: content.changes,
    }).response;
    return this.read(required(fragment, 'fragment'));
  }

  public async skipUpstream(id: string, version: number): Promise<FragmentEntity> {
    const { fragment } = await this.client.skipOriginVersion({ fragmentId: wrapId(id), version })
      .response;
    return this.read(required(fragment, 'fragment'));
  }

  /** Hides the latest version of the package. */
  public async dismissUpstream(id: string): Promise<FragmentEntity> {
    const pkg = await this.packageOf(id);
    const version = Math.max(0, ...pkg.versions.map(entry => entry.number));
    const { fragment } = await this.client.dismissOriginVersion({ fragmentId: wrapId(id), version })
      .response;
    return this.read(required(fragment, 'fragment'));
  }

  public async detachAsFork(id: string): Promise<FragmentEntity> {
    const { fragment } = await this.client.detachOrigin({ fragmentId: wrapId(id) }).response;
    return this.read(required(fragment, 'fragment'));
  }

  public async publishToMarketplace(input: PublishToMarketplaceInput): Promise<FragmentEntity> {
    await this.marketplace.client.publishFragment({
      fragmentId: wrapId(input.id),
      version: input.version,
      license: input.license,
      category: grpcFragment.categoryToProto(input.category),
      tags: input.tags,
      autoPublish: input.autoPublish,
    }).response;
    return this.read(await this.fragment(input.id));
  }

  public async deprecateVersion(id: string, version: number): Promise<FragmentEntity> {
    await this.marketplace.client.deprecatePackageVersion({ fragmentId: wrapId(id), version })
      .response;
    return this.read(await this.fragment(id));
  }

  private async fragment(id: string): Promise<Fragment> {
    const { fragment } = await this.client.getFragment({ fragmentId: wrapId(id) }).response;
    return required(fragment, 'fragment');
  }

  /** One fragment with its source and its publication. */
  private async read(fragment: Fragment): Promise<FragmentEntity> {
    const [entity] = await this.complete(fragment.workspaceId?.value ?? '', [fragment]);
    return entity;
  }

  /** The package of a fragment of the marketplace. */
  private async packageOf(id: string): Promise<Package> {
    const { origin } = await this.fragment(id);
    if (!origin) {
      throw new ScyllaError(`${id} comes from no package`, { code: 'FAILED_PRECONDITION' });
    }
    const { package: pkg } = await this.marketplace.client.getPackage({
      packageId: wrapId(origin.packageId),
    }).response;
    return required(pkg, 'package');
  }

  /** The package of an origin, or none when the marketplace does not answer. */
  private async packageOrNone(packageId: string): Promise<Package | undefined> {
    try {
      const response = await this.marketplace.client.getPackage({ packageId: wrapId(packageId) })
        .response;
      return response.package;
    } catch {
      return undefined;
    }
  }

  /**
   * Adds what the marketplace tells: the publication of a public fragment, and the versions that
   * a fragment of a package can take. A marketplace that does not answer leaves the library as
   * the core gives it.
   */
  private async complete(workspaceId: string, fragments: Fragment[]): Promise<FragmentEntity[]> {
    const origins = [...new Set(fragments.flatMap(fragment => fragment.origin?.packageId ?? []))];
    const [publications, packages] = await Promise.all([
      this.publications(workspaceId),
      Promise.all(origins.map(id => this.packageOrNone(id))),
    ]);
    const byPackage = new Map(origins.map((id, index) => [id, packages[index]]));
    return fragments.map(fragment => {
      const entity = grpcFragment.toDomain(fragment);
      const publication = publications.get(entity.id);
      const { origin } = fragment;
      return {
        ...entity,
        ...(publication && { publication: grpcFragment.publicationOf(publication, entity.name) }),
        ...(origin && {
          source: grpcFragment.sourceOf(
            origin,
            latestVersion(entity).number,
            byPackage.get(origin.packageId),
          ),
        }),
      };
    });
  }

  /** The public fragments of the workspace, by fragment id: only on the server of the marketplace. */
  private async publications(workspaceId: string): Promise<Map<string, Publication>> {
    if (!this.marketplace.local || !workspaceId) return new Map();
    try {
      const items = await allPages(async token => {
        const response = await this.marketplace.client.listPublications({
          workspaceId: wrapId(workspaceId),
          page: { size: PAGE_SIZE, token },
        }).response;
        return { items: response.publications, next: response.page?.nextToken ?? '' };
      });
      return new Map(items.map(item => [item.fragmentId?.value ?? '', item]));
    } catch {
      // A server with no marketplace: the library has no publication.
      return new Map();
    }
  }
}
