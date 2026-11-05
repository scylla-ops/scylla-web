import type { ISettingsServiceClient } from '@base/generated/scylla/platform/v1/settings_service.client.ts';
import type { InstanceSettings as GrpcSettings } from '@base/generated/scylla/platform/v1/settings_service.ts';
import { required } from '@shared/infrastructure/grpc/wrappers.ts';
import type { InstanceSettings } from '@base/features/instance-settings/domain/entities/instance-settings.entity.ts';
import type { InstanceSettingsRepository } from '@base/features/instance-settings/domain/repository/instance-settings.repository.ts';

const toDomain = (settings: GrpcSettings | undefined): InstanceSettings => {
  const { personalTokensEnabled, activePersonalTokens } = required(settings, 'settings');
  return { personalTokensEnabled, activePersonalTokens };
};

export class DefaultInstanceSettingsRepository implements InstanceSettingsRepository {
  constructor(private readonly client: ISettingsServiceClient) {}

  public async get(): Promise<InstanceSettings> {
    const { settings } = await this.client.getInstanceSettings({}).response;
    return toDomain(settings);
  }

  public async setPersonalTokens(enabled: boolean): Promise<InstanceSettings> {
    const { settings } = await this.client.updateInstanceSettings({
      personalTokensEnabled: enabled,
    }).response;
    return toDomain(settings);
  }
}
