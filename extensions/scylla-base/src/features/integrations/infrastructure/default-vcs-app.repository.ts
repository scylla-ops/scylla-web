import type { IVcsAppServiceClient } from '@base/generated/scylla/platform/v1/vcs_app_service.client.ts';
import type {
  CompleteGitHubManifestInput,
  GitHubManifest,
  VcsAppEntity,
} from '@base/features/integrations/domain/entities/vcs-app.entity.ts';
import type { VcsAppRepository } from '@base/features/integrations/domain/repository/vcs-app.repository.ts';
import { required, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcVcsApp from './grpc-vcs-app.mapper.ts';

export class DefaultVcsAppRepository implements VcsAppRepository {
  constructor(private readonly client: IVcsAppServiceClient) {}

  public async get(): Promise<VcsAppEntity | null> {
    const response = await this.client.getVcsApp({}).response;
    return response.app ? grpcVcsApp.toDomain(response.app) : null;
  }

  public async startGitHubManifest(organization: string): Promise<GitHubManifest> {
    const response = await this.client.startGitHubManifest({ organization: organization.trim() })
      .response;
    return {
      postUrl: required(response.postUrl, 'post URL'),
      manifest: required(response.manifest, 'manifest'),
      expiresAt: timestampToIso(response.expiresAt),
    };
  }

  public async completeGitHubManifest(input: CompleteGitHubManifestInput): Promise<VcsAppEntity> {
    const response = await this.client.completeGitHubManifest(input).response;
    return grpcVcsApp.toDomain(required(response.app, 'app'));
  }

  public async remove(): Promise<void> {
    await this.client.deleteVcsApp({}).response;
  }
}
