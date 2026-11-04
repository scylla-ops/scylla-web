import type { IAppServiceClient } from '@base/generated/scylla/apps/v1/app_service.client.ts';
import type { IAgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import type { IJobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { App } from '@base/generated/scylla/apps/v1/app.ts';
import type { ApiToken as GrpcApiToken } from '@base/generated/scylla/auth/v1/api_token.ts';
import type { AppsRepository } from '@base/features/apps/domain/repository/apps.repository.ts';
import type {
  AppDetails,
  AppEntity,
  AppJob,
  AppKeyEntity,
  CreatedApp,
  JoinCode,
} from '@base/features/apps/domain/entities/app.entity.ts';
import type {
  CiIdentityEntity,
  CreateCiIdentityInput,
} from '@base/features/apps/domain/entities/ci-identity.entity.ts';
import type { AgentStats } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import type { RunnerChange } from '@base/features/apps/domain/structs/agent-access.struct.ts';
import type { RoleGrant } from '@base/features/apps/domain/structs/app-grants.struct.ts';
import type {
  ApiToken,
  CreatedToken,
  CreateTokenInput,
} from '@shared/domain/structs/api-token.struct.ts';
import {
  apiTokenToDomain,
  expiryToProto,
  limitsToProto,
} from '@shared/infrastructure/grpc/api-token.mapper.ts';
import { required, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcApp from './grpc-app.mapper.ts';

const PAGE_SIZE = 100;

const objectOf = (workspaceId: string, projectId: string | null) =>
  projectId === null
    ? { kind: 'workspace', id: wrapId(workspaceId) }
    : { kind: 'project', id: wrapId(projectId) };

const requireApp = (app: App | undefined): AppEntity => grpcApp.toDomain(required(app, 'app'));

const requireToken = (token: GrpcApiToken | undefined): ApiToken =>
  apiTokenToDomain(required(token, 'token'));

export class DefaultAppsRepository implements AppsRepository {
  constructor(
    private readonly client: IAppServiceClient,
    private readonly jobs: IJobServiceClient,
    private readonly access: IAccessServiceClient,
    private readonly agents: IAgentServiceClient,
  ) {}

  public async getAgentStats(appId: string): Promise<AgentStats> {
    const response = await this.agents.getAgentStats({ agentId: wrapId(appId) }).response;
    return grpcApp.statsToDomain(required(response.stats, 'stats'));
  }

  public async listAgentStats(workspaceId: string): Promise<AgentStats[]> {
    const request = { workspaceId: wrapId(workspaceId) };
    const response = await this.agents.listAgentStats(request).response;
    return response.stats.map(grpcApp.statsToDomain);
  }

  public async renameKey(appId: string, keyId: string, label: string): Promise<AppKeyEntity> {
    const request = { appId: wrapId(appId), keyId: wrapId(keyId), label };
    const response = await this.client.renameAppKey(request).response;
    return grpcApp.keyToDomain(required(response.key, 'key'));
  }

  public async disableApp(appId: string): Promise<AppEntity> {
    const response = await this.client.disableApp({ appId: wrapId(appId) }).response;
    return requireApp(response.app);
  }

  public async enableApp(appId: string): Promise<AppEntity> {
    const response = await this.client.enableApp({ appId: wrapId(appId) }).response;
    return requireApp(response.app);
  }

  public async createToken(appId: string, input: CreateTokenInput): Promise<CreatedToken> {
    const response = await this.client.createAppToken({
      appId: wrapId(appId),
      name: input.name,
      expiry: expiryToProto(input.expiry),
      limits: limitsToProto(input.limits),
    }).response;
    return { token: requireToken(response.token), secret: response.secret };
  }

  public async listTokens(appId: string): Promise<ApiToken[]> {
    const response = await this.client.listAppTokens({ appId: wrapId(appId) }).response;
    return response.tokens.map(apiTokenToDomain);
  }

  public async revokeToken(appId: string, tokenId: string): Promise<void> {
    const request = { appId: wrapId(appId), tokenId: wrapId(tokenId) };
    await this.client.revokeAppToken(request).response;
  }

  public async addCiIdentity(
    appId: string,
    input: CreateCiIdentityInput,
  ): Promise<CiIdentityEntity> {
    const response = await this.client.addCiIdentity({
      appId: wrapId(appId),
      provider: grpcApp.providerToProto(input.provider),
      issuer: input.issuer,
      repository: input.repository,
      gitRef: input.gitRef,
      environment: input.environment,
      limits: limitsToProto(input.limits),
    }).response;
    return grpcApp.ciIdentityToDomain(required(response.identity, 'identity'));
  }

  public async listCiIdentities(appId: string): Promise<CiIdentityEntity[]> {
    const response = await this.client.listCiIdentities({ appId: wrapId(appId) }).response;
    return response.identities.map(grpcApp.ciIdentityToDomain);
  }

  public async removeCiIdentity(appId: string, identityId: string): Promise<void> {
    const request = { appId: wrapId(appId), identityId: wrapId(identityId) };
    await this.client.removeCiIdentity(request).response;
  }

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
      app: requireApp(response.app),
      keys: response.keys.map(grpcApp.keyToDomain),
    };
  }

  public async createApp(
    workspaceId: string,
    name: string,
    runner: boolean,
    projectIds: readonly string[] = [],
  ): Promise<CreatedApp> {
    const response = await this.client.createApp({
      workspaceId: wrapId(workspaceId),
      name,
      runner,
    }).response;
    const app = requireApp(response.app);
    let accessGranted = true;
    if (runner) {
      const objects =
        projectIds.length === 0
          ? [{ kind: 'workspace', id: wrapId(workspaceId) }]
          : projectIds.map(id => ({ kind: 'project', id: wrapId(id) }));
      try {
        for (const object of objects) {
          await this.access.grant({ object, role: 'runner', actorId: wrapId(app.id) }).response;
        }
      } catch {
        accessGranted = false;
      }
    }
    return {
      app,
      joinCode: {
        code: response.joinCode,
        expiresAt: timestampToIso(response.joinCodeExpiresAt),
      },
      accessGranted,
    };
  }

  public async changeRunner(
    workspaceId: string,
    appId: string,
    changes: readonly RunnerChange[],
  ): Promise<void> {
    for (const { kind, projectId } of changes) {
      const request = {
        object: objectOf(workspaceId, projectId),
        role: 'runner',
        actorId: wrapId(appId),
      };
      if (kind === 'grant') await this.access.grant(request).response;
      else await this.access.revoke(request).response;
    }
  }

  public async grantRoles(
    workspaceId: string,
    appId: string,
    grants: readonly RoleGrant[],
  ): Promise<void> {
    for (const { projectId, role } of grants) {
      await this.access.grant({
        object: objectOf(workspaceId, projectId),
        role,
        actorId: wrapId(appId),
      }).response;
    }
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
