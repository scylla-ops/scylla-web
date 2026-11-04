import { i18n } from '@lingui/core';
import type { TokenLimits } from '@shared/domain/structs/api-token.struct.ts';
import { formatDay } from '@shared/utils/date-utils.ts';
import {
  daysUntil,
  type CredentialRow,
} from '@base/features/apps/domain/structs/app-credentials.struct.ts';
import { ciRuleText } from '@base/features/apps/domain/structs/ci-ref.struct.ts';
import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

const PRESET = {
  read_only: messages.readOnly,
  deploy: messages.deploy,
  full: messages.full,
  custom: messages.custom,
} as const;

const limitsText = (limits: TokenLimits) =>
  `${i18n._(PRESET[limits.preset])} · ${
    limits.projectIds.length
      ? i18n._(messages.projectCount(limits.projectIds.length))
      : i18n._(messages.allProjects)
  }`;

/** The name, the kind, the two lines of details and the expiry of a credential. */
export const credentialLabels = (row: CredentialRow, now: Date) => {
  if (row.kind === 'token') {
    const { token, state } = row;
    const expiry =
      state === 'revoked'
        ? i18n._(messages.revokedOn(formatDay(token.revokedAt)))
        : state === 'expired'
          ? i18n._(messages.expiredOn(formatDay(token.expiresAt)))
          : i18n._(messages.expiresIn(Math.max(0, daysUntil(token.expiresAt, now))));
    return {
      name: token.name,
      kind: i18n._(messages.apiToken),
      detail: token.hint,
      sub: limitsText(token.limits),
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
      ? i18n._(messages.revokedOn(formatDay(key.revokedAt)))
      : i18n._(messages.noExpiry),
  };
};
