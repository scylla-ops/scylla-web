import type {
  AppDetails,
  AppEntity,
  AppJob,
  AppKeyEntity,
  CreatedApp,
  JoinCode,
} from '../entities/app.entity.ts';
import type { CiIdentityEntity, CreateCiIdentityInput } from '../entities/ci-identity.entity.ts';
import type { ServerInfo } from '../structs/agent-install.struct.ts';
import type { AgentStats } from '../structs/agent-stats.struct.ts';
import type { RunnerChange } from '../structs/agent-access.struct.ts';
import type { RoleGrant } from '../structs/app-grants.struct.ts';
import type {
  ApiToken,
  CreatedToken,
  CreateTokenInput,
} from '@shared/domain/structs/api-token.struct.ts';

export interface AppsRepository {
  getServerInfo(): Promise<ServerInfo>;
  /** `runner`: only the agents, or only the other apps. Absent: every app. */
  listApps(workspaceId: string, runner?: boolean): Promise<AppEntity[]>;
  getApp(appId: string): Promise<AppDetails>;
  /**
   * Gives the first join code of the app. An agent also gets the role `runner`: on the workspace,
   * or on each of `projectIds` when the list is not empty. With no role, it would take no job.
   */
  createApp(
    workspaceId: string,
    name: string,
    runner: boolean,
    projectIds?: readonly string[],
  ): Promise<CreatedApp>;
  deleteApp(appId: string): Promise<void>;
  /** Gives and takes back the role `runner` of an agent, one change after the other. */
  changeRunner(workspaceId: string, appId: string, changes: readonly RunnerChange[]): Promise<void>;
  /** Gives roles to an app, one after the other. */
  grantRoles(workspaceId: string, appId: string, grants: readonly RoleGrant[]): Promise<void>;
  /** A new join code: one more machine, or the same machine with a new key. */
  createJoinCode(appId: string): Promise<JoinCode>;
  revokeKey(appId: string, keyId: string): Promise<void>;
  /** The latest jobs that the server placed on the agent, newest first. */
  listJobs(workspaceId: string, appId: string, limit: number): Promise<AppJob[]>;
  /** The job stats of the last 30 days of an agent, from the server. */
  getAgentStats(appId: string): Promise<AgentStats>;
  /** The job stats of each agent of a workspace with a job in the last 30 days. */
  listAgentStats(workspaceId: string): Promise<AgentStats[]>;
  renameKey(appId: string, keyId: string, label: string): Promise<AppKeyEntity>;
  /** A disabled app gets no token and no job; its running jobs stop. */
  disableApp(appId: string): Promise<AppEntity>;
  enableApp(appId: string): Promise<AppEntity>;
  /** The secret comes one time. */
  createToken(appId: string, input: CreateTokenInput): Promise<CreatedToken>;
  /** Newest first, with the revoked and the expired ones. */
  listTokens(appId: string): Promise<ApiToken[]>;
  revokeToken(appId: string, tokenId: string): Promise<void>;
  addCiIdentity(appId: string, input: CreateCiIdentityInput): Promise<CiIdentityEntity>;
  listCiIdentities(appId: string): Promise<CiIdentityEntity[]>;
  removeCiIdentity(appId: string, identityId: string): Promise<void>;
}
