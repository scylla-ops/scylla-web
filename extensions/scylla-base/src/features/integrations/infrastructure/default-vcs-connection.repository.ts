import type { IVcsConnectionServiceClient } from '@base/generated/scylla/integrations/v1/vcs_connection_service.client.ts';
import type { VcsConnection } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type {
  CheckedGitLabConnection,
  CompleteGitHubInstallInput,
  ConnectGitLabInput,
  GitHubInstall,
  ProviderRepositoryPage,
  ReplaceGitLabTokenInput,
  VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import type {
  ListProviderRepositoriesInput,
  VcsConnectionRepository,
} from '@base/features/integrations/domain/repository/vcs-connection.repository.ts';
import type { VcsProviderInfo } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
import { required, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcVcsConnection from './grpc-vcs-connection.mapper.ts';

const PAGE_SIZE = 100;

const checked = (response: {
  connection?: VcsConnection;
  warnings: string[];
}): CheckedGitLabConnection => ({
  connection: grpcVcsConnection.toDomain(required(response.connection, 'connection')),
  warnings: response.warnings,
});

export class DefaultVcsConnectionRepository implements VcsConnectionRepository {
  constructor(private readonly client: IVcsConnectionServiceClient) {}

  public async getProviders(workspaceId: string): Promise<VcsProviderInfo[]> {
    const response = await this.client.getVcsProviders({ workspaceId: wrapId(workspaceId) })
      .response;
    return grpcVcsConnection.providersToDomain(response.providers);
  }

  public async listByWorkspace(workspaceId: string): Promise<VcsConnectionEntity[]> {
    const connections: VcsConnection[] = [];
    let token = '';
    do {
      const response = await this.client.listVcsConnections({
        workspaceId: wrapId(workspaceId),
        page: { size: PAGE_SIZE, token },
      }).response;
      connections.push(...response.connections);
      token = response.page?.nextToken ?? '';
    } while (token);
    return grpcVcsConnection.listToDomain(connections);
  }

  public async getById(id: string): Promise<VcsConnectionEntity> {
    const response = await this.client.getVcsConnection({ connectionId: wrapId(id) }).response;
    return grpcVcsConnection.toDomain(required(response.connection, 'connection'));
  }

  public async startGitHubInstall(workspaceId: string): Promise<GitHubInstall> {
    const response = await this.client.startGitHubInstall({ workspaceId: wrapId(workspaceId) })
      .response;
    return {
      installUrl: required(response.installUrl, 'install URL'),
      expiresAt: timestampToIso(response.expiresAt),
    };
  }

  public async completeGitHubInstall(
    input: CompleteGitHubInstallInput,
  ): Promise<VcsConnectionEntity> {
    const response = await this.client.completeGitHubInstall(input).response;
    return grpcVcsConnection.toDomain(required(response.connection, 'connection'));
  }

  public async connectGitLab(input: ConnectGitLabInput): Promise<CheckedGitLabConnection> {
    const response = await this.client.connectGitLab({
      workspaceId: wrapId(input.workspaceId),
      token: input.token,
    }).response;
    return checked(response);
  }

  public async replaceGitLabToken(
    input: ReplaceGitLabTokenInput,
  ): Promise<CheckedGitLabConnection> {
    const response = await this.client.replaceGitLabToken({
      connectionId: wrapId(input.id),
      token: input.token,
    }).response;
    return checked(response);
  }

  public async deleteById(id: string): Promise<void> {
    await this.client.deleteVcsConnection({ connectionId: wrapId(id) }).response;
  }

  public async listRepositories(
    input: ListProviderRepositoriesInput,
  ): Promise<ProviderRepositoryPage> {
    const response = await this.client.listConnectionRepositories({
      projectId: wrapId(input.projectId),
      connectionId: wrapId(input.connectionId),
      search: input.search ?? '',
      page: { size: PAGE_SIZE, token: input.pageToken ?? '' },
    }).response;
    return {
      repositories: response.repositories.map(grpcVcsConnection.repositoryToDomain),
      nextPageToken: response.page?.nextToken ?? '',
    };
  }
}
