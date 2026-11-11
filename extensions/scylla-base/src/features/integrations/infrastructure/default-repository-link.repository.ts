import type { IRepositoryServiceClient } from '@base/generated/scylla/integrations/v1/repository_service.client.ts';
import { ReportMode as GrpcReportMode } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type {
  DeliveryTest,
  GitRefPage,
  LinkRepositoryInput,
  ListRefsInput,
  RepositoryLink,
  UpdateRepositoryLinkInput,
} from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type { RepositoryLinkRepository } from '@base/features/integrations/domain/repository/repository-link.repository.ts';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcRepositoryLink from './grpc-repository-link.mapper.ts';

const PAGE_SIZE = 100;

export class DefaultRepositoryLinkRepository implements RepositoryLinkRepository {
  constructor(private readonly client: IRepositoryServiceClient) {}

  public async getByProject(projectId: string): Promise<RepositoryLink | null> {
    const response = await this.client.getRepositoryLink({ projectId: wrapId(projectId) }).response;
    return response.link ? grpcRepositoryLink.toDomain(response.link) : null;
  }

  public async link(input: LinkRepositoryInput): Promise<RepositoryLink> {
    const response = await this.client.linkRepository({
      projectId: wrapId(input.projectId),
      connectionId: wrapId(input.connectionId),
      externalId: input.externalId,
    }).response;
    return grpcRepositoryLink.toDomain(required(response.link, 'link'));
  }

  public async update(input: UpdateRepositoryLinkInput): Promise<RepositoryLink> {
    const response = await this.client.updateRepositoryLink({
      projectId: wrapId(input.projectId),
      reportsEnabled: input.reportsEnabled,
      // UNSPECIFIED keeps the mode.
      reportMode: input.reportMode
        ? grpcRepositoryLink.reportModeToProto(input.reportMode)
        : GrpcReportMode.UNSPECIFIED,
      pollIntervalSeconds: input.pollIntervalSeconds,
    }).response;
    return grpcRepositoryLink.toDomain(required(response.link, 'link'));
  }

  public async unlink(projectId: string): Promise<void> {
    await this.client.unlinkRepository({ projectId: wrapId(projectId) }).response;
  }

  public async testDelivery(projectId: string): Promise<DeliveryTest> {
    const response = await this.client.testDelivery({ projectId: wrapId(projectId) }).response;
    return {
      delivered: response.delivered,
      error: response.error,
      link: grpcRepositoryLink.toDomain(required(response.link, 'link')),
    };
  }

  public async listRefs(input: ListRefsInput): Promise<GitRefPage> {
    const response = await this.client.listRefs({
      projectId: wrapId(input.projectId),
      kind: grpcRepositoryLink.refKindToProto(input.kind),
      search: input.search ?? '',
      page: { size: PAGE_SIZE, token: input.pageToken ?? '' },
    }).response;
    return {
      refs: grpcRepositoryLink.refsToDomain(response.refs),
      nextPageToken: response.page?.nextToken ?? '',
    };
  }
}
