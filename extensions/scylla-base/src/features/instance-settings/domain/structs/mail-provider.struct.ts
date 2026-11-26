import type { MailSecurity } from '../entities/mail-settings.entity.ts';

/** A mail service with an SMTP relay, or `custom` for another SMTP server. */
export type MailProvider = 'custom' | 'scaleway' | 'lws' | 'brevo' | 'postmark' | 'ses' | 'mailjet';

export interface MailProviderPreset {
  /** The usual host. Empty: each account has its own host. */
  host: string;
  /** The hosts of this provider. */
  matches: RegExp;
  port: number;
  security: MailSecurity;
}

/** The SMTP settings in the documentation of each provider (checked in 2026-11). */
export const MAIL_PROVIDER_PRESETS: Record<Exclude<MailProvider, 'custom'>, MailProviderPreset> = {
  scaleway: {
    host: 'smtp.tem.scaleway.com',
    matches: /^smtp\.tem\.scaleway\.com$/,
    port: 465,
    security: 'tls',
  },
  lws: { host: '', matches: /^mail\d*\.lwspanel\.com$/, port: 465, security: 'tls' },
  brevo: {
    host: 'smtp-relay.brevo.com',
    matches: /^smtp-relay\.(brevo|sendinblue)\.com$/,
    port: 587,
    security: 'starttls',
  },
  postmark: {
    host: 'smtp.postmarkapp.com',
    matches: /^smtp(-broadcasts)?\.postmarkapp\.com$/,
    port: 587,
    security: 'starttls',
  },
  ses: {
    host: 'email-smtp.eu-west-3.amazonaws.com',
    matches: /^email-smtp(-fips)?\.[a-z0-9-]+\.amazonaws\.com$/,
    port: 587,
    security: 'starttls',
  },
  mailjet: {
    host: 'in-v3.mailjet.com',
    matches: /^in(-v3)?\.mailjet\.com$/,
    port: 587,
    security: 'starttls',
  },
};

export const MAIL_PROVIDERS: readonly MailProvider[] = [
  'custom',
  'scaleway',
  'lws',
  'brevo',
  'postmark',
  'ses',
  'mailjet',
];

/** The provider of a host, or `custom`. */
export const providerOf = (host: string): MailProvider => {
  const name = host.trim().toLowerCase();
  const found = Object.entries(MAIL_PROVIDER_PRESETS).find(([, preset]) =>
    preset.matches.test(name),
  );
  return (found?.[0] as MailProvider | undefined) ?? 'custom';
};
