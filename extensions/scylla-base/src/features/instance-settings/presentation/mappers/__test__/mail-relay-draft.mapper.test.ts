// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { MailRelay } from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
import { mailSettingsMessages as messages } from '../../messages/mail-settings.messages.ts';
import {
  draftIssues,
  sameAsServer,
  toDraft,
  toInput,
  withProvider,
} from '../mail-relay-draft.mapper.ts';

const relay: MailRelay = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  security: 'starttls',
  username: 'login',
  passwordSet: true,
  fromAddress: 'no-reply@scylla.example',
  fromName: 'Scylla',
};

describe('a preset of a provider', () => {
  it('fills the host, the port and the security from the documentation', () => {
    const draft = withProvider(toDraft(null), 'scaleway');

    expect(draft).toMatchObject({
      provider: 'scaleway',
      host: 'smtp.tem.scaleway.com',
      port: '465',
      security: 'tls',
    });
  });

  it('keeps a host of the same provider: the region of Amazon SES, the server of LWS', () => {
    const ses = { ...toDraft(null), host: 'email-smtp.us-east-1.amazonaws.com' };
    const lws = { ...toDraft(null), host: 'mail31.lwspanel.com' };

    expect(withProvider(ses, 'ses').host).toBe('email-smtp.us-east-1.amazonaws.com');
    expect(withProvider(lws, 'lws')).toMatchObject({
      host: 'mail31.lwspanel.com',
      port: '465',
      security: 'tls',
    });
    expect(withProvider(toDraft(relay), 'lws').host).toBe('');
  });

  it('changes nothing for another SMTP server', () => {
    const draft = withProvider(toDraft(relay), 'custom');

    expect(draft).toEqual({ ...toDraft(relay), provider: 'custom' });
  });
});

describe('the check of the form', () => {
  it('names each wrong field', () => {
    const draft = {
      ...toDraft(null),
      host: ' ',
      port: '70000',
      username: 'login',
      fromAddress: 'no-reply',
    };

    expect(draftIssues(draft, null)).toEqual({
      host: messages.hostRequired,
      port: messages.portRange,
      password: messages.passwordRequired,
      fromAddress: expect.anything(),
    });
  });

  it('needs no new password when the server keeps one for the user name', () => {
    expect(draftIssues(toDraft(relay), relay)).toEqual({});
    expect(draftIssues(toDraft({ ...relay, passwordSet: false }), relay)).toEqual({});
    expect(draftIssues(toDraft(relay), { ...relay, passwordSet: false })).toHaveProperty(
      'password',
    );
  });
});

describe('the change that the form sends', () => {
  it('sends trimmed values, and a password only when the admin typed one', () => {
    const typed = { ...toDraft(relay), host: ' smtp.example.com ', port: ' 2525 ' };

    expect(toInput(typed)).toEqual({
      host: 'smtp.example.com',
      port: 2525,
      security: 'starttls',
      username: 'login',
      fromAddress: 'no-reply@scylla.example',
      fromName: 'Scylla',
    });
    expect(toInput({ ...typed, password: ' key ' }).password).toBe(' key ');
    expect(toInput({ ...typed, username: '', password: 'key' })).not.toHaveProperty('password');
  });

  it('sees no change in the values of the server, and a change in a new password', () => {
    expect(sameAsServer(toDraft(relay), relay)).toBe(true);
    expect(sameAsServer({ ...toDraft(relay), password: 'new' }, relay)).toBe(false);
    expect(sameAsServer({ ...toDraft(relay), port: '465' }, relay)).toBe(false);
    expect(sameAsServer(toDraft(null), null)).toBe(false);
  });
});
