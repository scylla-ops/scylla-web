import { t } from '@scylla/ui/i18n';
import type { MailSettings } from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
import type { MailProvider } from '@base/features/instance-settings/domain/structs/mail-provider.struct.ts';
import { mailSettingsMessages as messages } from '../messages/mail-settings.messages.ts';

/** The names of the brands, the same in each language. */
const PROVIDER_NAMES: Record<Exclude<MailProvider, 'custom'>, string> = {
  scaleway: 'Scaleway TEM',
  lws: 'LWS',
  brevo: 'Brevo',
  postmark: 'Postmark',
  ses: 'Amazon SES',
  mailjet: 'Mailjet',
};

export const providerName = (provider: MailProvider): string =>
  provider === 'custom' ? t(messages.providerCustom) : PROVIDER_NAMES[provider];

/** Which mail server sends the mails now: the one of the page, of the configuration, or none. */
export const relayDescription = (settings: MailSettings): string => {
  if (settings.relay) return t(messages.relayOwn);
  if (settings.defaultHost) return t(messages.relayDefault(settings.defaultHost));
  return t(messages.relayNone);
};

/** The server can send a test mail: it has a mail server, from the page or the configuration. */
export const canSendTestMail = (settings: MailSettings): boolean =>
  settings.relay !== null || settings.defaultHost !== '';
