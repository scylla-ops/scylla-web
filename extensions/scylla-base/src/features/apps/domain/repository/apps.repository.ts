import type {
  AppEntity,
  AppSecretEntity,
  AppAccess,
  CreatedApp,
  CreatedAppSecret,
} from '@base/features/apps/domain/entities/app.entity.ts';

export interface AppsRepository {
  listApps(organizationId: string): Promise<AppEntity[]>;
  getApp(appId: string): Promise<AppEntity>;
  /** CE names the first secret with the app name. */
  createApp(organizationId: string, name: string): Promise<CreatedApp>;
  deleteApp(appId: string): Promise<void>;
  setAppActive(appId: string, active: boolean): Promise<AppEntity>;

  listAppSecrets(appId: string): Promise<AppSecretEntity[]>;
  createAppSecret(appId: string, label: string): Promise<CreatedAppSecret>;
  revokeAppSecret(secretId: string): Promise<void>;
  setAppSecretEnabled(secretId: string, enabled: boolean): Promise<AppSecretEntity>;
  setAppSecretLabel(secretId: string, label: string): Promise<AppSecretEntity>;

  listAppAccess(appId: string): Promise<AppAccess[]>;
}
