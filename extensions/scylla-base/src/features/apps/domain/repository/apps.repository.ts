import type {
  AppDetails,
  AppEntity,
  AppJob,
  CreatedApp,
  JoinCode,
} from '../entities/app.entity.ts';

export interface AppsRepository {
  /** `runner`: only the agents, or only the other apps. Absent: every app. */
  listApps(workspaceId: string, runner?: boolean): Promise<AppEntity[]>;
  getApp(appId: string): Promise<AppDetails>;
  /** Gives the first join code of the app. */
  createApp(workspaceId: string, name: string, runner: boolean): Promise<CreatedApp>;
  deleteApp(appId: string): Promise<void>;
  /** A new join code: one more machine, or the same machine with a new key. */
  createJoinCode(appId: string): Promise<JoinCode>;
  revokeKey(appId: string, keyId: string): Promise<void>;
  /** The latest jobs that the server placed on the agent, newest first. */
  listJobs(workspaceId: string, appId: string, limit: number): Promise<AppJob[]>;
}
