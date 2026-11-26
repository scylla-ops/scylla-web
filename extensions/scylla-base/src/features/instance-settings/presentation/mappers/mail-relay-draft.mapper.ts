import type { MessageDescriptor } from '@lingui/core';
import { checkEmail } from '@shared/utils/account-validation.ts';
import type {
  MailRelay,
  MailSecurity,
  UpdateMailSettingsInput,
} from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
import {
  MAIL_PROVIDER_PRESETS,
  providerOf,
  type MailProvider,
} from '@base/features/instance-settings/domain/structs/mail-provider.struct.ts';
import { mailSettingsMessages as messages } from '../messages/mail-settings.messages.ts';

/** What the form of the relay holds. */
export interface MailRelayDraft {
  provider: MailProvider;
  host: string;
  /** The text of the field. */
  port: string;
  security: MailSecurity;
  username: string;
  /** A new password. Empty: the server keeps the password that it has. */
  password: string;
  fromAddress: string;
  fromName: string;
}

export type MailRelayField = 'host' | 'port' | 'password' | 'fromAddress';

/** The form of the saved relay, or of a new one on STARTTLS. */
export const toDraft = (relay: MailRelay | null): MailRelayDraft => ({
  provider: relay ? providerOf(relay.host) : 'custom',
  host: relay?.host ?? '',
  port: String(relay?.port ?? 587),
  security: relay?.security ?? 'starttls',
  username: relay?.username ?? '',
  password: '',
  fromAddress: relay?.fromAddress ?? '',
  fromName: relay?.fromName ?? '',
});

/**
 * Fills the host, the port and the security from the documentation of a provider. A host of the
 * same provider stays: its region or its account server.
 */
export const withProvider = (draft: MailRelayDraft, provider: MailProvider): MailRelayDraft => {
  if (provider === 'custom') return { ...draft, provider };
  const preset = MAIL_PROVIDER_PRESETS[provider];
  const host = providerOf(draft.host) === provider ? draft.host : preset.host;
  return { ...draft, provider, host, port: String(preset.port), security: preset.security };
};

const portOf = (text: string): number | null => {
  const port = /^\d{1,5}$/.test(text.trim()) ? Number(text.trim()) : 0;
  return port >= 1 && port <= 65535 ? port : null;
};

/** The wrong fields of the form. The server checks the values again. */
export const draftIssues = (
  draft: MailRelayDraft,
  relay: MailRelay | null,
): Partial<Record<MailRelayField, MessageDescriptor>> => {
  const issues: Partial<Record<MailRelayField, MessageDescriptor>> = {};
  if (draft.host.trim() === '') issues.host = messages.hostRequired;
  if (portOf(draft.port) === null) issues.port = messages.portRange;
  const fromAddress = checkEmail(draft.fromAddress);
  if (fromAddress) issues.fromAddress = fromAddress;
  const keepsPassword = relay?.passwordSet === true && relay.username !== '';
  if (draft.username.trim() !== '' && draft.password === '' && !keepsPassword) {
    issues.password = messages.passwordRequired;
  }
  return issues;
};

/** The change that the form sends. With no user name, the server forgets the password. */
export const toInput = (draft: MailRelayDraft): UpdateMailSettingsInput => {
  const username = draft.username.trim();
  return {
    host: draft.host.trim(),
    port: portOf(draft.port) ?? 0,
    security: draft.security,
    username,
    ...(username !== '' && draft.password !== '' ? { password: draft.password } : {}),
    fromAddress: draft.fromAddress.trim(),
    fromName: draft.fromName.trim(),
  };
};

/** The form changes nothing that the server holds. */
export const sameAsServer = (draft: MailRelayDraft, relay: MailRelay | null): boolean => {
  if (!relay) return false;
  const input = toInput(draft);
  return (
    input.password === undefined &&
    input.host === relay.host &&
    input.port === relay.port &&
    input.security === relay.security &&
    input.username === relay.username &&
    input.fromAddress === relay.fromAddress &&
    input.fromName === relay.fromName
  );
};
