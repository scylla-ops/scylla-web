import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type {
  AppEntity,
  AppSecretEntity,
  AppAccess,
  CreatedApp,
  CreatedAppSecret,
} from '@base/features/apps/domain/entities/app.entity.ts';

export interface AppsRepository {
  listApps(organizationId: string): Promise<ScyllaResult<AppEntity[]>>;
  getApp(appId: string): Promise<ScyllaResult<AppEntity>>;
  /** CE names the first secret with the app name. */
  createApp(organizationId: string, name: string): Promise<ScyllaResult<CreatedApp>>;
  deleteApp(appId: string): Promise<ScyllaResult<void>>;
  setAppActive(appId: string, active: boolean): Promise<ScyllaResult<AppEntity>>;

  listAppSecrets(appId: string): Promise<ScyllaResult<AppSecretEntity[]>>;
  createAppSecret(appId: string, label: string): Promise<ScyllaResult<CreatedAppSecret>>;
  revokeAppSecret(secretId: string): Promise<ScyllaResult<void>>;
  setAppSecretEnabled(secretId: string, enabled: boolean): Promise<ScyllaResult<AppSecretEntity>>;
  setAppSecretLabel(secretId: string, label: string): Promise<ScyllaResult<AppSecretEntity>>;

  listAppAccess(appId: string): Promise<ScyllaResult<AppAccess[]>>;
}
