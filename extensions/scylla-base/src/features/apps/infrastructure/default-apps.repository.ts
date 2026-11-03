import type { IAppServiceClient } from '@base/generated/scylla/app/v1/app.client.ts';
import type {
  AppEntity,
  AppSecretEntity,
  AppAccess,
  CreatedApp,
  CreatedAppSecret,
} from '@base/features/apps/domain/entities/app.entity.ts';
import type { AppsRepository } from '@base/features/apps/domain/repository/apps.repository.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcApp from './grpc-app.mapper.ts';
import { required } from '@shared/infrastructure/grpc/wrappers.ts';

export class DefaultAppsRepository implements AppsRepository {
  constructor(private readonly client: IAppServiceClient) {}

  async listApps(organizationId: string): Promise<AppEntity[]> {
    const response = await this.client.listApps({ organizationId: wrapId(organizationId) })
      .response;
    return response.apps.map(app => grpcApp.toDomain(app));
  }

  async getApp(appId: string): Promise<AppEntity> {
    const response = await this.client.getApp({ appId: wrapId(appId) }).response;
    return grpcApp.toDomain(required(response.app, 'app'));
  }

  async createApp(organizationId: string, name: string): Promise<CreatedApp> {
    const response = await this.client.createApp(grpcApp.toCreateAppRequest(organizationId, name))
      .response;
    return { app: grpcApp.toDomain(required(response.app, 'app')), secret: response.secret };
  }

  async deleteApp(appId: string): Promise<void> {
    await this.client.deleteApp({ appId: wrapId(appId) }).response;
  }

  async setAppActive(appId: string, active: boolean): Promise<AppEntity> {
    const response = await this.client.setAppActive({ appId: wrapId(appId), isActive: active })
      .response;
    return grpcApp.toDomain(required(response.app, 'app'));
  }

  async listAppSecrets(appId: string): Promise<AppSecretEntity[]> {
    const response = await this.client.listAppSecrets({ appId: wrapId(appId) }).response;
    return response.appSecrets.map(s => grpcApp.secretToDomain(s));
  }

  async createAppSecret(appId: string, label: string): Promise<CreatedAppSecret> {
    const response = await this.client.createAppSecret({ appId: wrapId(appId), label }).response;
    return {
      credential: grpcApp.secretToDomain(required(response.appSecret, 'app secret')),
      secret: response.secret,
    };
  }

  async revokeAppSecret(secretId: string): Promise<void> {
    await this.client.revokeAppSecret({ appSecretId: wrapId(secretId) }).response;
  }

  async setAppSecretEnabled(secretId: string, enabled: boolean): Promise<AppSecretEntity> {
    const response = await this.client.setAppSecretEnabled({
      appSecretId: wrapId(secretId),
      enabled,
    }).response;
    return grpcApp.secretToDomain(required(response.appSecret, 'app secret'));
  }

  async setAppSecretLabel(secretId: string, label: string): Promise<AppSecretEntity> {
    const response = await this.client.setAppSecretLabel(
      grpcApp.toSetSecretLabelRequest(secretId, label),
    ).response;
    return grpcApp.secretToDomain(required(response.appSecret, 'app secret'));
  }

  async listAppAccess(appId: string): Promise<AppAccess[]> {
    const response = await this.client.listAppAccess({ appId: wrapId(appId) }).response;
    return response.access.flatMap(access => grpcApp.accessToDomain(access) ?? []);
  }
}
