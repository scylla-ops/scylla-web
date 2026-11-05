import type { InstanceSettings } from '../entities/instance-settings.entity.ts';

export interface InstanceSettingsRepository {
  get(): Promise<InstanceSettings>;
  setPersonalTokens(enabled: boolean): Promise<InstanceSettings>;
  setWorkspaceLimit(limit: number): Promise<InstanceSettings>;
}
