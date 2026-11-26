import type { IMailSettingsServiceClient } from '@base/generated/scylla/platform/v1/mail_settings_service.client.ts';
import type {
  MailSettings,
  TestMailResult,
  UpdateMailSettingsInput,
} from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
import type { MailSettingsRepository } from '@base/features/instance-settings/domain/repository/mail-settings.repository.ts';
import * as grpcMailSettings from './grpc-mail-settings.mapper.ts';

export class DefaultMailSettingsRepository implements MailSettingsRepository {
  constructor(private readonly client: IMailSettingsServiceClient) {}

  public async get(): Promise<MailSettings> {
    const { settings } = await this.client.getMailSettings({}).response;
    return grpcMailSettings.toDomain(settings);
  }

  public async update(input: UpdateMailSettingsInput): Promise<MailSettings> {
    const request = grpcMailSettings.toRequest(input);
    const { settings } = await this.client.updateMailSettings(request).response;
    return grpcMailSettings.toDomain(settings);
  }

  public async reset(): Promise<MailSettings> {
    const { settings } = await this.client.resetMailSettings({}).response;
    return grpcMailSettings.toDomain(settings);
  }

  public async sendTest(to: string): Promise<TestMailResult> {
    const response = await this.client.sendTestMail({ to }).response;
    return grpcMailSettings.testResultToDomain(response);
  }
}
