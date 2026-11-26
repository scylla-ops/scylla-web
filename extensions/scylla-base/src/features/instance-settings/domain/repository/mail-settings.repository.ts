import type {
  MailSettings,
  TestMailResult,
  UpdateMailSettingsInput,
} from '../entities/mail-settings.entity.ts';

export interface MailSettingsRepository {
  get(): Promise<MailSettings>;
  update(input: UpdateMailSettingsInput): Promise<MailSettings>;
  /** Removes the relay: the server uses its default mailer again. */
  reset(): Promise<MailSettings>;
  /** Sends a test mail at once through the relay that the server uses now. */
  sendTest(to: string): Promise<TestMailResult>;
}
