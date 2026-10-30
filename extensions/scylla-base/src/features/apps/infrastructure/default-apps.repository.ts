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

export class DefaultAppsRepository implements AppsRepository {
  constructor(private readonly client: IAppServiceClient) {}

  async listApps(organizationId: string): Promise<AppEntity[]> {
    const response = await this.client.listApps({ organizationId: wrapId(organizationId) })
      .response;
    return response.apps.map(app => grpcApp.toDomain(app));
  }

  async getApp(appId: string): Promise<AppEntity> {
    const response = await this.client.getApp({ appId: wrapId(appId) }).response;
    if (!response.app) throw new Error('GetApp returned no app');
    return grpcApp.toDomain(response.app);
  }

  async createApp(organizationId: string, name: string): Promise<CreatedApp> {
    const response = await this.client.createApp(grpcApp.toCreateAppRequest(organizationId, name))
      .response;
    if (!response.app) throw new Error('CreateApp returned no app');
    return { app: grpcApp.toDomain(response.app), secret: response.secret };
  }

  async deleteApp(appId: string): Promise<void> {
    await this.client.deleteApp({ appId: wrapId(appId) }).response;
  }

  async setAppActive(appId: string, active: boolean): Promise<AppEntity> {
    const response = await this.client.setAppActive({ appId: wrapId(appId), isActive: active })
      .response;
    if (!response.app) throw new Error('SetAppActive returned no app');
    return grpcApp.toDomain(response.app);
  }

  async listAppSecrets(appId: string): Promise<AppSecretEntity[]> {
    const response = await this.client.listAppSecrets({ appId: wrapId(appId) }).response;
    return response.appSecrets.map(s => grpcApp.secretToDomain(s));
  }

  async createAppSecret(appId: string, label: string): Promise<CreatedAppSecret> {
    const response = await this.client.createAppSecret({ appId: wrapId(appId), label }).response;
    if (!response.appSecret) throw new Error('CreateAppSecret returned no secret metadata');
    return {
      credential: grpcApp.secretToDomain(response.appSecret),
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
    if (!response.appSecret) throw new Error('SetAppSecretEnabled returned no secret metadata');
    return grpcApp.secretToDomain(response.appSecret);
  }

  async setAppSecretLabel(secretId: string, label: string): Promise<AppSecretEntity> {
    const response = await this.client.setAppSecretLabel(
      grpcApp.toSetSecretLabelRequest(secretId, label),
    ).response;
    if (!response.appSecret) throw new Error('SetAppSecretLabel returned no secret metadata');
    return grpcApp.secretToDomain(response.appSecret);
  }

  async listAppAccess(appId: string): Promise<AppAccess[]> {
    const response = await this.client.listAppAccess({ appId: wrapId(appId) }).response;
    return response.access.flatMap(access => grpcApp.accessToDomain(access) ?? []);
  }
}
