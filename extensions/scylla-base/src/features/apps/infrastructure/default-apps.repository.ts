import type { IAppServiceClient } from '@base/generated/scylla/apps/v1/app_service.client.ts';
import type { IJobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import type { App } from '@base/generated/scylla/apps/v1/app.ts';
import type { AppsRepository } from '@base/features/apps/domain/repository/apps.repository.ts';
import type {
  AppDetails,
  AppEntity,
  AppJob,
  CreatedApp,
  JoinCode,
} from '@base/features/apps/domain/entities/app.entity.ts';
import { timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcApp from './grpc-app.mapper.ts';

const PAGE_SIZE = 100;

const requireApp = (app: App | undefined, rpc: string): AppEntity => {
  if (!app) throw new Error(`${rpc} returned no app`);
  return grpcApp.toDomain(app);
};

export class DefaultAppsRepository implements AppsRepository {
  constructor(
    private readonly client: IAppServiceClient,
    private readonly jobs: IJobServiceClient,
  ) {}

  public async listApps(workspaceId: string, runner?: boolean): Promise<AppEntity[]> {
    const apps: App[] = [];
    let token = '';
    do {
      const response = await this.client.listApps({
        workspaceId: wrapId(workspaceId),
        ...(runner !== undefined && { runner }),
        page: { size: PAGE_SIZE, token },
      }).response;
      apps.push(...response.apps);
      token = response.page?.nextToken ?? '';
    } while (token);
    return apps.map(grpcApp.toDomain);
  }

  public async getApp(appId: string): Promise<AppDetails> {
    const response = await this.client.getApp({ appId: wrapId(appId) }).response;
    return {
      app: requireApp(response.app, 'GetApp'),
      keys: response.keys.map(grpcApp.keyToDomain),
    };
  }

  public async createApp(
    workspaceId: string,
    name: string,
    runner: boolean,
  ): Promise<CreatedApp> {
    const response = await this.client.createApp({
      workspaceId: wrapId(workspaceId),
      name,
      runner,
    }).response;
    return {
      app: requireApp(response.app, 'CreateApp'),
      joinCode: {
        code: response.joinCode,
        expiresAt: timestampToIso(response.joinCodeExpiresAt),
      },
    };
  }

  public async deleteApp(appId: string): Promise<void> {
    await this.client.deleteApp({ appId: wrapId(appId) }).response;
  }

  public async createJoinCode(appId: string): Promise<JoinCode> {
    const response = await this.client.createJoinCode({ appId: wrapId(appId) }).response;
    return { code: response.joinCode, expiresAt: timestampToIso(response.expiresAt) };
  }

  public async revokeKey(appId: string, keyId: string): Promise<void> {
    await this.client.revokeAppKey({ appId: wrapId(appId), keyId: wrapId(keyId) }).response;
  }

  public async listJobs(workspaceId: string, appId: string, limit: number): Promise<AppJob[]> {
    const response = await this.jobs.listWorkspaceJobs({
      workspaceId: wrapId(workspaceId),
      agentId: wrapId(appId),
      page: { size: limit, token: '' },
    }).response;
    return response.jobs
      .map(grpcApp.jobToDomain)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
