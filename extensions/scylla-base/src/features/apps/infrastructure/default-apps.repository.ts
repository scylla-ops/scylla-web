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
import { ScyllaError } from '@shared/utils/scylla-error.ts';

export class DefaultAppsRepository implements AppsRepository {
  constructor(private readonly client: IAppServiceClient) {}

  async listApps(organizationId: string): Promise<AppEntity[]> {
    const response = await this.client.listApps({ organizationId: wrapId(organizationId) })
      .response;
    return response.apps.map(app => grpcApp.toDomain(app));
  }

  async getApp(appId: string): Promise<AppEntity> {
    const response = await this.client.getApp({ appId: wrapId(appId) }).response;
    if (!response.app)
      throw new ScyllaError('GetApp returned no app', { code: 'INTERNAL', raw: true });
    return grpcApp.toDomain(response.app);
  }

  async createApp(organizationId: string, name: string): Promise<CreatedApp> {
    const response = await this.client.createApp(grpcApp.toCreateAppRequest(organizationId, name))
      .response;
    if (!response.app)
      throw new ScyllaError('CreateApp returned no app', { code: 'INTERNAL', raw: true });
    return { app: grpcApp.toDomain(response.app), secret: response.secret };
  }

  async deleteApp(appId: string): Promise<void> {
    await this.client.deleteApp({ appId: wrapId(appId) }).response;
  }

  async setAppActive(appId: string, active: boolean): Promise<AppEntity> {
    const response = await this.client.setAppActive({ appId: wrapId(appId), isActive: active })
      .response;
    if (!response.app)
      throw new ScyllaError('SetAppActive returned no app', { code: 'INTERNAL', raw: true });
    return grpcApp.toDomain(response.app);
  }

  async listAppSecrets(appId: string): Promise<AppSecretEntity[]> {
    const response = await this.client.listAppSecrets({ appId: wrapId(appId) }).response;
    return response.appSecrets.map(s => grpcApp.secretToDomain(s));
  }

  async createAppSecret(appId: string, label: string): Promise<CreatedAppSecret> {
    const response = await this.client.createAppSecret({ appId: wrapId(appId), label }).response;
    if (!response.appSecret)
      throw new ScyllaError('CreateAppSecret returned no secret metadata', {
        code: 'INTERNAL',
        raw: true,
      });
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
    if (!response.appSecret)
      throw new ScyllaError('SetAppSecretEnabled returned no secret metadata', {
        code: 'INTERNAL',
        raw: true,
      });
    return grpcApp.secretToDomain(response.appSecret);
  }

  async setAppSecretLabel(secretId: string, label: string): Promise<AppSecretEntity> {
    const response = await this.client.setAppSecretLabel(
      grpcApp.toSetSecretLabelRequest(secretId, label),
    ).response;
    if (!response.appSecret)
      throw new ScyllaError('SetAppSecretLabel returned no secret metadata', {
        code: 'INTERNAL',
        raw: true,
      });
    return grpcApp.secretToDomain(response.appSecret);
  }

  async listAppAccess(appId: string): Promise<AppAccess[]> {
    const response = await this.client.listAppAccess({ appId: wrapId(appId) }).response;
    return response.access.flatMap(access => grpcApp.accessToDomain(access) ?? []);
  }
}
