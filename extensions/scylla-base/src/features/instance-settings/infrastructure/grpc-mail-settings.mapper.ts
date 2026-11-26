import {
  MailSecurity as GrpcSecurity,
  type MailSettings as GrpcSettings,
  type SendTestMailResponse,
  type UpdateMailSettingsRequest,
} from '@base/generated/scylla/platform/v1/mail_settings_service.ts';
import { required } from '@shared/infrastructure/grpc/wrappers.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type {
  MailSecurity,
  MailSettings,
  TestMailResult,
  UpdateMailSettingsInput,
} from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';

const SECURITIES: Record<MailSecurity, GrpcSecurity> = {
  tls: GrpcSecurity.TLS,
  starttls: GrpcSecurity.STARTTLS,
  none: GrpcSecurity.NONE,
};

const securityToDomain = (security: GrpcSecurity): MailSecurity => {
  const found = (Object.keys(SECURITIES) as MailSecurity[]).find(
    name => SECURITIES[name] === security,
  );
  if (found) return found;
  throw new ScyllaError(
    `The mail security ${security} is not known to this client: update Scylla`,
    {
      code: 'UNSUPPORTED_RESPONSE',
      raw: true,
    },
  );
};

export const toDomain = (settings: GrpcSettings | undefined): MailSettings => {
  const { relay, defaultHost } = required(settings, 'settings');
  return {
    relay: relay
      ? {
          host: relay.host,
          port: relay.port,
          security: securityToDomain(relay.security),
          username: relay.username,
          passwordSet: relay.passwordSet,
          fromAddress: relay.fromAddress,
          fromName: relay.fromName,
        }
      : null,
    defaultHost,
  };
};

/** No `password` in the input: the field stays unset, and the server keeps its password. */
export const toRequest = (input: UpdateMailSettingsInput): UpdateMailSettingsRequest => ({
  host: input.host,
  port: input.port,
  security: SECURITIES[input.security],
  username: input.username,
  ...(input.password === undefined ? {} : { password: input.password }),
  fromAddress: input.fromAddress,
  fromName: input.fromName,
});

export const testResultToDomain = (response: SendTestMailResponse): TestMailResult =>
  response.accepted
    ? {
        accepted: true,
        host: response.host,
        reply: response.reply,
        messageId: response.messageId,
      }
    : { accepted: false, host: response.host, error: response.error };
