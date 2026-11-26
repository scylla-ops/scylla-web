// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IMailSettingsServiceClient } from '@base/generated/scylla/platform/v1/mail_settings_service.client.ts';
import {
  MailSecurity,
  type MailRelay,
  type UpdateMailSettingsRequest,
} from '@base/generated/scylla/platform/v1/mail_settings_service.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultMailSettingsRepository } from '../default-mail-settings.repository.ts';

const wireRelay = (patch: Partial<MailRelay> = {}): MailRelay => ({
  host: 'smtp.tem.scaleway.com',
  port: 465,
  security: MailSecurity.TLS,
  username: 'project-id',
  passwordSet: true,
  fromAddress: 'no-reply@scylla.example',
  fromName: 'Scylla',
  ...patch,
});

/** A fake client with only the calls of the test: `unaryCall` answers with a partial type. */
const repositoryWith = (client: object) =>
  new DefaultMailSettingsRepository(client as IMailSettingsServiceClient);

describe('DefaultMailSettingsRepository', () => {
  it('reads the relay with its password state, and no relay as null', async () => {
    const getMailSettings = vi
      .fn()
      .mockReturnValueOnce(
        unaryCall({ settings: { relay: wireRelay(), defaultHost: 'smtp.default.example' } }),
      )
      .mockReturnValueOnce(unaryCall({ settings: { defaultHost: '' } }));
    const repository = repositoryWith({ getMailSettings });

    await expect(repository.get()).resolves.toEqual({
      relay: {
        host: 'smtp.tem.scaleway.com',
        port: 465,
        security: 'tls',
        username: 'project-id',
        passwordSet: true,
        fromAddress: 'no-reply@scylla.example',
        fromName: 'Scylla',
      },
      defaultHost: 'smtp.default.example',
    });
    await expect(repository.get()).resolves.toEqual({ relay: null, defaultHost: '' });
  });

  it('refuses a security that this build does not know', async () => {
    const getMailSettings = vi.fn(() =>
      unaryCall({
        settings: { relay: wireRelay({ security: 9 as MailSecurity }), defaultHost: '' },
      }),
    );

    const error = await repositoryWith({ getMailSettings })
      .get()
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ScyllaError);
    expect((error as ScyllaError).code).toBe('UNSUPPORTED_RESPONSE');
  });

  it('sends the password only when the admin typed one', async () => {
    const updateMailSettings = vi.fn((_request: UpdateMailSettingsRequest) =>
      unaryCall({ settings: { relay: wireRelay(), defaultHost: '' } }),
    );
    const repository = repositoryWith({ updateMailSettings });
    const input = {
      host: 'smtp-relay.brevo.com',
      port: 587,
      security: 'starttls' as const,
      username: 'login',
      fromAddress: 'no-reply@scylla.example',
      fromName: '',
    };

    await repository.update(input);
    await repository.update({ ...input, password: 'typed-secret' });

    expect(updateMailSettings.mock.calls[0]).toEqual([
      {
        host: 'smtp-relay.brevo.com',
        port: 587,
        security: MailSecurity.STARTTLS,
        username: 'login',
        fromAddress: 'no-reply@scylla.example',
        fromName: '',
      },
    ]);
    expect(updateMailSettings.mock.calls[0]?.[0]).not.toHaveProperty('password');
    expect(updateMailSettings.mock.calls[1]?.[0]).toMatchObject({ password: 'typed-secret' });
  });

  it('gives the answer of the relay to a test mail, or its error', async () => {
    const sendTestMail = vi
      .fn()
      .mockReturnValueOnce(
        unaryCall({
          accepted: true,
          host: 'smtp.tem.scaleway.com',
          reply: '250 2.0.0 Ok: queued as Q1',
          messageId: 'Q1',
          error: '',
        }),
      )
      .mockReturnValueOnce(
        unaryCall({
          accepted: false,
          host: 'relay.invalid',
          reply: '',
          messageId: '',
          error: 'connection refused',
        }),
      );
    const repository = repositoryWith({ sendTestMail });

    await expect(repository.sendTest('admin@scylla.example')).resolves.toEqual({
      accepted: true,
      host: 'smtp.tem.scaleway.com',
      reply: '250 2.0.0 Ok: queued as Q1',
      messageId: 'Q1',
    });
    await expect(repository.sendTest('admin@scylla.example')).resolves.toEqual({
      accepted: false,
      host: 'relay.invalid',
      error: 'connection refused',
    });
    expect(sendTestMail).toHaveBeenCalledWith({ to: 'admin@scylla.example' });
  });

  it('removes the relay with a reset', async () => {
    const resetMailSettings = vi.fn(() =>
      unaryCall({ settings: { defaultHost: 'smtp.default.example' } }),
    );

    await expect(repositoryWith({ resetMailSettings }).reset()).resolves.toEqual({
      relay: null,
      defaultHost: 'smtp.default.example',
    });
  });
});
