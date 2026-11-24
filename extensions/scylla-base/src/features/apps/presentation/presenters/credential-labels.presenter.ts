import { i18n } from '@lingui/core';
import { daysUntil } from '@shared/domain/structs/api-token.struct.ts';
import {
  tokenExpiryText,
  tokenLimitsText,
  tokenPresetText,
} from '@shared/presentation/presenters/token-labels.presenter.ts';
import { formatDay } from '@shared/utils/date-utils.ts';
import { tokenLabelMessages } from '@shared/presentation/messages/token-labels.messages.ts';
import type { CredentialRow } from '@base/features/apps/domain/structs/app-credentials.struct.ts';
import { ciRuleText } from '@base/features/apps/domain/structs/ci-ref.struct.ts';
import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';
import { appsListMessages as list } from '@base/features/apps/presentation/messages/apps-list.messages.ts';

/** The name, the kind, the two lines of details and the expiry of a credential. */
export const credentialLabels = (row: CredentialRow, now: Date) => {
  if (row.kind === 'token') {
    const { token, state } = row;
    const expiry = tokenExpiryText(token, state, now);
    return {
      name: token.name,
      kind: i18n._(messages.apiToken),
      detail: token.hint,
      sub: tokenLimitsText(token.limits),
      expiry,
    };
  }
  if (row.kind === 'ci') {
    const { identity } = row;
    const rule = ciRuleText(identity);
    return {
      name: i18n._(identity.provider === 'github' ? messages.github : messages.gitlab),
      kind: i18n._(messages.ciIdentity),
      detail: identity.repository,
      sub:
        rule.kind === 'branch'
          ? i18n._(messages.branch(rule.value))
          : rule.kind === 'environment'
            ? i18n._(messages.environment(rule.value))
            : i18n._(messages.anyRef),
      expiry: i18n._(messages.noSecret),
    };
  }
  const { key } = row;
  return {
    name: key.label || key.id.slice(-10).toUpperCase(),
    kind: i18n._(messages.keyPair),
    detail: key.id.slice(-10).toUpperCase(),
    sub: i18n._(messages.addedOn(formatDay(key.createdAt))),
    expiry: key.revokedAt
      ? i18n._(tokenLabelMessages.revokedOn(formatDay(key.revokedAt)))
      : i18n._(messages.noExpiry),
  };
};

/** The credential on one line of the list of apps, and how urgent it looks. */
export const credentialSummary = (
  row: CredentialRow,
  now: Date,
): { text: string; tone: 'normal' | 'warning' | 'danger' } => {
  if (row.kind === 'token') {
    const { token, state } = row;
    const kind = i18n._(list.apiToken);
    if (state === 'expired') {
      return {
        text: `${kind} · ${i18n._(list.expiredOn(formatDay(token.expiresAt)))}`,
        tone: 'danger',
      };
    }
    const days = Math.max(0, daysUntil(token.expiresAt, now));
    return {
      text: `${kind} · ${tokenPresetText(token.limits.preset)} · ${i18n._(list.expiresIn(days))}`,
      tone: state === 'soon' ? 'warning' : 'normal',
    };
  }
  if (row.kind === 'ci') {
    const { identity } = row;
    const rule = ciRuleText(identity);
    const where =
      rule.kind === 'branch'
        ? i18n._(list.repositoryOn(identity.repository, rule.value))
        : rule.kind === 'environment'
          ? i18n._(list.repositoryIn(identity.repository, rule.value))
          : identity.repository;
    return { text: `${i18n._(list.ciIdentity)} · ${where}`, tone: 'normal' };
  }
  const name = row.key.label || row.key.id.slice(-10).toUpperCase();
  return { text: `${i18n._(list.keyPair)} · ${name}`, tone: 'normal' };
};
